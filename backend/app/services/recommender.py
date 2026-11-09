"""Phục vụ gợi ý (Bước 14) - ba tình huống người dùng.

| Tình huống                              | Nhánh xử lý                                              |
|-----------------------------------------|----------------------------------------------------------|
| Khách / chưa có điểm                    | Phổ biến (fallback=True)                                 |
| Có điểm nhưng chưa có trong SVD,        | Item-based KNN chấm trực tiếp từ hồ sơ điểm hiện tại     |
| hoặc đã sửa điểm sau lần train          | (không cần train lại); thiếu láng giềng -> bù phổ biến   |
| Đã có trong mô hình & không đổi điểm    | SVD của bản mô hình đang hoạt động                       |

Mỗi phản hồi trả về: phương pháp được yêu cầu/được dùng, phiên bản mô hình, cờ fallback, lý do.
Cache gắn với (người dùng, phiên bản mô hình, thời điểm đổi điểm, phương pháp, n).
"""
from __future__ import annotations

import logging
import threading
from collections import OrderedDict

import joblib
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from ..config import settings
from ..models import Genre, ModelVersion, Movie, Rating, RecommendationEvent, User

log = logging.getLogger(__name__)
METHODS = ("auto", "svd", "item_knn", "popular")


class ModelRegistry:
    def __init__(self):
        self._lock = threading.Lock()
        self._version: str | None = None
        self._bundle: dict | None = None
        self.cache: OrderedDict = OrderedDict()

    def invalidate(self):
        with self._lock:
            self._version, self._bundle = None, None
            self.cache.clear()

    def get(self, db: Session):
        mv = db.scalar(select(ModelVersion).where(ModelVersion.status == "active"))
        if mv is None:
            return None, None
        if mv.version != self._version:
            with self._lock:
                if mv.version != self._version:
                    try:
                        self._bundle = joblib.load(mv.path)
                        self._version = mv.version
                        self.cache.clear()
                    except Exception:  # noqa: BLE001 - mô hình lỗi: web vẫn chạy bằng fallback
                        log.exception("Không nạp được mô hình %s", mv.version)
                        return None, mv
        return self._bundle, mv

    def cache_get(self, key):
        if key in self.cache:
            self.cache.move_to_end(key)
            return self.cache[key]
        return None

    def cache_put(self, key, value):
        self.cache[key] = value
        if len(self.cache) > settings.recommend_cache_size:
            self.cache.popitem(last=False)


registry = ModelRegistry()


def popular_from_db(db: Session, n: int, exclude: set[int], m: float = 10.0) -> list[tuple[int, float]]:
    """Phổ biến tính thẳng từ CSDL - dùng khi chưa có mô hình nào được phát hành."""
    tot = db.execute(select(func.sum(Movie.rating_sum), func.sum(Movie.rating_count))).one()
    c = (tot[0] / tot[1]) if tot[1] else 3.5
    score = (Movie.rating_sum + m * c) / (Movie.rating_count + m)
    q = (select(Movie.id, score).where(Movie.is_active.is_(True), Movie.rating_count > 0)
         .order_by(score.desc()).limit(n + len(exclude)))
    return [(mid, float(s)) for mid, s in db.execute(q) if mid not in exclude][:n]


def _compute(db, user, profile, requested, n):
    bundle, mv = registry.get(db)
    version = mv.version if (mv and bundle) else None
    exclude = set(profile)
    want = n + 30  # lấy dư để bù các phim bị ẩn

    if bundle is None:
        reason = ("Chưa có mô hình được phát hành" if mv is None else "Mô hình hiện tại lỗi, không nạp được") \
                 + " - tạm dùng độ phổ biến."
        items = [(i, s, "popular", []) for i, s in popular_from_db(db, want, exclude)]
        return dict(served="popular", version=None, fallback=True, reason=reason, items=items)

    pop, knn, svd = bundle["popular"], bundle["item_knn"], bundle["svd"]

    def popular_items(k, excl):
        return [(int(i), s, "popular", []) for i, s in pop.recommend(exclude=excl, n=k)]

    if not profile:
        reason = ("Khách chưa đăng nhập" if user is None else "Bạn chưa đánh giá phim nào") + \
                 " - hiển thị phim phổ biến. Hãy chấm điểm vài phim để nhận gợi ý cá nhân hóa."
        return dict(served="popular", version=version, fallback=requested != "popular",
                    reason=reason, items=popular_items(want, exclude))

    if requested == "popular":
        return dict(served="popular", version=version, fallback=False,
                    reason="Mốc so sánh: xếp hạng theo độ phổ biến (giống nhau cho mọi người).",
                    items=popular_items(want, exclude))

    if requested in ("auto", "svd"):
        key = f"web:{user.id}"
        in_model = svd.has_user(key)
        fresh = in_model and (user.ratings_updated_at is None or user.ratings_updated_at <= mv.trained_at)
        if fresh or (requested == "svd" and in_model):
            recs = svd.recommend(key, n=want, exclude=exclude)
            reason = "SVD - mô hình phân rã ma trận đã học vector sở thích của bạn."
            if not fresh:
                reason += (f" Lưu ý: SVD chỉ phản ánh điểm tới lần huấn luyện {mv.trained_at:%d/%m/%Y %H:%M}; "
                           "điểm mới sẽ được học ở lần huấn luyện sau.")
            return dict(served="svd", version=version, fallback=False, reason=reason,
                        items=[(int(i), s, "svd", []) for i, s in recs])
        why = ("Tài khoản chưa có trong mô hình SVD" if not in_model
               else "Bạn đã thay đổi điểm sau lần huấn luyện gần nhất")
        reason = f"{why} - dùng Item-based KNN chấm trực tiếp từ {len(profile)} điểm hiện tại của bạn."
        fallback = requested == "svd"
    else:
        reason = f"Item-based KNN - dựa trên độ tương đồng giữa các phim và {len(profile)} điểm bạn đã chấm."
        fallback = False

    recs = knn.recommend_profile(profile, n=want, exclude=exclude)
    items = [(int(i), s, "item_knn", [int(j) for j, _ in knn.explain(profile, i)]) for i, s in recs]
    if len(items) < want:
        got = exclude | {i for i, *_ in items}
        items += popular_items(want - len(items), got)
        if len(recs) < n:
            fallback = True
            reason += " Không đủ phim có láng giềng phù hợp nên bổ sung bằng phim phổ biến."
    return dict(served="item_knn", version=version, fallback=fallback, reason=reason, items=items)


def recommend(db: Session, user: User | None, requested: str = "auto", n: int = 10) -> dict:
    if requested not in METHODS:
        raise ValueError(f"method phải thuộc {METHODS}")
    profile = {}
    if user is not None:
        profile = {mid: float(s) for mid, s in
                   db.execute(select(Rating.movie_id, Rating.score).where(Rating.user_id == user.id))}
    _, mv = registry.get(db)
    key = (user.id if user else 0, mv.version if mv else None,
           user.ratings_updated_at if user else None, requested, n)
    result = registry.cache_get(key)
    if result is None:
        result = _compute(db, user, profile, requested, n)
        registry.cache_put(key, result)

    # Nạp thông tin phim, bỏ phim đã ẩn, cắt đúng n
    ids = [i for i, *_ in result["items"]]
    because_ids = {j for *_, b in result["items"] for j in b}
    movies = {m.id: m for m in db.scalars(select(Movie).where(Movie.id.in_(set(ids) | because_ids)))}
    out = []
    for mid, score, source, because in result["items"]:
        m = movies.get(mid)
        if m is None or not m.is_active:
            continue
        # predicted_score: điểm mô hình dự đoán (popular: điểm trung bình có trọng số)
        out.append({"movie": m, "predicted_score": round(score, 3),
                    "source": source, "because": [movies[j].title for j in because if j in movies]})
        if len(out) >= n:
            break

    db.add(RecommendationEvent(user_id=user.id if user else None, requested_method=requested,
                               served_method=result["served"], model_version=result["version"],
                               fallback=result["fallback"], n_items=len(out)))
    db.commit()
    return {"requested_method": requested, "served_method": result["served"],
            "model_version": result["version"], "fallback": result["fallback"],
            "reason": result["reason"], "items": out}


def similar_movies(db: Session, movie: Movie, n: int = 10):
    bundle, _ = registry.get(db)
    pairs = bundle["item_knn"].similar_items(movie.id, n=n + 10) if bundle else []
    source = "item_knn"
    if not pairs:  # phim mới / chưa đủ đánh giá: fallback cùng thể loại, phổ biến
        source = "genre_popular"
        gids = [g.id for g in movie.genres]
        q = select(Movie).where(Movie.id != movie.id, Movie.is_active.is_(True))
        if gids:
            q = q.where(Movie.genres.any(Genre.id.in_(gids)))
        q = q.order_by(Movie.rating_count.desc()).limit(n)
        return source, [(m, None) for m in db.scalars(q)]
    ids = [int(i) for i, _ in pairs]
    movies = {m.id: m for m in db.scalars(select(Movie).where(Movie.id.in_(ids), Movie.is_active.is_(True)))}
    return source, [(movies[int(i)], round(s, 3)) for i, s in pairs if int(i) in movies][:n]
