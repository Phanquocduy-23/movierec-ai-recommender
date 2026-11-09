"""Cập nhật poster_url (từ IMDb ID qua Metahub CDN) và chuẩn hóa tiêu đề phim cho toàn bộ CSDL."""
import sys
from pathlib import Path

from sqlalchemy import select

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "backend"))
sys.path.insert(0, str(ROOT))

from app.database import SessionLocal  # noqa: E402
from app.models import Movie  # noqa: E402
from app.services.importer import imdb_poster_url, normalize_article  # noqa: E402


def main():
    if hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(encoding="utf-8")
    updated_posters = 0
    updated_titles = 0
    with SessionLocal() as db:
        movies = db.scalars(select(Movie)).all()
        for m in movies:
            new_title = normalize_article(m.title)
            if new_title != m.title:
                m.title = new_title
                updated_titles += 1
            if not m.poster_url and m.link and m.link.imdb_id:
                m.poster_url = imdb_poster_url(m.link.imdb_id)
                updated_posters += 1
        db.commit()
    print(f"Đã cập nhật poster thực cho {updated_posters} phim và chuẩn hóa tên {updated_titles} phim.")


if __name__ == "__main__":
    main()
