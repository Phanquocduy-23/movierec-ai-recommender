"""Chỉ số đánh giá: RMSE, MAE (dự đoán điểm) và Precision@K, Recall@K (danh sách gợi ý)."""
from __future__ import annotations

import numpy as np


def rmse(y_true, y_pred) -> float:
    y_true, y_pred = np.asarray(y_true, float), np.asarray(y_pred, float)
    return float(np.sqrt(np.mean((y_true - y_pred) ** 2)))


def mae(y_true, y_pred) -> float:
    y_true, y_pred = np.asarray(y_true, float), np.asarray(y_pred, float)
    return float(np.mean(np.abs(y_true - y_pred)))


def precision_recall_at_k(recommendations: dict, relevant: dict, k: int = 10) -> dict:
    """Tính Precision@K và Recall@K trung bình trên người dùng.

    recommendations: {user: [item, ...]} theo thứ tự xếp hạng.
    relevant:        {user: set(item)} - phim "thích" (điểm thật >= ngưỡng) trong tập giữ lại.

    Quy ước (ghi rõ trong báo cáo):
    - Người không có phim thích trong tập giữ lại bị loại khỏi trung bình (báo số lượng).
    - Precision chia cho K cố định; danh sách ngắn hơn K được tính các vị trí trống là trượt.
    - Recall chia cho số phim thích bị giữ lại (kể cả phim không có trong dữ liệu fit).
    """
    precisions, recalls = [], []
    skipped = 0
    for user, rel in relevant.items():
        if not rel:
            skipped += 1
            continue
        recs = list(recommendations.get(user, []))[:k]
        hits = len(set(recs) & rel)
        precisions.append(hits / k)
        recalls.append(hits / len(rel))
    return {
        f"precision@{k}": float(np.mean(precisions)) if precisions else 0.0,
        f"recall@{k}": float(np.mean(recalls)) if recalls else 0.0,
        "n_users_ranked": len(precisions),
        "n_users_no_relevant": skipped,
    }


def catalog_coverage(recommendations: dict, n_candidates: int) -> float:
    """Tỉ lệ phim khác nhau xuất hiện trong mọi danh sách gợi ý (đo độ đa dạng)."""
    items = set()
    for recs in recommendations.values():
        items.update(recs)
    return len(items) / n_candidates if n_candidates else 0.0
