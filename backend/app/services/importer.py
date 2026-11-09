"""Nhập dữ liệu MovieLens vào PostgreSQL (idempotent: cùng SHA-256 thì không nhập lại)."""
from __future__ import annotations

import re
import zipfile
from datetime import datetime, timezone
from pathlib import Path

import pandas as pd
from sqlalchemy import func, insert, select, update
from sqlalchemy.orm import Session

from recsys.data import clean_ratings, sha256_file

from ..config import settings
from ..database import SessionLocal
from ..models import (DatasetRating, DatasetVersion, Genre, ImportJob, Movie, MovieLink, Rating,
                      utcnow)

YEAR_RE = re.compile(r"\s*\((\d{4})\)\s*$")
ARTICLE_RE = re.compile(r"^(.*),\s+(The|A|An)$", re.IGNORECASE)


def normalize_article(title: str) -> str:
    m = ARTICLE_RE.match(title.strip())
    if m:
        return f"{m.group(2)} {m.group(1).strip()}"
    return title.strip()


def parse_title(raw: str):
    m = YEAR_RE.search(raw)
    if not m:
        return normalize_article(raw), None
    return normalize_article(raw[: m.start()]), int(m.group(1))


def imdb_poster_url(imdb_id: str | None) -> str | None:
    if not imdb_id:
        return None
    return f"https://images.metahub.space/poster/medium/{imdb_id}/img"


def find_dataset_dir(root: Path) -> Path:
    for p in [root, *root.rglob("*")]:
        if p.is_dir() and (p / "ratings.csv").exists() and (p / "movies.csv").exists():
            return p
    raise ValueError("Không tìm thấy movies.csv và ratings.csv trong nguồn đã chọn")


def extract_upload(zip_path: Path) -> Path:
    dest = zip_path.with_suffix("")
    try:
        with zipfile.ZipFile(zip_path) as z:
            for name in z.namelist():  # chặn path traversal
                if name.startswith("/") or ".." in Path(name).parts:
                    raise ValueError("File ZIP chứa đường dẫn không hợp lệ")
            z.extractall(dest)
    except zipfile.BadZipFile:
        raise ValueError("File tải lên không phải ZIP hợp lệ")
    return find_dataset_dir(dest)


def recompute_movie_stats(db: Session):
    """Tính lại rating_count/rating_sum từ dataset_ratings + ratings (web)."""
    agg: dict[int, list[float]] = {}
    for model in (DatasetRating, Rating):
        rows = db.execute(select(model.movie_id, func.count(), func.sum(model.score)).group_by(model.movie_id))
        for mid, c, s in rows:
            a = agg.setdefault(mid, [0, 0.0])
            a[0] += c; a[1] += float(s or 0)
    db.execute(update(Movie).values(rating_count=0, rating_sum=0.0))
    if agg:
        db.execute(update(Movie), [{"id": k, "rating_count": v[0], "rating_sum": v[1]} for k, v in agg.items()])


def import_movielens_dir(db: Session, src: Path, job: ImportJob | None = None) -> DatasetVersion:
    src = find_dataset_dir(Path(src))
    sha = sha256_file(src / "ratings.csv")
    if db.scalar(select(DatasetVersion).where(DatasetVersion.file_sha256 == sha)):
        raise ValueError("Bộ dữ liệu này đã được nhập trước đó (trùng SHA-256) - bỏ qua để tránh nhân đôi")

    movies_df = pd.read_csv(src / "movies.csv")
    ratings_df = pd.read_csv(src / "ratings.csv")
    required = {"movies.csv": {"movieId", "title", "genres"},
                "ratings.csv": {"userId", "movieId", "rating", "timestamp"}}
    for fname, cols in required.items():
        df = movies_df if fname == "movies.csv" else ratings_df
        if not cols.issubset(df.columns):
            raise ValueError(f"{fname} thiếu cột: {sorted(cols - set(df.columns))}")
    links_df = pd.read_csv(src / "links.csv") if (src / "links.csv").exists() else None

    # --- Thể loại
    names = sorted({g for gs in movies_df["genres"].fillna("") for g in gs.split("|")
                    if g and g != "(no genres listed)"})
    genres = {g.name: g for g in db.scalars(select(Genre))}
    for n in names:
        if n not in genres:
            genres[n] = Genre(name=n); db.add(genres[n])
    db.flush()

    # --- Phim (upsert theo movielens_id)
    existing = {m.movielens_id: m for m in db.scalars(select(Movie).where(Movie.movielens_id.isnot(None)))}
    links = {}
    if links_df is not None:
        for r in links_df.itertuples(index=False):
            links[int(r.movieId)] = (f"tt{int(r.imdbId):07d}" if pd.notna(r.imdbId) else None,
                                     int(r.tmdbId) if pd.notna(r.tmdbId) else None)
    new_movies = []
    for r in movies_df.itertuples(index=False):
        mlid = int(r.movieId)
        title, year = parse_title(str(r.title))
        gs = [genres[g] for g in str(r.genres).split("|") if g in genres]
        m = existing.get(mlid)
        imdb_id, tmdb_id = links.get(mlid, (None, None))
        if m is None:
            m = Movie(movielens_id=mlid, title=title, year=year, genres=gs,
                      poster_url=imdb_poster_url(imdb_id))
            new_movies.append(m)
            existing[mlid] = m
        elif not m.poster_url and imdb_id:
            m.poster_url = imdb_poster_url(imdb_id)
        if mlid in links and m.link is None:
            m.link = MovieLink(imdb_id=imdb_id, tmdb_id=tmdb_id)
    db.add_all(new_movies)
    db.flush()

    # --- Đánh giá
    clean, log = clean_ratings(ratings_df, movies_df)
    dv = DatasetVersion(name=src.name, source=str(src), file_sha256=sha, n_movies=len(movies_df),
                        n_ratings=len(clean), n_users=int(clean["userId"].nunique()))
    db.add(dv); db.flush()
    id_map = {mlid: m.id for mlid, m in existing.items()}
    rows = [{"dataset_version_id": dv.id, "source_user_id": int(u), "movie_id": id_map[int(mv)],
             "score": float(s), "rated_at": datetime.fromtimestamp(int(t), timezone.utc).replace(tzinfo=None)}
            for u, mv, s, t in clean[["userId", "movieId", "rating", "timestamp"]].itertuples(index=False)]
    for i in range(0, len(rows), 5000):
        db.execute(insert(DatasetRating), rows[i:i + 5000])
    recompute_movie_stats(db)
    if job is not None:
        job.dataset_version_id = dv.id
        job.rows_ok = len(clean)
        job.rows_error = len(ratings_df) - len(clean)
        job.message = "; ".join(f"{s['rule']}: {s['before']}→{s['after']}" for s in log)
    db.commit()
    return dv


def run_import_job(job_id: int, src: str):
    db = SessionLocal()
    try:
        job = db.get(ImportJob, job_id)
        job.status = "running"; db.commit()
        try:
            import_movielens_dir(db, Path(src), job)
            job.status = "succeeded"
        except Exception as e:  # noqa: BLE001 - lưu lỗi vào job cho quản trị xem
            db.rollback()
            job = db.get(ImportJob, job_id)
            job.status = "failed"
            job.message = str(e)
        job.finished_at = utcnow()
        db.commit()
    finally:
        db.close()


def default_dataset_dir() -> Path:
    return settings.data_dir / "raw" / "ml-latest-small"
