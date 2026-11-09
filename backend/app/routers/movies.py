from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from ..database import get_db
from ..deps import get_optional_user
from ..models import Genre, Movie, Rating, User, WatchlistItem
from ..schemas import GenreOut, MovieDetail, MovieOut
from ..services.recommender import similar_movies

router = APIRouter(prefix="/api", tags=["movies"])

SORTS = {
    "popular": (Movie.rating_count.desc(),),
    "rating": ((Movie.rating_sum / func.nullif(Movie.rating_count, 0)).desc().nulls_last(),
               Movie.rating_count.desc()),
    "title": (Movie.title.asc(),),
    "year": (Movie.year.desc().nulls_last(),),
    "newest": (Movie.created_at.desc(),),
}


@router.get("/genres", response_model=list[GenreOut])
def list_genres(db: Session = Depends(get_db)):
    return db.scalars(select(Genre).order_by(Genre.name)).all()


@router.get("/movies")
def list_movies(q: str | None = Query(None, max_length=100), genre_id: int | None = None,
                year_from: int | None = None, year_to: int | None = None,
                min_ratings: int = Query(0, ge=0), sort: str = Query("popular", pattern="^(popular|rating|title|year|newest)$"),
                page: int = Query(1, ge=1), size: int = Query(24, ge=1, le=100),
                db: Session = Depends(get_db)):
    stmt = select(Movie).where(Movie.is_active.is_(True))
    if q:
        stmt = stmt.where(Movie.title.ilike(f"%{q.strip()}%"))
    if genre_id:
        stmt = stmt.where(Movie.genres.any(Genre.id == genre_id))
    if year_from:
        stmt = stmt.where(Movie.year >= year_from)
    if year_to:
        stmt = stmt.where(Movie.year <= year_to)
    if min_ratings:
        stmt = stmt.where(Movie.rating_count >= min_ratings)
    total = db.scalar(select(func.count()).select_from(stmt.subquery()))
    rows = db.scalars(stmt.order_by(*SORTS[sort], Movie.id).offset((page - 1) * size).limit(size)).all()
    return {"items": [MovieOut.model_validate(m) for m in rows], "total": total, "page": page, "size": size}


@router.get("/movies/{movie_id}", response_model=MovieDetail)
def get_movie(movie_id: int, db: Session = Depends(get_db), user: User | None = Depends(get_optional_user)):
    m = db.get(Movie, movie_id)
    if not m or (not m.is_active and (user is None or user.role_name != "admin")):
        raise HTTPException(404, "Không tìm thấy phim")
    out = MovieDetail.model_validate(m)
    if user:
        out.my_rating = db.scalar(select(Rating.score).where(Rating.user_id == user.id, Rating.movie_id == m.id))
        out.in_watchlist = db.scalar(select(WatchlistItem.id).where(
            WatchlistItem.user_id == user.id, WatchlistItem.movie_id == m.id)) is not None
    return out


@router.get("/movies/{movie_id}/similar")
def get_similar(movie_id: int, n: int = Query(10, ge=1, le=30), db: Session = Depends(get_db)):
    m = db.get(Movie, movie_id)
    if not m:
        raise HTTPException(404, "Không tìm thấy phim")
    source, pairs = similar_movies(db, m, n)
    return {"source": source,
            "items": [{"movie": MovieOut.model_validate(mv), "similarity": s} for mv, s in pairs]}


@router.get("/movies/{movie_id}/rating-distribution")
def rating_distribution(movie_id: int, db: Session = Depends(get_db)):
    """Phân bố điểm của phim (MovieLens + web) cho biểu đồ ở trang chi tiết."""
    from ..models import DatasetRating
    dist: dict[float, int] = {}
    for model in (DatasetRating, Rating):
        for s, c in db.execute(select(model.score, func.count()).where(model.movie_id == movie_id).group_by(model.score)):
            dist[float(s)] = dist.get(float(s), 0) + c
    return [{"score": s, "count": dist.get(s, 0)} for s in [x / 2 for x in range(1, 11)]]
