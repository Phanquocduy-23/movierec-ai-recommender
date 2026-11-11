from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from ..database import get_db
from ..deps import get_optional_user
from ..models import Genre, Movie, Rating, User, WatchlistItem
from ..schemas import GenreOut, MovieDetail, MovieOut, ReviewOut
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
        r = db.scalar(select(Rating).where(Rating.user_id == user.id, Rating.movie_id == m.id))
        if r:
            out.my_rating = r.score
            out.my_comment = r.comment
        out.in_watchlist = db.scalar(select(WatchlistItem.id).where(
            WatchlistItem.user_id == user.id, WatchlistItem.movie_id == m.id)) is not None
    return out


@router.get("/movies/{movie_id}/reviews", response_model=list[ReviewOut])
def get_movie_reviews(movie_id: int, db: Session = Depends(get_db)):
    """Danh sách bình luận & đánh giá trên web cho bộ phim (ưu tiên đánh giá có nội dung bình luận)."""
    rows = db.scalars(
        select(Rating)
        .where(Rating.movie_id == movie_id)
        .order_by(Rating.comment.is_(None).asc(), Rating.updated_at.desc())
        .limit(50)
    ).all()
    return [
        ReviewOut(
            id=r.id,
            user_id=r.user_id,
            username=r.user.username if r.user else f"user_{r.user_id}",
            full_name=r.user.full_name if r.user else None,
            score=r.score,
            comment=r.comment,
            updated_at=r.updated_at,
        )
        for r in rows
    ]


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


@router.get("/leaderboard")
def get_leaderboard(
    m: float = Query(50.0, ge=5.0, le=500.0, description="Ngưỡng số lượt đánh giá tối thiểu m trong công thức Bayes"),
    n: int = Query(25, ge=5, le=100),
    db: Session = Depends(get_db),
):
    """Bảng xếp hạng điện ảnh chuyên sâu: Top Trọng số Bayes, Viên ngọc ẩn (Hidden Gems), Bom tấn & Quán quân theo thể loại."""
    tot_sum, tot_cnt = db.execute(
        select(func.sum(Movie.rating_sum), func.sum(Movie.rating_count)).where(Movie.is_active.is_(True))
    ).one()
    c = float(tot_sum / tot_cnt) if tot_cnt else 3.5

    wr_expr = (Movie.rating_sum + m * c) / (Movie.rating_count + m)
    top_rows = db.execute(
        select(Movie, wr_expr.label("wr"))
        .where(Movie.is_active.is_(True), Movie.rating_count >= 5)
        .order_by(wr_expr.desc(), Movie.rating_count.desc())
        .limit(n)
    ).all()

    gems_rows = db.scalars(
        select(Movie)
        .where(
            Movie.is_active.is_(True),
            Movie.rating_count >= 12,
            Movie.rating_count <= 60,
            (Movie.rating_sum / func.nullif(Movie.rating_count, 0)) >= 4.0,
        )
        .order_by((Movie.rating_sum / func.nullif(Movie.rating_count, 0)).desc(), Movie.rating_count.desc())
        .limit(12)
    ).all()

    most_rated_rows = db.scalars(
        select(Movie)
        .where(Movie.is_active.is_(True), Movie.rating_count > 0)
        .order_by(Movie.rating_count.desc())
        .limit(12)
    ).all()

    genres = db.scalars(select(Genre).order_by(Genre.name)).all()
    genre_champions = []
    for g in genres:
        champ = db.execute(
            select(Movie, wr_expr.label("wr"))
            .where(Movie.is_active.is_(True), Movie.rating_count >= 10, Movie.genres.any(Genre.id == g.id))
            .order_by(wr_expr.desc())
            .limit(1)
        ).first()
        if champ:
            mv, wr_val = champ
            genre_champions.append({
                "genre": GenreOut.model_validate(g),
                "movie": MovieOut.model_validate(mv),
                "weighted_score": round(float(wr_val), 3),
            })

    return {
        "global_mean": round(c, 3),
        "m": m,
        "bayesian_top": [
            {"movie": MovieOut.model_validate(mv), "weighted_score": round(float(wr_val), 3)}
            for mv, wr_val in top_rows
        ],
        "hidden_gems": [MovieOut.model_validate(mv) for mv in gems_rows],
        "most_rated": [MovieOut.model_validate(mv) for mv in most_rated_rows],
        "genre_champions": genre_champions,
    }


@router.get("/movies/{movie_id}/compare/{other_id}")
def compare_movies(movie_id: int, other_id: int, db: Session = Depends(get_db)):
    """So sánh 2 bộ phim bằng AI: độ tương đồng Item-KNN, thể loại giao thoa, số người cùng chấm và gợi ý phim thứ 3."""
    from ..models import DatasetRating
    from ..services.recommender import registry

    m1 = db.get(Movie, movie_id)
    m2 = db.get(Movie, other_id)
    if not m1 or not m2:
        raise HTTPException(404, "Không tìm thấy phim để so sánh")

    g1 = {g.name for g in m1.genres}
    g2 = {g.name for g in m2.genres}
    shared_genres = sorted(g1 & g2)
    union_genres = g1 | g2
    genre_jaccard = len(shared_genres) / len(union_genres) if union_genres else 0.0

    # Số người dùng cùng chấm cả 2 phim trong MovieLens + Web
    ds_u1 = dict(db.execute(select(DatasetRating.source_user_id, DatasetRating.score).where(DatasetRating.movie_id == m1.id)).all())
    ds_u2 = dict(db.execute(select(DatasetRating.source_user_id, DatasetRating.score).where(DatasetRating.movie_id == m2.id)).all())
    common_ds = set(ds_u1) & set(ds_u2)

    web_u1 = dict(db.execute(select(Rating.user_id, Rating.score).where(Rating.movie_id == m1.id)).all())
    web_u2 = dict(db.execute(select(Rating.user_id, Rating.score).where(Rating.movie_id == m2.id)).all())
    common_web = set(web_u1) & set(web_u2)

    co_raters = len(common_ds) + len(common_web)
    scores_1 = [ds_u1[u] for u in common_ds] + [web_u1[u] for u in common_web]
    scores_2 = [ds_u2[u] for u in common_ds] + [web_u2[u] for u in common_web]
    avg_1_co = round(sum(scores_1) / len(scores_1), 2) if scores_1 else None
    avg_2_co = round(sum(scores_2) / len(scores_2), 2) if scores_2 else None

    bundle, _ = registry.get(db)
    knn_sim = None
    joint_items = []
    if bundle and "item_knn" in bundle:
        knn = bundle["item_knn"]
        sim_dict = dict(knn.similar_items(m1.id, n=250))
        if m2.id in sim_dict:
            knn_sim = round(float(sim_dict[m2.id]), 3)
        recs = knn.recommend_profile({m1.id: 5.0, m2.id: 5.0}, n=12, exclude={m1.id, m2.id})
        rec_ids = [int(i) for i, _ in recs]
        rec_movies = {
            mv.id: mv
            for mv in db.scalars(select(Movie).where(Movie.id.in_(rec_ids), Movie.is_active.is_(True)))
        }
        for mid, sc in recs:
            mv = rec_movies.get(int(mid))
            if mv:
                joint_items.append({"movie": MovieOut.model_validate(mv), "predicted_score": round(float(sc), 3)})
            if len(joint_items) >= 6:
                break

    effective_similarity = knn_sim if knn_sim is not None else round(genre_jaccard, 3)
    return {
        "movie_a": MovieOut.model_validate(m1),
        "movie_b": MovieOut.model_validate(m2),
        "knn_similarity": knn_sim,
        "genre_jaccard": round(genre_jaccard, 3),
        "effective_similarity": effective_similarity,
        "shared_genres": shared_genres,
        "only_a_genres": sorted(g1 - g2),
        "only_b_genres": sorted(g2 - g1),
        "co_raters": co_raters,
        "avg_a_by_coraters": avg_1_co,
        "avg_b_by_coraters": avg_2_co,
        "joint_recommendations": joint_items,
    }
