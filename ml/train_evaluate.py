"""Bước 9-13: huấn luyện, chọn tham số trên validation, đánh giá test một lần, lưu thực nghiệm.

Chạy:  python ml/train_evaluate.py            (dùng ml/config.json)
       python ml/train_evaluate.py --quick    (chỉ 1 cấu hình mỗi phương pháp để thử nhanh)

Giao thức:
  1. Fit trên TRAIN, đo trên VAL cho mọi cấu hình trong lưới -> chọn cấu hình theo tiêu chí config.
  2. Fit lại cấu hình đã chốt trên TRAIN+VAL, đo trên TEST đúng một lần.
  3. Ứng viên xếp hạng = phim có trong dữ liệu fit, loại phim người đó đã đánh giá trong dữ liệu fit.
     Mọi phương pháp dùng cùng tập ứng viên, cùng người dùng, cùng nhãn "thích" (điểm >= 4).
Đầu ra: artifacts/experiments/<run_id>/
"""
import argparse
import json
import platform
import sys
import time
from datetime import datetime
from pathlib import Path

import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt  # noqa: E402
import numpy as np  # noqa: E402
import pandas as pd  # noqa: E402

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))
from recsys.algorithms import ItemKNNRecommender, PopularityRecommender, SVDRecommender  # noqa: E402
from recsys.data import sha256_file, to_uir  # noqa: E402
from recsys.metrics import catalog_coverage, mae, precision_recall_at_k, rmse  # noqa: E402

LABELS = {"popular": "Phổ biến (baseline)", "item_knn": "Item-based KNN", "svd": "SVD"}


def make_model(method, params, seed):
    if method == "popular":
        return PopularityRecommender(**params)
    if method == "item_knn":
        return ItemKNNRecommender(**params)
    if method == "svd":
        return SVDRecommender(random_state=seed, **params)
    raise ValueError(method)


def evaluate(model, method, fit, held, k, thr):
    fit_users, fit_items = set(fit["user"]), set(fit["item"])
    profiles = {u: dict(zip(g["item"], g["rating"])) for u, g in fit.groupby("user")}

    # ---- Dự đoán điểm: chỉ các cặp có user và phim trong dữ liệu fit ----
    elig = held[held["user"].isin(fit_users) & held["item"].isin(fit_items)]
    if method == "item_knn":
        # Item-based chấm từ hồ sơ điểm của chính người đó trong dữ liệu fit
        pred_s = pd.Series(np.nan, index=elig.index)
        for u, g in elig.groupby("user", sort=False):
            pred_s.loc[g.index] = model.predict_profile(profiles[u], g["item"].tolist())
        preds = pred_s.to_numpy()
    else:
        preds = model.predict_many(elig["user"].tolist(), elig["item"].tolist())
    res = {"rmse": rmse(elig["rating"], preds), "mae": mae(elig["rating"], preds),
           "n_pairs_eligible": int(len(elig)), "n_pairs_total": int(len(held))}

    # ---- Xếp hạng Top-K ----
    relevant = {u: set(g.loc[g["rating"] >= thr, "item"]) for u, g in held.groupby("user")}
    recs, lengths = {}, []
    for u, rel in relevant.items():
        if not rel:
            continue
        seen = set(profiles.get(u, {}))
        if method == "popular":
            r = model.recommend(exclude=seen, n=k)
        elif method == "svd":
            r = model.recommend(u, n=k, exclude=seen)
        else:
            r = model.recommend_profile(profiles.get(u, {}), n=k, exclude=seen)
        recs[u] = [it for it, _ in r]
        lengths.append(len(recs[u]))
    res.update(precision_recall_at_k(recs, relevant, k))
    res["coverage"] = catalog_coverage(recs, len(fit_items))
    res["avg_list_length"] = float(np.mean(lengths)) if lengths else 0.0
    res["n_relevant_not_in_fit"] = int(sum(len(r - fit_items) for r in relevant.values()))
    return res


def better(method, metric, a, b):
    if b is None:
        return True
    return a[metric] < b[metric] if metric in ("rmse", "mae") else a[metric] > b[metric]


def plot(test_df, val_df, out: Path, k):
    figs = out / "figures"; figs.mkdir(exist_ok=True)
    labels = [LABELS[m] for m in test_df["method"]]
    x = np.arange(len(labels))
    for fname, cols, title in [("rating_metrics.png", ["rmse", "mae"], "Sai số dự đoán điểm trên test (thấp hơn là tốt)"),
                               ("ranking_metrics.png", [f"precision@{k}", f"recall@{k}"], f"Chất lượng Top-{k} trên test (cao hơn là tốt)")]:
        plt.figure(figsize=(8, 4.5))
        w = 0.38
        for j, c in enumerate(cols):
            bars = plt.bar(x + (j - 0.5) * w, test_df[c], w, label=c.upper())
            plt.bar_label(bars, fmt="%.4f", fontsize=8)
        plt.xticks(x, labels); plt.title(title); plt.legend(); plt.tight_layout()
        plt.savefig(figs / fname, dpi=150); plt.close()
    # Ảnh hưởng tham số trên validation
    fig, ax = plt.subplots(1, 2, figsize=(11, 4))
    knn = val_df[val_df["method"] == "item_knn"]
    for shrink, g in knn.groupby(knn["params"].map(lambda p: json.loads(p).get("shrink", 0))):
        ax[0].plot(g["params"].map(lambda p: json.loads(p)["k"]), g["rmse"], marker="o", label=f"shrink={shrink}")
    ax[0].set_title("Item-KNN: RMSE validation theo k"); ax[0].set_xlabel("k"); ax[0].legend()
    svd = val_df[val_df["method"] == "svd"]
    ax[1].bar(svd["params"].map(lambda p: "f{n_factors}/e{n_epochs}".format(**json.loads(p))), svd["rmse"], color="#6366f1")
    ax[1].set_title("SVD: RMSE validation theo (factors/epochs)")
    ax[1].set_ylim(svd["rmse"].min() * 0.98 if len(svd) else 0, svd["rmse"].max() * 1.01 if len(svd) else 1)
    plt.tight_layout(); plt.savefig(figs / "validation_grid.png", dpi=150); plt.close()


def lib_versions():
    import sklearn
    out = {"python": sys.version.split()[0], "numpy": np.__version__, "pandas": pd.__version__,
           "scikit-learn": sklearn.__version__}
    try:
        import surprise
        out["scikit-surprise"] = surprise.__version__
    except Exception:
        out["scikit-surprise"] = None
    return out


def main():
    if hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(encoding="utf-8")
    ap = argparse.ArgumentParser()
    ap.add_argument("--data", default=str(ROOT / "data/processed"))
    ap.add_argument("--config", default=str(ROOT / "ml/config.json"))
    ap.add_argument("--out", default=str(ROOT / "artifacts/experiments"))
    ap.add_argument("--quick", action="store_true")
    ap.add_argument("--methods", default="popular,item_knn,svd")
    args = ap.parse_args()

    cfg = json.loads(Path(args.config).read_text("utf-8"))
    k, thr, seed = cfg["k"], cfg["relevance_threshold"], cfg["seed"]
    np.random.seed(seed)
    data = Path(args.data)
    train = to_uir(pd.read_csv(data / "train.csv"))
    val = to_uir(pd.read_csv(data / "val.csv"))
    test = to_uir(pd.read_csv(data / "test.csv"))
    trval = pd.concat([train, val], ignore_index=True)

    run_id = datetime.now().strftime("%Y%m%d-%H%M%S")
    out = Path(args.out) / run_id
    out.mkdir(parents=True, exist_ok=True)
    t0 = time.time()
    methods = args.methods.split(",")

    val_rows, chosen = [], {}
    for method in methods:
        grid = cfg["grids"][method][:1] if args.quick else cfg["grids"][method]
        metric = cfg["selection"][method]
        best, best_params = None, None
        for params in grid:
            ts = time.time()
            model = make_model(method, params, seed).fit(train)
            r = evaluate(model, method, train, val, k, thr)
            r.update(method=method, params=json.dumps(params), fit_eval_seconds=round(time.time() - ts, 2))
            val_rows.append(r)
            print(f"[VAL] {method:8s} {params} rmse={r['rmse']:.4f} p@{k}={r[f'precision@{k}']:.4f}")
            if better(method, metric, r, best):
                best, best_params = r, params
        chosen[method] = {"params": best_params, "selected_by": metric}

    test_rows = []
    for method in methods:
        ts = time.time()
        model = make_model(method, chosen[method]["params"], seed).fit(trval)
        r = evaluate(model, method, trval, test, k, thr)
        r.update(method=method, params=json.dumps(chosen[method]["params"]),
                 fit_eval_seconds=round(time.time() - ts, 2))
        test_rows.append(r)
        print(f"[TEST] {method:8s} rmse={r['rmse']:.4f} mae={r['mae']:.4f} "
              f"p@{k}={r[f'precision@{k}']:.4f} r@{k}={r[f'recall@{k}']:.4f}")

    val_df, test_df = pd.DataFrame(val_rows), pd.DataFrame(test_rows)
    val_df.to_csv(out / "val_results.csv", index=False)
    test_df.to_csv(out / "test_results.csv", index=False)
    plot(test_df, val_df, out, k)
    split_manifest = data / "split_manifest.json"
    info = {
        "run_id": run_id, "quick": args.quick, "seed": seed, "k": k, "relevance_threshold": thr,
        "chosen": chosen, "protocol": "fit train -> select on val -> refit train+val -> test once",
        "split": json.loads(split_manifest.read_text("utf-8")) if split_manifest.exists() else None,
        "data_hash": {n: sha256_file(data / f"{n}.csv") for n in ["train", "val", "test"]},
        "libraries": lib_versions(),
        "machine": {"platform": platform.platform(), "processor": platform.processor()},
        "duration_seconds": round(time.time() - t0, 1),
        "test_results": test_rows,
    }
    (out / "run_info.json").write_text(json.dumps(info, indent=2, ensure_ascii=False), "utf-8")
    print(f"\nĐã lưu thực nghiệm vào {out}")


if __name__ == "__main__":
    main()
