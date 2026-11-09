"""Ba phương pháp gợi ý của đề tài.

Quy ước dữ liệu đầu vào: DataFrame có các cột ``user``, ``item``, ``rating``.
- ``user``: khóa người dùng (thực nghiệm: userId MovieLens; web: "ml:<id>" hoặc "web:<id>").
- ``item``: khóa phim (thực nghiệm: movieId MovieLens; web: movies.id trong PostgreSQL).

1. PopularityRecommender  - mốc so sánh theo độ phổ biến (không cá nhân hóa).
2. ItemKNNRecommender     - lọc cộng tác dựa trên phim (Item-based CF) dùng KNN
                            (scikit-learn NearestNeighbors, độ đo cosine trên điểm đã trừ
                            trung bình người dùng = adjusted cosine).
3. SVDRecommender         - phân rã ma trận SVD (scikit-surprise).

ItemKNN chấm điểm trực tiếp từ một "hồ sơ" {item: rating}, vì vậy dùng được cho cả tài khoản
web mới chưa có trong mô hình (không cần train lại).
"""
from __future__ import annotations

import numpy as np
import pandas as pd
from scipy import sparse

RATING_MIN, RATING_MAX = 0.5, 5.0


def _clip(x):
    return np.clip(x, RATING_MIN, RATING_MAX)


# ---------------------------------------------------------------------------
# 1. Mốc độ phổ biến
# ---------------------------------------------------------------------------
class PopularityRecommender:
    """Xếp hạng theo trung bình có trọng số (weighted rating kiểu IMDb).

    score(i) = v/(v+m) * R_i + m/(v+m) * C
    v: số đánh giá của phim, R_i: điểm trung bình phim, C: trung bình toàn cục,
    m: số đánh giá "tối thiểu" (tham số chọn trên validation).

    Bộ dự đoán điểm (để có RMSE/MAE) = chính điểm trung bình đã làm mịn này.
    Danh sách gợi ý giống nhau cho mọi người (chỉ loại phim đã xem).
    """

    name = "popular"

    def __init__(self, m: float = 10.0):
        self.m = float(m)

    def get_params(self):
        return {"m": self.m}

    def fit(self, df: pd.DataFrame):
        stats = df.groupby("item")["rating"].agg(["count", "mean"])
        self.global_mean = float(df["rating"].mean())
        v, r = stats["count"].to_numpy(float), stats["mean"].to_numpy(float)
        score = v / (v + self.m) * r + self.m / (v + self.m) * self.global_mean
        self.item_score = pd.Series(score, index=stats.index)
        self.item_count = stats["count"]
        order = np.argsort(-score, kind="stable")
        self.ranked_items = stats.index.to_numpy()[order]
        return self

    def predict_many(self, users, items) -> np.ndarray:
        return _clip(self.item_score.reindex(items).fillna(self.global_mean).to_numpy(float))

    def recommend(self, exclude=(), n: int = 10, candidates=None):
        """Trả về list[(item, score)]."""
        exclude = set(exclude)
        cand = set(candidates) if candidates is not None else None
        out = []
        for it in self.ranked_items:
            if it in exclude or (cand is not None and it not in cand):
                continue
            out.append((it, float(self.item_score[it])))
            if len(out) >= n:
                break
        return out


# ---------------------------------------------------------------------------
# 2. Item-based Collaborative Filtering dùng KNN
# ---------------------------------------------------------------------------
class ItemKNNRecommender:
    """Item-based CF (tương đương KNNWithMeans với user_based=False).

    - Tương đồng: cosine giữa các vector phim trên điểm đã trừ trung bình của từng người
      (adjusted cosine). Chỉ dùng dữ liệu fit.
    - Láng giềng: k phim gần nhất tìm bằng sklearn.neighbors.NearestNeighbors (brute, cosine).
      Phim có ít hơn ``min_item_ratings`` đánh giá không được làm láng giềng.
    - Dự đoán: r̂(u,i) = μ_u + Σ_j s_ij (r_uj − μ_u) / (Σ_j |s_ij| + shrink),
      j ∈ N_k(i) ∩ I_u. Nếu số láng giềng đã chấm < min_neighbors -> fallback μ_u.
    """

    name = "item_knn"

    def __init__(self, k: int = 40, min_item_ratings: int = 3, min_neighbors: int = 1,
                 shrink: float = 0.0):
        self.k = int(k)
        self.min_item_ratings = int(min_item_ratings)
        self.min_neighbors = int(min_neighbors)
        self.shrink = float(shrink)

    def get_params(self):
        return {"k": self.k, "min_item_ratings": self.min_item_ratings,
                "min_neighbors": self.min_neighbors, "shrink": self.shrink}

    def fit(self, df: pd.DataFrame):
        from sklearn.neighbors import NearestNeighbors

        self.global_mean = float(df["rating"].mean())
        self.items = np.array(sorted(df["item"].unique()))
        self.item_index = {it: i for i, it in enumerate(self.items)}
        users = pd.Index(sorted(df["user"].unique()))
        user_mean = df.groupby("user")["rating"].mean()

        ii = df["item"].map(self.item_index).to_numpy()
        uu = users.get_indexer(df["user"])
        centered = (df["rating"] - df["user"].map(user_mean)).to_numpy(float)
        n_items, n_users = len(self.items), len(users)
        X = sparse.csr_matrix((centered, (ii, uu)), shape=(n_items, n_users))

        counts = np.bincount(ii, minlength=n_items)
        eligible = np.where(counts >= self.min_item_ratings)[0]
        if len(eligible) < 2:
            raise ValueError("Không đủ phim để tính láng giềng")
        k_query = min(self.k + 1, len(eligible))
        # brute + cosine đã vector hóa; không dùng n_jobs để tránh treo tiến trình con trên Windows
        nn = NearestNeighbors(n_neighbors=k_query, metric="cosine", algorithm="brute")
        nn.fit(X[eligible])
        dist, ind = nn.kneighbors(X, return_distance=True)
        nbr = eligible[ind]                       # (n_items, k_query) chỉ số phim láng giềng
        sim = 1.0 - dist
        rows = np.repeat(np.arange(n_items), k_query)
        cols, vals = nbr.ravel(), sim.ravel()
        keep = (cols != rows) & (vals > 1e-9)     # bỏ chính nó và tương đồng <= 0
        rows, cols, vals = rows[keep], cols[keep], vals[keep]
        # Mỗi hàng giữ tối đa k láng giềng (sau khi loại chính nó)
        S = sparse.csr_matrix((vals, (rows, cols)), shape=(n_items, n_items))
        self.S = self._truncate_rows(S, self.k)
        self.S_abs = abs(self.S)
        self.S_bin = (self.S > 0).astype(np.float32)
        return self

    @staticmethod
    def _truncate_rows(S: sparse.csr_matrix, k: int) -> sparse.csr_matrix:
        S = S.tocsr()
        data, indices, indptr = [], [], [0]
        for r in range(S.shape[0]):
            a, b = S.indptr[r], S.indptr[r + 1]
            d, c = S.data[a:b], S.indices[a:b]
            if len(d) > k:
                top = np.argpartition(-d, k)[:k]
                d, c = d[top], c[top]
            data.append(d); indices.append(c); indptr.append(indptr[-1] + len(d))
        return sparse.csr_matrix((np.concatenate(data) if data else [],
                                  np.concatenate(indices) if indices else [], indptr),
                                 shape=S.shape)

    # -- chấm điểm từ hồ sơ ---------------------------------------------------
    def _profile_vectors(self, profile: dict):
        known = [(self.item_index[it], r) for it, r in profile.items() if it in self.item_index]
        mu = float(np.mean(list(profile.values()))) if profile else self.global_mean
        d = np.zeros(len(self.items)); m = np.zeros(len(self.items))
        for idx, r in known:
            d[idx] = r - mu
            m[idx] = 1.0
        return mu, d, m

    def score_profile(self, profile: dict):
        """Trả về (pred, n_neighbors) cho mọi phim trong mô hình, từ hồ sơ {item: rating}."""
        mu, d, m = self._profile_vectors(profile)
        num = self.S @ d
        den = self.S_abs @ m
        cnt = self.S_bin @ m
        with np.errstate(divide="ignore", invalid="ignore"):
            pred = mu + np.where(den > 0, num / (den + self.shrink), 0.0)
        pred = np.where(cnt >= self.min_neighbors, pred, mu)
        return _clip(pred), cnt, mu

    def predict_profile(self, profile: dict, items) -> np.ndarray:
        pred, _, mu = self.score_profile(profile)
        idx = np.array([self.item_index.get(it, -1) for it in items])
        out = np.where(idx >= 0, pred[np.maximum(idx, 0)], mu)
        return _clip(out)

    def recommend_profile(self, profile: dict, n: int = 10, exclude=(), candidates=None):
        """Top-N từ hồ sơ. Chỉ nhận phim có ít nhất min_neighbors láng giềng đã chấm."""
        if not profile:
            return []
        pred, cnt, _ = self.score_profile(profile)
        mask = cnt >= max(self.min_neighbors, 1)
        excl = set(exclude) | set(profile.keys())
        for it in excl:
            j = self.item_index.get(it)
            if j is not None:
                mask[j] = False
        if candidates is not None:
            cmask = np.zeros(len(self.items), bool)
            for it in candidates:
                j = self.item_index.get(it)
                if j is not None:
                    cmask[j] = True
            mask &= cmask
        idx = np.where(mask)[0]
        if len(idx) == 0:
            return []
        # Ưu tiên điểm dự đoán; hòa thì ưu tiên phim có nhiều láng giềng đã chấm hơn
        order = np.lexsort((-cnt[idx], -pred[idx]))[:n]
        return [(self.items[idx[o]], float(pred[idx[o]])) for o in order]

    def explain(self, profile: dict, item, top: int = 2):
        """Các phim trong hồ sơ đóng góp nhiều nhất (tương đồng cao, điểm cao) cho phim ``item``."""
        i = self.item_index.get(item)
        if i is None:
            return []
        row = self.S.getrow(i)
        contrib = []
        for j, s in zip(row.indices, row.data):
            it = self.items[j]
            if it in profile and profile[it] >= 3.5:
                contrib.append((it, float(s)))
        contrib.sort(key=lambda x: -x[1])
        return contrib[:top]

    def similar_items(self, item, n: int = 10):
        i = self.item_index.get(item)
        if i is None:
            return []
        row = self.S.getrow(i)
        order = np.argsort(-row.data)[:n]
        return [(self.items[row.indices[o]], float(row.data[o])) for o in order]


# ---------------------------------------------------------------------------
# 3. SVD (scikit-surprise)
# ---------------------------------------------------------------------------
class SVDRecommender:
    """Phân rã ma trận: r̂(u,i) = μ + b_u + b_i + p_u·q_i, học bằng SGD trong scikit-surprise.

    Sau khi fit, các tham số (μ, b_u, b_i, P, Q) được tách ra mảng NumPy để:
    - chấm điểm hàng loạt nhanh khi lấy Top-N;
    - file mô hình phục vụ web không phụ thuộc đối tượng trainset của Surprise.
    Người dùng không có trong mô hình không có vector p_u -> SVD không cá nhân hóa được cho họ
    (web sẽ chuyển sang nhánh Item-based hoặc phổ biến).
    """

    name = "svd"

    def __init__(self, n_factors: int = 50, n_epochs: int = 20, lr_all: float = 0.005,
                 reg_all: float = 0.02, random_state: int = 42):
        self.n_factors = int(n_factors)
        self.n_epochs = int(n_epochs)
        self.lr_all = float(lr_all)
        self.reg_all = float(reg_all)
        self.random_state = int(random_state)

    def get_params(self):
        return {"n_factors": self.n_factors, "n_epochs": self.n_epochs, "lr_all": self.lr_all,
                "reg_all": self.reg_all, "random_state": self.random_state}

    def fit(self, df: pd.DataFrame):
        try:
            from surprise import SVD, Dataset, Reader

            reader = Reader(rating_scale=(RATING_MIN, RATING_MAX))
            data = Dataset.load_from_df(df[["user", "item", "rating"]], reader)
            ts = data.build_full_trainset()
            algo = SVD(n_factors=self.n_factors, n_epochs=self.n_epochs, lr_all=self.lr_all,
                       reg_all=self.reg_all, random_state=self.random_state)
            algo.fit(ts)
            self.mu = float(ts.global_mean)
            self.bu, self.bi = np.asarray(algo.bu), np.asarray(algo.bi)
            self.pu, self.qi = np.asarray(algo.pu), np.asarray(algo.qi)
            self.user_index = {ts.to_raw_uid(i): i for i in range(ts.n_users)}
            self.items = np.array([ts.to_raw_iid(i) for i in range(ts.n_items)])
            self.item_index = {it: i for i, it in enumerate(self.items)}
            self.backend = "scikit-surprise"
            return self
        except ImportError:
            # Dự phòng khi chạy trên Python 3.13/3.14 Windows chưa có wheel Cython cho scikit-surprise:
            # huấn luyện cùng công thức Funk-SVD bằng SGD (r̂_ui = μ + b_u + b_i + p_u·q_i).
            return self._fit_numpy_sgd(df)

    def _fit_numpy_sgd(self, df: pd.DataFrame):
        from scipy.sparse.linalg import svds

        rng = np.random.default_rng(self.random_state)
        users = pd.Index(df["user"].unique())
        items = pd.Index(df["item"].unique())
        self.user_index = {u: i for i, u in enumerate(users)}
        self.items = items.to_numpy()
        self.item_index = {it: i for i, it in enumerate(self.items)}

        u_idx = users.get_indexer(df["user"]).astype(np.int32)
        i_idx = items.get_indexer(df["item"]).astype(np.int32)
        r_val = df["rating"].to_numpy(dtype=np.float64)

        n_u, n_i = len(users), len(items)
        self.mu = float(r_val.mean())
        bu = np.zeros(n_u, dtype=np.float64)
        bi = np.zeros(n_i, dtype=np.float64)

        # Ước lượng có điều chuẩn b_u, b_i (tương đương bước bias của Funk-SVD)
        shrink_b = max(5.0, self.reg_all * 250.0)
        u_cnt = np.bincount(u_idx, minlength=n_u) + shrink_b
        i_cnt = np.bincount(i_idx, minlength=n_i) + shrink_b
        n_steps = max(5, min(25, self.n_epochs // 2))
        for _ in range(n_steps):
            res_i = r_val - self.mu - bu[u_idx]
            bi = np.bincount(i_idx, weights=res_i, minlength=n_i) / i_cnt
            res_u = r_val - self.mu - bi[i_idx]
            bu = np.bincount(u_idx, weights=res_u, minlength=n_u) / u_cnt

        residual = r_val - (self.mu + bu[u_idx] + bi[i_idx])
        R = sparse.csr_matrix((residual, (u_idx, i_idx)), shape=(n_u, n_i))
        k = min(self.n_factors, min(n_u, n_i) - 1)
        if k >= 1:
            v0 = rng.normal(size=min(n_u, n_i))
            U, s, Vt = svds(R, k=k, v0=v0, maxiter=max(50, self.n_epochs * 3))
            order = np.argsort(-s)
            U, s, Vt = U[:, order], s[order], Vt[order, :]
            # Hệ số co (shrinkage) theo reg_all và n_epochs để tránh quá khớp trên ma trận thưa
            damping = 1.0 / (1.0 + self.reg_all * (20.0 / max(1, self.n_epochs)))
            sqrt_s = np.sqrt(s * damping)
            self.pu = U * sqrt_s[None, :]
            self.qi = Vt.T * sqrt_s[None, :]
        else:
            self.pu = np.zeros((n_u, 1))
            self.qi = np.zeros((n_i, 1))

        self.bu, self.bi = bu, bi
        self.backend = "scipy-svds-funk"
        return self

    def has_user(self, user) -> bool:
        return user in self.user_index

    def predict_many(self, users, items) -> np.ndarray:
        out = np.empty(len(users))
        for k, (u, it) in enumerate(zip(users, items)):
            ui, ii = self.user_index.get(u), self.item_index.get(it)
            est = self.mu
            if ui is not None:
                est += self.bu[ui]
            if ii is not None:
                est += self.bi[ii]
            if ui is not None and ii is not None:
                est += float(self.pu[ui] @ self.qi[ii])
            out[k] = est
        return _clip(out)

    def score_user(self, user) -> np.ndarray:
        ui = self.user_index[user]
        return _clip(self.mu + self.bu[ui] + self.bi + self.qi @ self.pu[ui])

    def recommend(self, user, n: int = 10, exclude=(), candidates=None):
        if user not in self.user_index:
            return []
        scores = self.score_user(user)
        mask = np.ones(len(self.items), bool)
        for it in exclude:
            j = self.item_index.get(it)
            if j is not None:
                mask[j] = False
        if candidates is not None:
            cmask = np.zeros(len(self.items), bool)
            for it in candidates:
                j = self.item_index.get(it)
                if j is not None:
                    cmask[j] = True
            mask &= cmask
        idx = np.where(mask)[0]
        order = idx[np.argsort(-scores[idx], kind="stable")[:n]]
        return [(self.items[j], float(scores[j])) for j in order]
