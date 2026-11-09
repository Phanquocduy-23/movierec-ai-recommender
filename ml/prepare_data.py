"""Bước 6-8: kiểm tra, làm sạch, thống kê (EDA) và chia tập dữ liệu.

Chạy:  python ml/prepare_data.py --raw data/raw/ml-latest-small
Đầu ra (data/processed/):
  ratings_clean.csv, train.csv, val.csv, test.csv
  cleaning_log.json, eda_stats.json, split_manifest.json, eda_report.md
  figures/*.png
"""
import argparse
import json
import sys
from pathlib import Path

import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt  # noqa: E402
import pandas as pd  # noqa: E402

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))
from recsys.data import clean_ratings, load_movielens, sha256_file, temporal_split_per_user  # noqa: E402

SPLIT_VERSION = "per_user_temporal_70_15_15_v1"


def eda(df, movies, fig_dir: Path):
    fig_dir.mkdir(parents=True, exist_ok=True)
    n_users, n_items = df["userId"].nunique(), df["movieId"].nunique()
    per_user = df.groupby("userId").size()
    per_item = df.groupby("movieId").size()
    stats = {
        "n_ratings": int(len(df)), "n_users": int(n_users), "n_movies_rated": int(n_items),
        "n_movies_catalog": int(len(movies)),
        "sparsity": float(1 - len(df) / (n_users * n_items)),
        "rating_mean": float(df["rating"].mean()), "rating_std": float(df["rating"].std()),
        "rating_distribution": {str(k): int(v) for k, v in df["rating"].value_counts().sort_index().items()},
        "ratings_per_user": per_user.describe().round(2).to_dict(),
        "ratings_per_movie": per_item.describe().round(2).to_dict(),
        "movies_with_1_rating": int((per_item == 1).sum()),
        "time_range": [pd.to_datetime(df["timestamp"].min(), unit="s").isoformat(),
                       pd.to_datetime(df["timestamp"].max(), unit="s").isoformat()],
    }

    plt.figure(figsize=(7, 4))
    df["rating"].value_counts().sort_index().plot(kind="bar", color="#4f46e5")
    plt.title("Phân bố điểm đánh giá"); plt.xlabel("Điểm"); plt.ylabel("Số đánh giá")
    plt.tight_layout(); plt.savefig(fig_dir / "rating_distribution.png", dpi=150); plt.close()

    fig, ax = plt.subplots(1, 2, figsize=(11, 4))
    ax[0].hist(per_user, bins=50, color="#0ea5e9"); ax[0].set_yscale("log")
    ax[0].set_title("Số đánh giá mỗi người dùng"); ax[0].set_xlabel("Số đánh giá")
    ax[1].plot(sorted(per_item.values, reverse=True), color="#f97316")
    ax[1].set_yscale("log"); ax[1].set_title("Đuôi dài: số đánh giá mỗi phim (giảm dần)")
    ax[1].set_xlabel("Thứ hạng phim")
    plt.tight_layout(); plt.savefig(fig_dir / "long_tail.png", dpi=150); plt.close()

    g = movies.assign(genre=movies["genres"].str.split("|")).explode("genre")
    rated = df.merge(g[["movieId", "genre"]], on="movieId")
    genre_counts = rated["genre"].value_counts()
    stats["ratings_by_genre"] = {k: int(v) for k, v in genre_counts.items()}
    plt.figure(figsize=(9, 5))
    genre_counts.sort_values().plot(kind="barh", color="#10b981")
    plt.title("Số đánh giá theo thể loại (một phim nhiều thể loại)"); plt.tight_layout()
    plt.savefig(fig_dir / "genre_ratings.png", dpi=150); plt.close()
    return stats


def main():
    if hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(encoding="utf-8")
    ap = argparse.ArgumentParser()
    ap.add_argument("--raw", default=str(ROOT / "data/raw/ml-latest-small"))
    ap.add_argument("--out", default=str(ROOT / "data/processed"))
    args = ap.parse_args()
    raw, out = Path(args.raw), Path(args.out)
    out.mkdir(parents=True, exist_ok=True)

    movies, ratings, _, _ = load_movielens(raw)
    clean, log = clean_ratings(ratings, movies)
    clean.to_csv(out / "ratings_clean.csv", index=False)
    (out / "cleaning_log.json").write_text(json.dumps(log, indent=2, ensure_ascii=False), "utf-8")

    stats = eda(clean, movies, out / "figures")
    (out / "eda_stats.json").write_text(json.dumps(stats, indent=2, ensure_ascii=False), "utf-8")

    split = temporal_split_per_user(clean)
    for name in ["train", "val", "test"]:
        split[split["split"] == name].drop(columns="split").to_csv(out / f"{name}.csv", index=False)

    # Kiểm tra không chồng lấn cặp (user, movie) giữa các tập
    keys = {s: set(map(tuple, split[split["split"] == s][["userId", "movieId"]].to_numpy()))
            for s in ["train", "val", "test"]}
    overlap = {f"{a}&{b}": len(keys[a] & keys[b]) for a, b in [("train", "val"), ("train", "test"), ("val", "test")]}
    assert all(v == 0 for v in overlap.values()), overlap

    train_items = set(split[split["split"] == "train"]["movieId"])
    trval_items = set(split[split["split"] != "test"]["movieId"])
    manifest = {
        "split_version": SPLIT_VERSION,
        "source_sha256": sha256_file(raw / "ratings.csv"),
        "clean_sha256": sha256_file(out / "ratings_clean.csv"),
        "counts": split["split"].value_counts().to_dict(),
        "overlap_check": overlap,
        "cold_start": {
            "val_ratings_item_not_in_train": int((~split[split["split"] == "val"]["movieId"].isin(train_items)).sum()),
            "test_ratings_item_not_in_train_val": int((~split[split["split"] == "test"]["movieId"].isin(trval_items)).sum()),
        },
        "files": {n: sha256_file(out / f"{n}.csv") for n in ["train", "val", "test"]},
    }
    (out / "split_manifest.json").write_text(json.dumps(manifest, indent=2, ensure_ascii=False), "utf-8")

    lines = ["# Báo cáo kiểm tra & EDA", "", "## Quy tắc làm sạch", "",
             "| Quy tắc | Lý do | Trước | Sau |", "|---|---|---|---|"]
    lines += [f"| {r['rule']} | {r['reason']} | {r['before']} | {r['after']} |" for r in log]
    lines += ["", "## Thống kê", "", "```json", json.dumps({k: v for k, v in stats.items()
              if k != "ratings_by_genre"}, indent=2, ensure_ascii=False), "```", "",
              "## Chia tập", "", "```json", json.dumps(manifest, indent=2, ensure_ascii=False), "```", "",
              "![](figures/rating_distribution.png)", "![](figures/long_tail.png)", "![](figures/genre_ratings.png)",
              "", "> Lưu ý: phim chưa được đánh giá KHÔNG đồng nghĩa người dùng không thích."]
    (out / "eda_report.md").write_text("\n".join(lines), "utf-8")
    print(json.dumps(manifest, indent=2, ensure_ascii=False))


if __name__ == "__main__":
    main()
