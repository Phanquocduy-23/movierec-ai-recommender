"""Khởi tạo dữ liệu chạy demo.

  python -m app.scripts.seed import            # nhập data/raw/ml-latest-small
  python -m app.scripts.seed admin             # tạo admin (admin@movierec.local / Admin@123)
  python -m app.scripts.seed demo              # tạo 2 tài khoản demo có gu khác nhau
  python -m app.scripts.seed train             # huấn luyện + phát hành mô hình (đồng bộ, không qua API)
  python -m app.scripts.seed all               # chạy tất cả theo thứ tự
"""
import sys
from pathlib import Path

from sqlalchemy import select

from ..database import Base, SessionLocal, engine
from ..models import Genre, Movie, Rating, Role, TrainingRun, User, utcnow
from ..security import hash_password
from ..services.importer import default_dataset_dir, import_movielens_dir


def ensure_roles(db):
    for name, desc in (("user", "Người dùng"), ("admin", "Quản trị viên")):
        if not db.scalar(select(Role).where(Role.name == name)):
            db.add(Role(name=name, description=desc))
    db.commit()


def create_user(db, email, username, password, role="user", full_name=None):
    u = db.scalar(select(User).where(User.email == email))
    if u:
        print(f"- {email} đã tồn tại")
        return u
    role_id = db.scalar(select(Role.id).where(Role.name == role))
    u = User(email=email, username=username, full_name=full_name, password_hash=hash_password(password),
             role_id=role_id)
    db.add(u)
    db.commit()
    print(f"+ Tạo {role}: {email} / {password}")
    return u


def rate_genre(db, user, genre, score, limit):
    g = db.scalar(select(Genre).where(Genre.name == genre))
    if not g:
        return 0
    movies = db.scalars(select(Movie).where(Movie.genres.any(Genre.id == g.id), Movie.rating_count >= 40)
                        .order_by(Movie.rating_count.desc()).limit(limit * 3)).all()
    n = 0
    for m in movies:
        if n >= limit:
            break
        if db.scalar(select(Rating).where(Rating.user_id == user.id, Rating.movie_id == m.id)):
            continue
        db.add(Rating(user_id=user.id, movie_id=m.id, score=score))
        m.rating_count += 1
        m.rating_sum += score
        n += 1
    user.ratings_updated_at = utcnow()
    db.commit()
    return n


def cmd_import(db):
    src = default_dataset_dir()
    try:
        dv = import_movielens_dir(db, Path(src))
        print(f"+ Đã nhập {dv.n_ratings} đánh giá, {dv.n_movies} phim từ {src}")
    except ValueError as e:
        print(f"- {e}")


def cmd_admin(db):
    create_user(db, "admin@movierec.local", "admin", "Admin@123", "admin", "Quản trị viên")


def cmd_demo(db):
    a = create_user(db, "action@movierec.local", "demo_action", "Demo@123", full_name="Fan phim hành động")
    r = create_user(db, "romance@movierec.local", "demo_romance", "Demo@123", full_name="Fan phim tình cảm")
    create_user(db, "newbie@movierec.local", "demo_new", "Demo@123", full_name="Người dùng mới (chưa chấm)")
    print("  demo_action:", rate_genre(db, a, "Action", 5.0, 8) + rate_genre(db, a, "Sci-Fi", 4.5, 8)
          + rate_genre(db, a, "Romance", 1.5, 4), "điểm")
    print("  demo_romance:", rate_genre(db, r, "Romance", 5.0, 8) + rate_genre(db, r, "Drama", 4.5, 6)
          + rate_genre(db, r, "Horror", 1.0, 4), "điểm")


def cmd_train(db):
    from ..services.training import run_training
    run = TrainingRun(params={}, auto_activate=True)
    db.add(run)
    db.commit()
    print("… Đang huấn luyện (có thể mất 1-2 phút)")
    run_training(run.id)
    db.expire_all()
    run = db.get(TrainingRun, run.id)
    print(f"{'+' if run.status == 'succeeded' else '-'} {run.status}: {run.message}")


def main():
    if hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(encoding="utf-8")
    cmd = sys.argv[1] if len(sys.argv) > 1 else "all"
    Base.metadata.create_all(engine)
    with SessionLocal() as db:
        ensure_roles(db)
        steps = {"import": [cmd_import], "admin": [cmd_admin], "demo": [cmd_demo], "train": [cmd_train],
                 "all": [cmd_import, cmd_admin, cmd_demo, cmd_train]}[cmd]
        for s in steps:
            s(db)


if __name__ == "__main__":
    main()
