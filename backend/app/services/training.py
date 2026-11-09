"""Công việc huấn luyện & phát hành mô hình phục vụ web (Bước 15).

- Quản trị viên kích hoạt; job chạy nền, trạng thái pending → running → succeeded/failed.
- Không bao giờ train trong request lấy gợi ý.
- Mô hình được ghi vào thư mục tạm, kiểm tra đầu ra + ID mapping, rồi mới đổi tên thành bản chính
  thức. Lỗi -> giữ nguyên bản đang hoạt động.
- Mô hình phát hành fit trên TOÀN BỘ dữ liệu (MovieLens + web) nên KHÔNG dùng để báo cáo điểm test;
  điểm test lấy từ ml/train_evaluate.py.
"""
from __future__ import annotations

import shutil
import threading
import traceback
from pathlib import Path

import joblib
import numpy as np
import pandas as pd
from sqlalchemy import select
from sqlalchemy.orm import Session

from recsys.algorithms import ItemKNNRecommender, PopularityRecommender, SVDRecommender

from ..config import settings
from ..database import SessionLocal
from ..models import DatasetRating, ModelVersion, Movie, Rating, TrainingRun, utcnow

_train_lock = threading.Lock()


def load_training_frame(db: Session) -> pd.DataFrame:
    """Gộp hai nguồn với namespace riêng để không trùng người dùng."""
    ds = pd.DataFrame(db.execute(select(DatasetRating.source_user_id, DatasetRating.movie_id,
                                        DatasetRating.score)).all(), columns=["u", "item", "rating"])
    web = pd.DataFrame(db.execute(select(Rating.user_id, Rating.movie_id, Rating.score)).all(),
                       columns=["u", "item", "rating"])
    ds["user"] = "ml:" + ds["u"].astype(str)
    web["user"] = "web:" + web["u"].astype(str)
    df = pd.concat([ds, web], ignore_index=True)[["user", "item", "rating"]]
    df["item"] = df["item"].astype(int)
    df["rating"] = df["rating"].astype(float)
    return df


def validate_bundle(path: Path, df: pd.DataFrame, valid_movie_ids: set[int]) -> dict:
    b = joblib.load(path)
    svd, knn, pop = b["svd"], b["item_knn"], b["popular"]
    sample = df.sample(min(500, len(df)), random_state=0)
    preds = svd.predict_many(sample["user"].tolist(), sample["item"].tolist())
    if not np.all(np.isfinite(preds)) or preds.min() < 0.5 or preds.max() > 5.0:
        raise ValueError("SVD trả về điểm không hợp lệ")
    unknown = set(map(int, svd.items)) - valid_movie_ids
    if unknown:
        raise ValueError(f"ID mapping lỗi: {len(unknown)} phim trong mô hình không có trong CSDL")
    u = sample["user"].iloc[0]
    seen = set(df.loc[df["user"] == u, "item"])
    recs = svd.recommend(u, n=10, exclude=seen)
    if len(recs) == 0 or any(it in seen for it, _ in recs):
        raise ValueError("Top-10 SVD rỗng hoặc chứa phim đã đánh giá")
    profile = dict(df.loc[df["user"] == u, ["item", "rating"]].itertuples(index=False))
    knn_recs = knn.recommend_profile(profile, n=10)
    if any(it in profile for it, _ in knn_recs):
        raise ValueError("Top-10 Item-KNN chứa phim đã đánh giá")
    pop_rmse = float(np.sqrt(np.mean((pop.predict_many(None, sample["item"]) - sample["rating"]) ** 2)))
    svd_rmse = float(np.sqrt(np.mean((preds - sample["rating"].to_numpy()) ** 2)))
    return {"sample_size": int(len(sample)), "svd_train_rmse_sample": round(svd_rmse, 4),
            "popular_train_rmse_sample": round(pop_rmse, 4), "knn_sample_recs": len(knn_recs),
            "note": "Sai số trên dữ liệu fit chỉ để kiểm tra mô hình hoạt động, không phải kết quả test"}


def activate_model(db: Session, mv: ModelVersion):
    for other in db.scalars(select(ModelVersion).where(ModelVersion.status == "active")):
        if other.id != mv.id:
            other.status = "archived"
    mv.status = "active"
    mv.activated_at = utcnow()
    db.commit()
    from .recommender import registry
    registry.invalidate()


def run_training(run_id: int):
    if not _train_lock.acquire(blocking=False):
        _fail(run_id, "Đang có một job huấn luyện khác chạy")
        return
    db = SessionLocal()
    tmp_dir = None
    try:
        run = db.get(TrainingRun, run_id)
        run.status, run.started_at = "running", utcnow()
        db.commit()
        p = run.params or {}

        df = load_training_frame(db)
        if len(df) < 100:
            raise ValueError("Chưa đủ dữ liệu đánh giá để huấn luyện (cần nhập MovieLens trước)")
        trained_at = utcnow()
        version = trained_at.strftime("v%Y%m%d-%H%M%S")
        pop = PopularityRecommender(m=p.get("pop_m", 10)).fit(df)
        knn = ItemKNNRecommender(k=p.get("knn_k", 40), shrink=p.get("knn_shrink", 0.0)).fit(df)
        svd = SVDRecommender(n_factors=p.get("svd_factors", 50), n_epochs=p.get("svd_epochs", 20),
                             lr_all=p.get("svd_lr", 0.005), reg_all=p.get("svd_reg", 0.02)).fit(df)

        settings.models_dir.mkdir(parents=True, exist_ok=True)
        tmp_dir = settings.models_dir / f"{version}.tmp"
        tmp_dir.mkdir()
        bundle = {"version": version, "trained_at": trained_at, "params": p,
                  "popular": pop, "item_knn": knn, "svd": svd}
        joblib.dump(bundle, tmp_dir / "bundle.joblib", compress=3)

        valid_ids = set(db.scalars(select(Movie.id)))
        validation = validate_bundle(tmp_dir / "bundle.joblib", df, valid_ids)

        final_dir = settings.models_dir / version
        tmp_dir.rename(final_dir)
        tmp_dir = None
        mv = ModelVersion(version=version, path=str(final_dir / "bundle.joblib"), status="ready",
                          params=p, validation=validation, n_users=int(df["user"].nunique()),
                          n_items=int(df["item"].nunique()), n_ratings=int(len(df)), trained_at=trained_at)
        db.add(mv); db.flush()
        run.model_version_id = mv.id
        run.status, run.finished_at = "succeeded", utcnow()
        run.message = f"Đã tạo {version}" + (" và phát hành" if run.auto_activate else " (chưa phát hành)")
        db.commit()
        if run.auto_activate:
            activate_model(db, mv)
    except Exception as e:  # noqa: BLE001
        db.rollback()
        _fail(run_id, f"{e}\n{traceback.format_exc(limit=3)}", db)
        if tmp_dir is not None and Path(tmp_dir).exists():
            shutil.rmtree(tmp_dir, ignore_errors=True)  # không để lại file mô hình dở dang
    finally:
        db.close()
        _train_lock.release()


def _fail(run_id: int, msg: str, db: Session | None = None):
    own = db is None
    db = db or SessionLocal()
    try:
        run = db.get(TrainingRun, run_id)
        if run:
            run.status, run.message, run.finished_at = "failed", msg[:4000], utcnow()
            db.commit()
    finally:
        if own:
            db.close()


def is_training_running() -> bool:
    return _train_lock.locked()
