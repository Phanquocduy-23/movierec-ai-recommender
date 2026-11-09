"""Thiết lập tự động dữ liệu MovieLens, thực nghiệm AI, CSDL và mô hình phục vụ Web."""
import os
import subprocess
import sys
from pathlib import Path

from sqlalchemy import create_engine, text

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")
os.environ["PYTHONUTF8"] = "1"
os.environ["PYTHONIOENCODING"] = "utf-8"

ROOT = Path(__file__).resolve().parents[1]
BACKEND = ROOT / "backend"
ENV_FILE = BACKEND / ".env"


def ensure_database_url() -> str:
    pg_url = "postgresql+psycopg2://movierec:movierec@localhost:5432/movierec"
    try:
        eng = create_engine(pg_url, connect_args={"connect_timeout": 3})
        with eng.connect() as conn:
            conn.execute(text("SELECT 1"))
        print("[DB] Kết nối thành công PostgreSQL: movierec@localhost:5432/movierec")
        return pg_url
    except Exception:
        pass

    # Thử tự động tạo user/database movierec nếu tài khoản postgres dùng mật khẩu mặc định
    for pwd in ("postgres", "123456", "admin", "root", "1234"):
        try:
            admin_url = f"postgresql+psycopg2://postgres:{pwd}@localhost:5432/postgres"
            eng = create_engine(admin_url, isolation_level="AUTOCOMMIT", connect_args={"connect_timeout": 2})
            with eng.connect() as conn:
                exists_user = conn.execute(text("SELECT 1 FROM pg_roles WHERE rolname='movierec'")).scalar()
                if not exists_user:
                    conn.execute(text("CREATE USER movierec WITH PASSWORD 'movierec'"))
                exists_db = conn.execute(text("SELECT 1 FROM pg_database WHERE datname='movierec'")).scalar()
                if not exists_db:
                    conn.execute(text("CREATE DATABASE movierec OWNER movierec"))
            print("[DB] Đã tự động khởi tạo database PostgreSQL 'movierec'!")
            return pg_url
        except Exception:
            continue

    sqlite_path = (ROOT / "data" / "movierec.db").as_posix()
    sqlite_url = f"sqlite:///{sqlite_path}"
    print(f"[DB] PostgreSQL cần mật khẩu riêng của máy -> tạm dùng SQLite tại {sqlite_path} để chạy thử ngay.")
    return sqlite_url


def main():
    py = sys.executable
    db_url = ensure_database_url()
    ENV_FILE.write_text(
        f"# Để dùng PostgreSQL: tạo user/db movierec và bỏ comment dòng dưới\n"
        f"# DATABASE_URL=postgresql+psycopg2://movierec:movierec@localhost:5432/movierec\n"
        f"DATABASE_URL={db_url}\n"
        f"JWT_SECRET=movierec-secret-key-phan-quoc-duy-235019-dh23tin05-2026\n"
        f"JWT_EXPIRE_MINUTES=120\n"
        f"CORS_ORIGINS=http://localhost:5173,http://127.0.0.1:5173\n",
        encoding="utf-8",
    )

    print("\n=== 1. Tải bộ dữ liệu MovieLens ml-latest-small ===")
    subprocess.run([py, str(ROOT / "ml/download_data.py")], cwd=ROOT, check=True)

    print("\n=== 2. Làm sạch dữ liệu, chạy EDA và chia tập Train/Val/Test ===")
    subprocess.run([py, str(ROOT / "ml/prepare_data.py")], cwd=ROOT, check=True)

    print("\n=== 3. Chạy thực nghiệm đánh giá 3 phương pháp (Popular, Item-KNN, SVD) ===")
    subprocess.run([py, str(ROOT / "ml/train_evaluate.py"), "--quick"], cwd=ROOT, check=True)

    print("\n=== 4. Khởi tạo CSDL, nhập dữ liệu, tạo tài khoản demo & huấn luyện mô hình Web ===")
    subprocess.run([py, "-m", "app.scripts.seed", "all"], cwd=BACKEND, check=True)
    print("\n=== HOÀN TẤT THIẾT LẬP! ===")


if __name__ == "__main__":
    main()
