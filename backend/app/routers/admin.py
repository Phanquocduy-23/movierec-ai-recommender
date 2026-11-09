"""API quản trị - mọi endpoint đều yêu cầu vai trò admin (kiểm tra ở backend)."""
import csv
import io
import json
import shutil
from pathlib import Path

from fastapi import APIRouter, BackgroundTasks, Depends, File, HTTPException, Query, UploadFile
from fastapi.responses import StreamingResponse
from sqlalchemy import case, func, or_, select
from sqlalchemy.orm import Session

from ..config import settings
from ..database import get_db
from ..deps import require_admin
from ..models import (DatasetRating, DatasetVersion, EvaluationResult, Genre, ImportJob, ModelVersion,
                      Movie, MovieLink, Rating, RecommendationEvent, Role, TrainingRun, User,
                      WatchlistItem, utcnow, movie_genres)
from ..schemas import (GenreOut, ImportJobOut, ModelVersionOut, MovieDetail, MovieIn, MovieOut,
                       RatingOut, TrainIn, TrainingRunOut, UserAdminUpdate, UserOut)
from ..services.importer import default_dataset_dir, extract_upload, run_import_job
from ..services.training import activate_model, is_training_running, run_training

router = APIRouter(prefix="/api/admin", tags=["admin"], dependencies=[Depends(require_admin)])


# ---------------------------------------------------------------- Thống kê
@router.get("/stats")
def stats(db: Session = Depends(get_db)):
    count = lambda m: db.scalar(select(func.count()).select_from(m))  # noqa: E731
    dist = {}
    for model in (DatasetRating, Rating):
        for s, c in db.execute(select(model.score, func.count()).group_by(model.score)):
            dist[float(s)] = dist.get(float(s), 0) + c
    genre_rows = db.execute(
        select(Genre.name, func.count(movie_genres.c.movie_id), func.sum(Movie.rating_count))
        .join(movie_genres, movie_genres.c.genre_id == Genre.id)
        .join(Movie, Movie.id == movie_genres.c.movie_id)
        .group_by(Genre.name).order_by(func.sum(Movie.rating_count).desc())).all()
    top = db.scalars(select(Movie).where(Movie.rating_count >= 50)
                     .order_by((Movie.rating_sum / Movie.rating_count).desc()).limit(10)).all()
    methods = db.execute(select(RecommendationEvent.served_method, func.count(),
                                func.sum(case((RecommendationEvent.fallback.is_(True), 1), else_=0)))
                         .group_by(RecommendationEvent.served_method)).all()
    active = db.scalar(select(ModelVersion).where(ModelVersion.status == "active"))
    web_rating_users = db.scalar(select(func.count(func.distinct(Rating.user_id))))
    return {
        "counts": {"users": count(User), "movies": count(Movie), "genres": count(Genre),
                   "web_ratings": count(Rating), "dataset_ratings": count(DatasetRating),
                   "watchlist_items": count(WatchlistItem), "recommendation_requests": count(RecommendationEvent),
                   "users_with_ratings": web_rating_users},
        "rating_distribution": [{"score": s / 2, "count": dist.get(s / 2, 0)} for s in range(1, 11)],
        "genres": [{"genre": g, "movies": int(n), "ratings": int(r or 0)} for g, n, r in genre_rows],
        "top_movies": [MovieOut.model_validate(m) for m in top],
        "recommendation_methods": [{"method": m, "count": c, "fallback": int(f or 0)} for m, c, f in methods],
        "active_model": ModelVersionOut.model_validate(active) if active else None,
    }


@router.get("/report/movies.csv")
def report_movies(db: Session = Depends(get_db)):
    """Báo cáo xuất CSV: danh mục phim kèm số đánh giá và điểm trung bình."""
    buf = io.StringIO()
    buf.write("\ufeff")  # BOM để Excel đọc đúng tiếng Việt
    w = csv.writer(buf)
    w.writerow(["id", "movielens_id", "title", "year", "genres", "rating_count", "rating_avg", "is_active"])
    for m in db.scalars(select(Movie).order_by(Movie.rating_count.desc())):
        w.writerow([m.id, m.movielens_id, m.title, m.year, "|".join(g.name for g in m.genres),
                    m.rating_count, m.rating_avg, m.is_active])
    buf.seek(0)
    return StreamingResponse(iter([buf.getvalue()]), media_type="text/csv",
                             headers={"Content-Disposition": "attachment; filename=movies_report.csv"})


# ---------------------------------------------------------------- Người dùng (chính - chi tiết)
@router.get("/users")
def list_users(q: str | None = None, page: int = Query(1, ge=1), size: int = Query(20, le=100),
               db: Session = Depends(get_db)):
    stmt = select(User)
    if q:
        stmt = stmt.where(or_(User.email.ilike(f"%{q}%"), User.username.ilike(f"%{q}%"),
                              User.full_name.ilike(f"%{q}%")))
    total = db.scalar(select(func.count()).select_from(stmt.subquery()))
    users = db.scalars(stmt.order_by(User.id).offset((page - 1) * size).limit(size)).all()
    counts = dict(db.execute(select(Rating.user_id, func.count()).where(
        Rating.user_id.in_([u.id for u in users])).group_by(Rating.user_id)).all())
    items = [{**UserOut.model_validate(u).model_dump(), "n_ratings": counts.get(u.id, 0)} for u in users]
    return {"items": items, "total": total, "page": page, "size": size}


@router.get("/users/{user_id}")
def user_detail(user_id: int, db: Session = Depends(get_db)):
    u = db.get(User, user_id)
    if not u:
        raise HTTPException(404, "Không tìm thấy người dùng")
    ratings = db.scalars(select(Rating).where(Rating.user_id == user_id).order_by(Rating.updated_at.desc())).all()
    wl = db.scalar(select(func.count()).select_from(WatchlistItem).where(WatchlistItem.user_id == user_id))
    return {"user": UserOut.model_validate(u), "watchlist_count": wl,
            "ratings": [RatingOut.model_validate(r) for r in ratings]}


@router.put("/users/{user_id}", response_model=UserOut)
def update_user(user_id: int, data: UserAdminUpdate, admin: User = Depends(require_admin),
                db: Session = Depends(get_db)):
    u = db.get(User, user_id)
    if not u:
        raise HTTPException(404, "Không tìm thấy người dùng")
    if u.id == admin.id and (data.role == "user" or data.is_active is False):
        raise HTTPException(400, "Không thể tự hạ quyền hoặc khóa chính mình")
    if data.role:
        u.role_id = db.scalar(select(Role.id).where(Role.name == data.role))
    if data.is_active is not None:
        u.is_active = data.is_active
    db.commit()
    db.refresh(u)
    return u


# ---------------------------------------------------------------- Phim & thể loại
@router.get("/movies")
def admin_movies(q: str | None = None, page: int = Query(1, ge=1), size: int = Query(20, le=100),
                 db: Session = Depends(get_db)):
    stmt = select(Movie)
    if q:
        stmt = stmt.where(Movie.title.ilike(f"%{q}%"))
    total = db.scalar(select(func.count()).select_from(stmt.subquery()))
    rows = db.scalars(stmt.order_by(Movie.id.desc()).offset((page - 1) * size).limit(size)).all()
    return {"items": [MovieDetail.model_validate(m) for m in rows], "total": total, "page": page, "size": size}


def _apply_movie(db, m: Movie, data: MovieIn):
    m.title, m.year, m.overview = data.title.strip(), data.year, data.overview
    m.poster_url, m.is_active = data.poster_url or None, data.is_active
    m.genres = list(db.scalars(select(Genre).where(Genre.id.in_(data.genre_ids)))) if data.genre_ids else []
    if data.imdb_id or data.tmdb_id:
        if m.link is None:
            m.link = MovieLink()
        m.link.imdb_id, m.link.tmdb_id = data.imdb_id, data.tmdb_id


@router.post("/movies", response_model=MovieDetail, status_code=201)
def create_movie(data: MovieIn, db: Session = Depends(get_db)):
    m = Movie(title=data.title)
    _apply_movie(db, m, data)
    db.add(m)
    db.commit()
    db.refresh(m)
    return m


@router.put("/movies/{movie_id}", response_model=MovieDetail)
def update_movie(movie_id: int, data: MovieIn, db: Session = Depends(get_db)):
    m = db.get(Movie, movie_id)
    if not m:
        raise HTTPException(404, "Không tìm thấy phim")
    _apply_movie(db, m, data)
    db.commit()
    db.refresh(m)
    return m


@router.delete("/movies/{movie_id}", status_code=204)
def delete_movie(movie_id: int, db: Session = Depends(get_db)):
    """Phim đã có đánh giá chỉ bị ẩn (giữ toàn vẹn dữ liệu huấn luyện); phim chưa có đánh giá bị xóa."""
    m = db.get(Movie, movie_id)
    if not m:
        raise HTTPException(404, "Không tìm thấy phim")
    if m.rating_count > 0:
        m.is_active = False
    else:
        db.delete(m)
    db.commit()


@router.post("/genres", response_model=GenreOut, status_code=201)
def create_genre(data: dict, db: Session = Depends(get_db)):
    name = str(data.get("name", "")).strip()
    if not name or len(name) > 50:
        raise HTTPException(422, "Tên thể loại không hợp lệ")
    if db.scalar(select(Genre).where(func.lower(Genre.name) == name.lower())):
        raise HTTPException(409, "Thể loại đã tồn tại")
    g = Genre(name=name)
    db.add(g)
    db.commit()
    return g


@router.put("/genres/{genre_id}", response_model=GenreOut)
def rename_genre(genre_id: int, data: dict, db: Session = Depends(get_db)):
    g = db.get(Genre, genre_id)
    if not g:
        raise HTTPException(404, "Không tìm thấy thể loại")
    name = str(data.get("name", "")).strip()
    if not name:
        raise HTTPException(422, "Tên thể loại không hợp lệ")
    g.name = name
    db.commit()
    return g


@router.delete("/genres/{genre_id}", status_code=204)
def delete_genre(genre_id: int, db: Session = Depends(get_db)):
    g = db.get(Genre, genre_id)
    if not g:
        raise HTTPException(404, "Không tìm thấy thể loại")
    db.delete(g)
    db.commit()


# ---------------------------------------------------------------- Nhập dữ liệu
@router.post("/import", response_model=ImportJobOut, status_code=202)
async def start_import(bg: BackgroundTasks, file: UploadFile | None = File(None),
                       admin: User = Depends(require_admin), db: Session = Depends(get_db)):
    """Nhập MovieLens: tải lên file ZIP, hoặc bỏ trống để dùng data/raw/ml-latest-small."""
    if file is not None and file.filename:
        if not file.filename.lower().endswith(".zip"):
            raise HTTPException(422, "Chỉ nhận file .zip của MovieLens")
        up = settings.data_dir / "uploads"
        up.mkdir(parents=True, exist_ok=True)
        dest = up / f"{utcnow():%Y%m%d%H%M%S}_{Path(file.filename).name}"
        with open(dest, "wb") as f:
            shutil.copyfileobj(file.file, f)
        try:
            src = extract_upload(dest)
        except ValueError as e:
            raise HTTPException(422, str(e))
    else:
        src = default_dataset_dir()
        if not src.exists():
            raise HTTPException(422, f"Không thấy {src}. Chạy python ml/download_data.py hoặc tải ZIP lên.")
    if db.scalar(select(ImportJob).where(ImportJob.status.in_(["pending", "running"]))):
        raise HTTPException(409, "Đang có job nhập dữ liệu chạy")
    job = ImportJob(source=str(src), created_by=admin.id)
    db.add(job)
    db.commit()
    bg.add_task(run_import_job, job.id, str(src))
    return job


@router.get("/import-jobs", response_model=list[ImportJobOut])
def import_jobs(db: Session = Depends(get_db)):
    return db.scalars(select(ImportJob).order_by(ImportJob.id.desc()).limit(50)).all()


@router.get("/datasets")
def datasets(db: Session = Depends(get_db)):
    return [{"id": d.id, "name": d.name, "sha256": d.file_sha256, "n_movies": d.n_movies,
             "n_ratings": d.n_ratings, "n_users": d.n_users, "imported_at": d.imported_at}
            for d in db.scalars(select(DatasetVersion).order_by(DatasetVersion.id.desc()))]


# ---------------------------------------------------------------- Huấn luyện & phát hành
@router.post("/train", response_model=TrainingRunOut, status_code=202)
def start_training(data: TrainIn, bg: BackgroundTasks, admin: User = Depends(require_admin),
                   db: Session = Depends(get_db)):
    if is_training_running() or db.scalar(select(TrainingRun).where(TrainingRun.status.in_(["pending", "running"]))):
        raise HTTPException(409, "Đang có job huấn luyện chạy - mô hình hiện tại vẫn được dùng")
    params = data.model_dump(exclude={"auto_activate"})
    run = TrainingRun(params=params, auto_activate=data.auto_activate, created_by=admin.id)
    db.add(run)
    db.commit()
    bg.add_task(run_training, run.id)
    return run


@router.get("/training-runs", response_model=list[TrainingRunOut])
def training_runs(db: Session = Depends(get_db)):
    return db.scalars(select(TrainingRun).order_by(TrainingRun.id.desc()).limit(50)).all()


@router.get("/models", response_model=list[ModelVersionOut])
def model_versions(db: Session = Depends(get_db)):
    return db.scalars(select(ModelVersion).order_by(ModelVersion.id.desc())).all()


@router.post("/models/{model_id}/activate", response_model=ModelVersionOut)
def activate(model_id: int, db: Session = Depends(get_db)):
    """Phát hành một phiên bản (cũng dùng để quay lại bản trước)."""
    mv = db.get(ModelVersion, model_id)
    if not mv:
        raise HTTPException(404, "Không tìm thấy phiên bản mô hình")
    if not Path(mv.path).exists():
        raise HTTPException(409, "File mô hình không còn trên đĩa")
    activate_model(db, mv)
    return mv


# ---------------------------------------------------------------- Kết quả thực nghiệm
@router.get("/experiments")
def experiments(db: Session = Depends(get_db)):
    """Đọc kết quả từ artifacts/experiments (do ml/train_evaluate.py tạo) và đồng bộ vào evaluation_results."""
    runs = []
    root = settings.experiments_dir
    if root.exists():
        for d in sorted(root.iterdir(), reverse=True):
            info_path = d / "run_info.json"
            if not info_path.exists():
                continue
            info = json.loads(info_path.read_text("utf-8"))
            for r in info.get("test_results", []):
                exists = db.scalar(select(EvaluationResult).where(
                    EvaluationResult.run_id == info["run_id"], EvaluationResult.method == r["method"],
                    EvaluationResult.split == "test"))
                if not exists:
                    db.add(EvaluationResult(
                        run_id=info["run_id"], method=r["method"], split="test", params=json.loads(r["params"]),
                        rmse=r["rmse"], mae=r["mae"], precision_at_10=r.get("precision@10"),
                        recall_at_10=r.get("recall@10"),
                        extra={k: r.get(k) for k in ("coverage", "n_pairs_eligible", "n_users_ranked")}))
            figs = sorted(p.name for p in (d / "figures").glob("*.png")) if (d / "figures").exists() else []
            runs.append({"run_id": info["run_id"], "quick": info.get("quick"), "chosen": info.get("chosen"),
                         "duration_seconds": info.get("duration_seconds"), "libraries": info.get("libraries"),
                         "split": (info.get("split") or {}).get("split_version"),
                         "results": info.get("test_results", []),
                         "figures": [f"/static/experiments/{d.name}/figures/{f}" for f in figs]})
        db.commit()
    return runs
