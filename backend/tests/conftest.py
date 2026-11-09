"""Cấu hình test: SQLite tạm + dữ liệu MovieLens tổng hợp nhỏ (không cần PostgreSQL / Internet)."""
import os
import sys
import tempfile
from pathlib import Path

import numpy as np
import pandas as pd
import pytest

TMP = Path(tempfile.mkdtemp(prefix="movierec_test_"))
os.environ["DATABASE_URL"] = f"sqlite:///{(TMP / 'test.db').as_posix()}"
os.environ["JWT_SECRET"] = "test-secret-key-that-is-long-enough-123456"
os.environ["ARTIFACTS_DIR"] = str(TMP / "artifacts")
os.environ["DATA_DIR"] = str(TMP / "data")
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from fastapi.testclient import TestClient  # noqa: E402

from app.database import Base, SessionLocal, engine  # noqa: E402
from app.main import app  # noqa: E402
from app.scripts.seed import create_user, ensure_roles  # noqa: E402


def make_fake_movielens(path: Path, n_users=60, n_movies=80, seed=0):
    """Hai nhóm sở thích: nhóm A thích phim 0-39, nhóm B thích phim 40-79."""
    rng = np.random.default_rng(seed)
    path.mkdir(parents=True, exist_ok=True)
    genres = ["Action|Sci-Fi"] * 40 + ["Romance|Drama"] * 40
    pd.DataFrame({"movieId": range(1, n_movies + 1),
                  "title": [f"Movie {i} ({1990 + i % 30})" for i in range(1, n_movies + 1)],
                  "genres": genres}).to_csv(path / "movies.csv", index=False)
    rows = []
    for u in range(1, n_users + 1):
        group_a = u % 2 == 0
        for m in rng.choice(n_movies, size=30, replace=False):
            likes = (m < 40) == group_a
            score = rng.choice([4.0, 4.5, 5.0]) if likes else rng.choice([1.0, 1.5, 2.0])
            rows.append((u, m + 1, score, 1_000_000 + len(rows)))
    rows.append((1, 1, 9.0, 1))  # điểm sai thang -> phải bị loại khi làm sạch
    pd.DataFrame(rows, columns=["userId", "movieId", "rating", "timestamp"]).to_csv(path / "ratings.csv", index=False)
    pd.DataFrame({"movieId": range(1, n_movies + 1), "imdbId": range(100, 100 + n_movies),
                  "tmdbId": range(500, 500 + n_movies)}).to_csv(path / "links.csv", index=False)
    return path


@pytest.fixture(scope="session")
def client():
    Base.metadata.create_all(engine)
    with SessionLocal() as db:
        ensure_roles(db)
        create_user(db, "admin@test.local", "admin", "Admin@123", "admin")
    with TestClient(app) as c:
        yield c


@pytest.fixture(scope="session")
def dataset_dir():
    return make_fake_movielens(TMP / "data" / "raw" / "ml-latest-small")


def register(client, name):
    r = client.post("/api/auth/register", json={"email": f"{name}@test.local", "username": name,
                                                "password": "secret123"})
    assert r.status_code == 201, r.text
    return {"Authorization": f"Bearer {r.json()['access_token']}"}


def login(client, ident, password):
    r = client.post("/api/auth/login", data={"username": ident, "password": password})
    assert r.status_code == 200, r.text
    return {"Authorization": f"Bearer {r.json()['access_token']}"}
