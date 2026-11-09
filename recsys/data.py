"""Đọc, kiểm tra, làm sạch và chia dữ liệu MovieLens."""
from __future__ import annotations

import hashlib
from pathlib import Path

import numpy as np
import pandas as pd

from .algorithms import RATING_MAX, RATING_MIN


def sha256_file(path: str | Path) -> str:
    h = hashlib.sha256()
    with open(path, "rb") as f:
        for chunk in iter(lambda: f.read(1 << 20), b""):
            h.update(chunk)
    return h.hexdigest()


def load_movielens(raw_dir: str | Path):
    raw_dir = Path(raw_dir)
    movies = pd.read_csv(raw_dir / "movies.csv")
    ratings = pd.read_csv(raw_dir / "ratings.csv")
    links = pd.read_csv(raw_dir / "links.csv") if (raw_dir / "links.csv").exists() else None
    tags = pd.read_csv(raw_dir / "tags.csv") if (raw_dir / "tags.csv").exists() else None
    return movies, ratings, links, tags


def clean_ratings(ratings: pd.DataFrame, movies: pd.DataFrame):
    """Áp dụng các quy tắc làm sạch; trả về (df_sạch, nhật_ký).

    Mỗi quy tắc ghi số dòng trước/sau để đưa vào báo cáo.
    """
    log = []
    df = ratings.copy()

    def step(rule, reason, new_df):
        log.append({"rule": rule, "reason": reason, "before": len(df), "after": len(new_df)})
        return new_df

    df = step("drop_missing", "Thiếu userId/movieId/rating/timestamp",
              df.dropna(subset=["userId", "movieId", "rating", "timestamp"]))
    valid_scale = df["rating"].between(RATING_MIN, RATING_MAX) & ((df["rating"] * 2) % 1 == 0)
    df = step("rating_scale", "Điểm ngoài thang 0.5-5.0 bước 0.5", df[valid_scale])
    df = step("unknown_movie", "movieId không có trong movies.csv",
              df[df["movieId"].isin(movies["movieId"])])
    df = step("duplicate_pair", "Trùng cặp (userId, movieId): giữ đánh giá mới nhất",
              df.sort_values(["userId", "movieId", "timestamp"])
                .drop_duplicates(["userId", "movieId"], keep="last"))
    df = step("bad_timestamp", "timestamp <= 0",
              df[df["timestamp"] > 0])
    df = df.astype({"userId": int, "movieId": int, "rating": float, "timestamp": int})
    return df.reset_index(drop=True), log


def temporal_split_per_user(df: pd.DataFrame, ratios=(0.70, 0.15, 0.15)) -> pd.DataFrame:
    """Với từng người: sắp theo (timestamp, movieId) rồi chia train/val/test theo tỉ lệ.

    Hòa thời gian được phá bằng movieId (thứ tự cố định -> tái lập được).
    Trả về df có thêm cột ``split`` ∈ {train, val, test}.
    Giới hạn: không bảo đảm một mốc thời gian toàn cục giữa các người dùng.
    """
    assert abs(sum(ratios) - 1) < 1e-9
    df = df.sort_values(["userId", "timestamp", "movieId"]).copy()
    rank = df.groupby("userId").cumcount().to_numpy()
    n = df.groupby("userId")["movieId"].transform("size").to_numpy()
    n_train = np.maximum(1, np.round(n * ratios[0])).astype(int)
    n_val_end = np.maximum(n_train, np.round(n * (ratios[0] + ratios[1]))).astype(int)
    split = np.where(rank < n_train, "train", np.where(rank < n_val_end, "val", "test"))
    df["split"] = split
    return df.reset_index(drop=True)


def to_uir(df: pd.DataFrame) -> pd.DataFrame:
    """Đổi tên cột MovieLens sang quy ước user/item/rating dùng trong recsys."""
    return df.rename(columns={"userId": "user", "movieId": "item"})[["user", "item", "rating"]]
