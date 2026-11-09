"""Đánh giá & danh sách muốn xem: chỉ thao tác trên tài nguyên của chính người dùng đăng nhập.

user_id luôn lấy từ token, không nhận từ client -> không thể sửa dữ liệu của người khác.
"""
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from ..database import get_db
from ..deps import get_current_user
from ..models import Movie, Rating, User, WatchlistItem, utcnow
from ..schemas import RatingIn, RatingOut, WatchlistIn, WatchlistOut

router = APIRouter(prefix="/api", tags=["ratings & watchlist"])


def _movie_or_404(db, movie_id) -> Movie:
    m = db.get(Movie, movie_id)
    if not m or not m.is_active:
        raise HTTPException(404, "Không tìm thấy phim")
    return m


# ---------------------------------------------------------------- Ratings
@router.get("/ratings/me")
def my_ratings(page: int = Query(1, ge=1), size: int = Query(50, ge=1, le=200),
               sort: str = Query("recent", pattern="^(recent|score_desc|score_asc)$"),
               user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    order = {"recent": Rating.updated_at.desc(), "score_desc": Rating.score.desc(),
             "score_asc": Rating.score.asc()}[sort]
    base = select(Rating).where(Rating.user_id == user.id)
    total = db.scalar(select(func.count()).select_from(base.subquery()))
    rows = db.scalars(base.order_by(order, Rating.id).offset((page - 1) * size).limit(size)).all()
    return {"items": [RatingOut.model_validate(r) for r in rows], "total": total, "page": page, "size": size}


@router.put("/ratings/{movie_id}", response_model=RatingOut)
def rate_movie(movie_id: int, data: RatingIn, user: User = Depends(get_current_user),
               db: Session = Depends(get_db)):
    """Tạo mới hoặc sửa điểm - mỗi cặp (người, phim) chỉ có một đánh giá hiện tại."""
    movie = _movie_or_404(db, movie_id)
    r = db.scalar(select(Rating).where(Rating.user_id == user.id, Rating.movie_id == movie_id))
    if r is None:
        r = Rating(user_id=user.id, movie_id=movie_id, score=data.score)
        db.add(r)
        movie.rating_count += 1
        movie.rating_sum += data.score
    else:
        movie.rating_sum += data.score - r.score
        r.score = data.score
        r.updated_at = utcnow()
    user.ratings_updated_at = utcnow()
    db.commit()
    db.refresh(r)
    return r


@router.delete("/ratings/{movie_id}", status_code=204)
def delete_rating(movie_id: int, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    r = db.scalar(select(Rating).where(Rating.user_id == user.id, Rating.movie_id == movie_id))
    if r is None:
        raise HTTPException(404, "Bạn chưa đánh giá phim này")
    movie = db.get(Movie, movie_id)
    if movie:
        movie.rating_count = max(0, movie.rating_count - 1)
        movie.rating_sum -= r.score
    db.delete(r)
    user.ratings_updated_at = utcnow()
    db.commit()


# ---------------------------------------------------------------- Watchlist
@router.get("/watchlist", response_model=list[WatchlistOut])
def my_watchlist(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return db.scalars(select(WatchlistItem).where(WatchlistItem.user_id == user.id)
                      .order_by(WatchlistItem.added_at.desc())).all()


@router.post("/watchlist/{movie_id}", response_model=WatchlistOut, status_code=201)
def add_watchlist(movie_id: int, data: WatchlistIn | None = None, user: User = Depends(get_current_user),
                  db: Session = Depends(get_db)):
    _movie_or_404(db, movie_id)
    item = db.scalar(select(WatchlistItem).where(WatchlistItem.user_id == user.id,
                                                 WatchlistItem.movie_id == movie_id))
    if item is None:
        item = WatchlistItem(user_id=user.id, movie_id=movie_id, note=data.note if data else None)
        db.add(item)
    elif data and data.note is not None:
        item.note = data.note
    db.commit()
    db.refresh(item)
    return item


@router.delete("/watchlist/{movie_id}", status_code=204)
def remove_watchlist(movie_id: int, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    item = db.scalar(select(WatchlistItem).where(WatchlistItem.user_id == user.id,
                                                 WatchlistItem.movie_id == movie_id))
    if item is None:
        raise HTTPException(404, "Phim không có trong danh sách muốn xem")
    db.delete(item)
    db.commit()
