"""Kiểm thử rủi ro thực tế (Bước 20) - chạy: cd backend && pytest -q"""
import importlib.util
import time

import pytest

from conftest import login, register

HAS_SURPRISE = importlib.util.find_spec("surprise") is not None


def test_health(client):
    assert client.get("/api/health").json()["status"] == "ok"


def test_register_duplicate_and_wrong_password(client):
    register(client, "alice")
    r = client.post("/api/auth/register", json={"email": "alice@test.local", "username": "alice2",
                                                "password": "secret123"})
    assert r.status_code == 409
    r = client.post("/api/auth/login", data={"username": "alice", "password": "wrong"})
    assert r.status_code == 401
    assert "password" not in r.text.lower() or "secret123" not in r.text
    me = client.get("/api/auth/me", headers=login(client, "alice@test.local", "secret123")).json()
    assert me["role_name"] == "user" and "password_hash" not in me


def test_invalid_token_rejected(client):
    assert client.get("/api/auth/me", headers={"Authorization": "Bearer abc.def.ghi"}).status_code == 401
    assert client.get("/api/auth/me").status_code == 401


def test_user_cannot_access_admin(client):
    h = register(client, "bob")
    assert client.get("/api/admin/stats", headers=h).status_code == 403
    assert client.post("/api/admin/train", json={}, headers=h).status_code == 403


def test_import_idempotent(client, dataset_dir):
    admin = login(client, "admin", "Admin@123")
    r = client.post("/api/admin/import", headers=admin)
    assert r.status_code == 202, r.text
    jobs = client.get("/api/admin/import-jobs", headers=admin).json()
    assert jobs[0]["status"] == "succeeded", jobs[0]
    assert jobs[0]["rows_error"] == 1  # dòng điểm 9.0 bị loại
    total = client.get("/api/movies").json()["total"]
    assert total == 80
    # Nhập lại cùng file -> thất bại, không nhân đôi
    client.post("/api/admin/import", headers=admin)
    jobs = client.get("/api/admin/import-jobs", headers=admin).json()
    assert jobs[0]["status"] == "failed" and "SHA-256" in jobs[0]["message"]
    assert client.get("/api/movies").json()["total"] == 80


def test_wrong_upload_rejected(client):
    admin = login(client, "admin", "Admin@123")
    r = client.post("/api/admin/import", headers=admin, files={"file": ("x.zip", b"not a zip", "application/zip")})
    assert r.status_code == 422


def test_rating_scale_and_update(client, dataset_dir):
    h = register(client, "carol")
    mid = client.get("/api/movies").json()["items"][0]["id"]
    for bad in (0, 5.5, 3.3):
        assert client.put(f"/api/ratings/{mid}", json={"score": bad}, headers=h).status_code == 422
    assert client.put(f"/api/ratings/{mid}", json={"score": 4}, headers=h).status_code == 200
    assert client.put(f"/api/ratings/{mid}", json={"score": 2.5}, headers=h).json()["score"] == 2.5
    mine = client.get("/api/ratings/me", headers=h).json()
    assert mine["total"] == 1 and mine["items"][0]["score"] == 2.5
    assert client.put("/api/ratings/999999", json={"score": 4}, headers=h).status_code == 404


def test_no_cross_user_access(client, dataset_dir):
    h1, h2 = register(client, "dave"), register(client, "erin")
    mid = client.get("/api/movies").json()["items"][1]["id"]
    client.put(f"/api/ratings/{mid}", json={"score": 5}, headers=h1)
    client.post(f"/api/watchlist/{mid}", headers=h1)
    # erin không thấy và không xóa được dữ liệu của dave
    assert client.get("/api/ratings/me", headers=h2).json()["total"] == 0
    assert client.get("/api/watchlist", headers=h2).json() == []
    assert client.delete(f"/api/ratings/{mid}", headers=h2).status_code == 404
    assert client.delete(f"/api/watchlist/{mid}", headers=h2).status_code == 404
    assert len(client.get("/api/watchlist", headers=h1).json()) == 1


def test_new_user_gets_fallback_without_model(client, dataset_dir):
    h = register(client, "frank")
    r = client.get("/api/recommendations", headers=h).json()
    assert r["fallback"] is True and r["served_method"] == "popular" and len(r["items"]) == 10


def test_training_and_personalization(client, dataset_dir):
    admin = login(client, "admin", "Admin@123")
    r = client.post("/api/admin/train", json={"svd_factors": 10, "svd_epochs": 10}, headers=admin)
    assert r.status_code == 202
    runs = client.get("/api/admin/training-runs", headers=admin).json()
    assert runs[0]["status"] == "succeeded", runs[0]["message"]
    models = client.get("/api/admin/models", headers=admin).json()
    assert models[0]["status"] == "active"

    movies = {m["title"]: m["id"] for m in client.get("/api/movies?size=100").json()["items"]}
    ha, hb = register(client, "fan_a"), register(client, "fan_b")
    for i in range(1, 9):
        client.put(f"/api/ratings/{movies[f'Movie {i}']}", json={"score": 5}, headers=ha)
        client.put(f"/api/ratings/{movies[f'Movie {40 + i}']}", json={"score": 5}, headers=hb)
    ra = client.get("/api/recommendations", headers=ha).json()
    rb = client.get("/api/recommendations", headers=hb).json()
    # Tài khoản mới chưa có trong SVD -> nhánh Item-based từ hồ sơ hiện tại
    assert ra["served_method"] == "item_knn" and rb["served_method"] == "item_knn"
    ids_a = {it["movie"]["id"] for it in ra["items"]}
    ids_b = {it["movie"]["id"] for it in rb["items"]}
    assert ids_a != ids_b
    rated_a = {movies[f"Movie {i}"] for i in range(1, 9)}
    assert not (ids_a & rated_a)  # không lặp phim đã đánh giá
    # Gu nhóm A -> đa số gợi ý thuộc phim 1-40
    assert sum(1 for it in ra["items"] if int(it["movie"]["title"].split()[1]) <= 40) >= 7

    # Train lại -> fan_a có trong SVD
    time.sleep(1.1)
    client.post("/api/admin/train", json={"svd_factors": 10, "svd_epochs": 10}, headers=admin)
    ra2 = client.get("/api/recommendations", headers=ha).json()
    assert ra2["served_method"] == "svd" and ra2["model_version"] != ra["model_version"]
    # Sửa điểm -> chưa học vào SVD, auto chuyển sang Item-based
    client.put(f"/api/ratings/{movies['Movie 1']}", json={"score": 4.5}, headers=ha)
    ra3 = client.get("/api/recommendations", headers=ha).json()
    assert ra3["served_method"] == "item_knn"

    # Quay lại bản trước (rollback)
    old = client.get("/api/admin/models", headers=admin).json()[1]
    assert client.post(f"/api/admin/models/{old['id']}/activate", headers=admin).json()["status"] == "active"
    sim = client.get(f"/api/movies/{movies['Movie 1']}/similar").json()
    assert sim["source"] == "item_knn" and len(sim["items"]) > 0
