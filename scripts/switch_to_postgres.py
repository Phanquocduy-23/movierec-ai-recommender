"""Tiện ích chuyển đổi nhanh giữa SQLite và PostgreSQL (pgAdmin 4) cho Đồ án cơ sở 2.

Cách dùng:
  # Chuyển sang PostgreSQL (tự động tạo DB 'movierec', chạy Alembic migration và seed dữ liệu):
  python scripts/switch_to_postgres.py --password <mat_khau_postgres_cua_ban>

  # Chuyển về lại SQLite:
  python scripts/switch_to_postgres.py --sqlite
"""
from __future__ import annotations

import argparse
import subprocess
import sys
from pathlib import Path

try:
    sys.stdout.reconfigure(encoding="utf-8")
except Exception:
    pass

ROOT = Path(__file__).resolve().parents[1]
ENV_FILE = ROOT / "backend" / ".env"


def set_env_db(db_url: str) -> None:
    lines = []
    if ENV_FILE.exists():
        lines = ENV_FILE.read_text(encoding="utf-8").splitlines()
    found = False
    new_lines = []
    for line in lines:
        if line.strip().startswith("DATABASE_URL="):
            new_lines.append(f"DATABASE_URL={db_url}")
            found = True
        else:
            new_lines.append(line)
    if not found:
        new_lines.insert(0, f"DATABASE_URL={db_url}")
    ENV_FILE.write_text("\n".join(new_lines) + "\n", encoding="utf-8")


def main() -> int:
    parser = argparse.ArgumentParser(description="Chuyển đổi CSDL giữa SQLite và PostgreSQL")
    parser.add_argument("--user", default="postgres", help="Username PostgreSQL (mặc định: postgres)")
    parser.add_argument("--password", default="", help="Mật khẩu PostgreSQL của bạn")
    parser.add_argument("--host", default="localhost", help="Host PostgreSQL (mặc định: localhost)")
    parser.add_argument("--port", default=5432, type=int, help="Port PostgreSQL (mặc định: 5432)")
    parser.add_argument("--dbname", default="movierec", help="Tên database (mặc định: movierec)")
    parser.add_argument("--sqlite", action="store_true", help="Quay về chế độ SQLite local")
    args = parser.parse_args()

    if args.sqlite:
        sqlite_path = (ROOT / "data" / "movierec.db").as_posix()
        url = f"sqlite:///{sqlite_path}"
        set_env_db(url)
        print(f"[OK] Đã chuyển backend/.env về SQLite: {url}")
        return 0

    if not args.password:
        print("Vui lòng truyền mật khẩu PostgreSQL: python scripts/switch_to_postgres.py --password <MAT_KHAU>")
        return 1

    try:
        import psycopg
    except ImportError:
        print("Đang cài đặt psycopg[binary]...")
        subprocess.run([sys.executable, "-m", "pip", "install", "psycopg[binary]"], check=True)
        import psycopg

    print(f"[1/4] Đang kết nối tới PostgreSQL tại {args.host}:{args.port}...")
    admin_conn_str = f"host={args.host} port={args.port} dbname=postgres user={args.user} password={args.password}"
    with psycopg.connect(admin_conn_str, autocommit=True) as conn:
        with conn.cursor() as cur:
            cur.execute("SELECT 1 FROM pg_database WHERE datname = %s", (args.dbname,))
            if not cur.fetchone():
                cur.execute(f'CREATE DATABASE "{args.dbname}" ENCODING \'UTF8\'')
                print(f"  -> Đã khởi tạo database '{args.dbname}' thành công.")
            else:
                print(f"  -> Database '{args.dbname}' đã tồn tại.")

    db_url = f"postgresql+psycopg://{args.user}:{args.password}@{args.host}:{args.port}/{args.dbname}"
    set_env_db(db_url)
    print(f"[2/4] Đã cập nhật DATABASE_URL trong backend/.env")

    print("[3/4] Đang chạy Alembic migration tạo 14 bảng trên PostgreSQL...")
    subprocess.run(
        [sys.executable, "-m", "alembic", "upgrade", "head"],
        cwd=str(ROOT / "backend"),
        check=True,
    )

    print("[4/4] Đang nạp dữ liệu MovieLens, tạo tài khoản mẫu & đồng bộ poster IMDb...")
    subprocess.run(
        [sys.executable, str(ROOT / "scripts" / "setup_and_seed.py")],
        cwd=str(ROOT),
        check=True,
    )
    subprocess.run(
        [sys.executable, str(ROOT / "scripts" / "update_posters.py")],
        cwd=str(ROOT),
        check=True,
    )
    print("\n[HOÀN TẤT] Hệ thống đã chạy hoàn toàn trên PostgreSQL!")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
