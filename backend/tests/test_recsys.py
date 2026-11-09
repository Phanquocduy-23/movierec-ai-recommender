"""Kiểm tra phép tính chỉ số & thuật toán trên ví dụ nhỏ tính tay (Bước 21)."""
import sys
from pathlib import Path

import numpy as np
import pandas as pd

sys.path.insert(0, str(Path(__file__).resolve().parents[2]))
from recsys.algorithms import ItemKNNRecommender, PopularityRecommender  # noqa: E402
from recsys.data import temporal_split_per_user  # noqa: E402
from recsys.metrics import mae, precision_recall_at_k, rmse  # noqa: E402


def test_rmse_mae_by_hand():
    assert rmse([4, 2], [3, 4]) == np.sqrt((1 + 4) / 2)
    assert mae([4, 2], [3, 4]) == 1.5


def test_precision_recall_by_hand():
    recs = {"u1": ["a", "b", "c", "d", "e", "f", "g", "h", "i", "j"], "u2": ["x"]}
    rel = {"u1": {"a", "z"}, "u2": {"x", "y"}, "u3": set()}
    r = precision_recall_at_k(recs, rel, k=10)
    assert np.isclose(r["precision@10"], (1 / 10 + 1 / 10) / 2)  # danh sách ngắn vẫn chia cho 10
    assert np.isclose(r["recall@10"], (1 / 2 + 1 / 2) / 2)
    assert r["n_users_no_relevant"] == 1


def test_split_no_overlap_and_temporal():
    df = pd.DataFrame({"userId": [1] * 20 + [2] * 10, "movieId": list(range(20)) + list(range(10)),
                       "rating": 4.0, "timestamp": list(range(20)) + [5] * 10})
    s = temporal_split_per_user(df)
    assert not s.duplicated(["userId", "movieId"]).any()
    u1 = s[s.userId == 1]
    assert u1[u1.split == "train"].timestamp.max() < u1[u1.split == "test"].timestamp.min()
    assert (u1.split == "train").sum() == 14


def test_popularity_excludes_seen():
    df = pd.DataFrame({"user": [1, 2, 3, 1], "item": ["a", "a", "a", "b"], "rating": [5, 5, 5, 1.0]})
    p = PopularityRecommender(m=1).fit(df)
    assert p.recommend(exclude={"a"}, n=5)[0][0] == "b"


def test_item_knn_profile_scoring():
    # a và b luôn được chấm giống nhau -> rất tương đồng; c ngược lại
    rows = []
    for u in range(10):
        hi = u % 2 == 0
        rows += [(u, "a", 5 if hi else 1), (u, "b", 5 if hi else 1), (u, "c", 1 if hi else 5), (u, "d", 3)]
    knn = ItemKNNRecommender(k=2, min_item_ratings=1).fit(pd.DataFrame(rows, columns=["user", "item", "rating"]))
    pred = knn.predict_profile({"a": 5.0, "c": 1.0}, ["b"])[0]
    assert pred > 4.0
    recs = knn.recommend_profile({"a": 5.0, "c": 1.0}, n=5)
    assert all(it not in ("a", "c") for it, _ in recs)
    assert knn.similar_items("a", 1)[0][0] == "b"
