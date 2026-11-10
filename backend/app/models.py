"""Mô hình dữ liệu (SQLAlchemy 2.0).

Nhóm bảng:
- Tài khoản:       roles, users
- Danh mục phim:   movies, genres, movie_genres, movie_links
- Tương tác web:   ratings, watchlist_items
- Dữ liệu nguồn:   dataset_versions, dataset_ratings, import_jobs
- Mô hình:         model_versions, training_runs
- Kết quả:         evaluation_results, recommendation_events

Lưu ý quan trọng: người dùng MovieLens (dataset_ratings.source_user_id) KHÔNG phải tài khoản web
(users.id). Hai nguồn được tách bảng và mang namespace khác nhau khi train ("ml:<id>" / "web:<id>").
"""
from datetime import datetime, timezone

from sqlalchemy import (JSON, Boolean, CheckConstraint, Column, DateTime, Float, ForeignKey,
                        Index, Integer, String, Table, Text, UniqueConstraint)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .database import Base


def utcnow() -> datetime:
    """Thời điểm UTC dạng naive (thống nhất giữa PostgreSQL và SQLite khi test)."""
    return datetime.now(timezone.utc).replace(tzinfo=None)


# ---------------------------------------------------------------- Tài khoản
class Role(Base):
    __tablename__ = "roles"
    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(20), unique=True)  # user | admin
    description: Mapped[str | None] = mapped_column(String(200))


class User(Base):
    __tablename__ = "users"
    id: Mapped[int] = mapped_column(primary_key=True)
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True)
    username: Mapped[str] = mapped_column(String(50), unique=True, index=True)
    full_name: Mapped[str | None] = mapped_column(String(120))
    password_hash: Mapped[str] = mapped_column(String(255))
    role_id: Mapped[int] = mapped_column(ForeignKey("roles.id"))
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow)
    # Thời điểm thay đổi đánh giá gần nhất: dùng để biết mô hình SVD đã "thấy" hồ sơ này chưa
    ratings_updated_at: Mapped[datetime | None] = mapped_column(DateTime)

    role: Mapped[Role] = relationship(lazy="joined")

    @property
    def role_name(self) -> str:
        return self.role.name if self.role else "user"


# ---------------------------------------------------------------- Danh mục phim
movie_genres = Table(
    "movie_genres", Base.metadata,
    Column("movie_id", ForeignKey("movies.id", ondelete="CASCADE"), primary_key=True),
    Column("genre_id", ForeignKey("genres.id", ondelete="CASCADE"), primary_key=True),
)


class Genre(Base):
    __tablename__ = "genres"
    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(50), unique=True)


class Movie(Base):
    __tablename__ = "movies"
    id: Mapped[int] = mapped_column(primary_key=True)
    movielens_id: Mapped[int | None] = mapped_column(Integer, unique=True, index=True)
    title: Mapped[str] = mapped_column(String(300), index=True)
    year: Mapped[int | None] = mapped_column(Integer, index=True)
    overview: Mapped[str | None] = mapped_column(Text)
    poster_url: Mapped[str | None] = mapped_column(String(500))
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    # Thống kê phi chuẩn hóa (MovieLens + web) để liệt kê/sắp xếp nhanh; cập nhật khi chấm điểm
    rating_count: Mapped[int] = mapped_column(Integer, default=0)
    rating_sum: Mapped[float] = mapped_column(Float, default=0.0)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow)

    genres: Mapped[list[Genre]] = relationship(secondary=movie_genres, lazy="selectin")
    link: Mapped["MovieLink | None"] = relationship(back_populates="movie", uselist=False,
                                                    lazy="selectin", cascade="all, delete-orphan")

    @property
    def rating_avg(self) -> float | None:
        return round(self.rating_sum / self.rating_count, 2) if self.rating_count else None


class MovieLink(Base):
    __tablename__ = "movie_links"
    movie_id: Mapped[int] = mapped_column(ForeignKey("movies.id", ondelete="CASCADE"), primary_key=True)
    imdb_id: Mapped[str | None] = mapped_column(String(20))
    tmdb_id: Mapped[int | None] = mapped_column(Integer)
    movie: Mapped[Movie] = relationship(back_populates="link")


# ---------------------------------------------------------------- Tương tác web
class Rating(Base):
    __tablename__ = "ratings"
    __table_args__ = (
        UniqueConstraint("user_id", "movie_id", name="uq_rating_user_movie"),
        CheckConstraint("score >= 0.5 AND score <= 5.0", name="ck_rating_range"),
        CheckConstraint("CAST(score * 2 AS INTEGER) = score * 2", name="ck_rating_half_step"),
    )
    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    movie_id: Mapped[int] = mapped_column(ForeignKey("movies.id", ondelete="CASCADE"), index=True)
    score: Mapped[float] = mapped_column(Float)
    comment: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow, onupdate=utcnow)
    movie: Mapped[Movie] = relationship(lazy="joined")
    user: Mapped[User] = relationship(lazy="joined")


class WatchlistItem(Base):
    __tablename__ = "watchlist_items"
    __table_args__ = (UniqueConstraint("user_id", "movie_id", name="uq_watchlist_user_movie"),)
    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    movie_id: Mapped[int] = mapped_column(ForeignKey("movies.id", ondelete="CASCADE"))
    note: Mapped[str | None] = mapped_column(String(300))
    added_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow)
    movie: Mapped[Movie] = relationship(lazy="joined")


# ---------------------------------------------------------------- Dữ liệu nguồn
class DatasetVersion(Base):
    __tablename__ = "dataset_versions"
    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(100))
    source: Mapped[str | None] = mapped_column(String(300))
    file_sha256: Mapped[str] = mapped_column(String(64), unique=True)
    n_movies: Mapped[int] = mapped_column(Integer, default=0)
    n_ratings: Mapped[int] = mapped_column(Integer, default=0)
    n_users: Mapped[int] = mapped_column(Integer, default=0)
    imported_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow)


class DatasetRating(Base):
    """Đánh giá gốc MovieLens. source_user_id là ID ẩn danh của MovieLens, không phải users.id."""
    __tablename__ = "dataset_ratings"
    __table_args__ = (UniqueConstraint("dataset_version_id", "source_user_id", "movie_id",
                                       name="uq_dsrating"),)
    id: Mapped[int] = mapped_column(primary_key=True)
    dataset_version_id: Mapped[int] = mapped_column(ForeignKey("dataset_versions.id", ondelete="CASCADE"),
                                                    index=True)
    source_user_id: Mapped[int] = mapped_column(Integer)
    movie_id: Mapped[int] = mapped_column(ForeignKey("movies.id", ondelete="CASCADE"), index=True)
    score: Mapped[float] = mapped_column(Float)
    rated_at: Mapped[datetime | None] = mapped_column(DateTime)


class ImportJob(Base):
    __tablename__ = "import_jobs"
    id: Mapped[int] = mapped_column(primary_key=True)
    status: Mapped[str] = mapped_column(String(20), default="pending")  # pending|running|succeeded|failed
    source: Mapped[str | None] = mapped_column(String(300))
    dataset_version_id: Mapped[int | None] = mapped_column(ForeignKey("dataset_versions.id", ondelete="SET NULL"))
    rows_ok: Mapped[int] = mapped_column(Integer, default=0)
    rows_error: Mapped[int] = mapped_column(Integer, default=0)
    message: Mapped[str | None] = mapped_column(Text)
    created_by: Mapped[int | None] = mapped_column(ForeignKey("users.id", ondelete="SET NULL"))
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow)
    finished_at: Mapped[datetime | None] = mapped_column(DateTime)


# ---------------------------------------------------------------- Mô hình
class ModelVersion(Base):
    __tablename__ = "model_versions"
    id: Mapped[int] = mapped_column(primary_key=True)
    version: Mapped[str] = mapped_column(String(40), unique=True)
    path: Mapped[str] = mapped_column(String(500))
    status: Mapped[str] = mapped_column(String(20), default="ready")  # ready|active|archived
    params: Mapped[dict | None] = mapped_column(JSON)
    validation: Mapped[dict | None] = mapped_column(JSON)
    n_users: Mapped[int] = mapped_column(Integer, default=0)
    n_items: Mapped[int] = mapped_column(Integer, default=0)
    n_ratings: Mapped[int] = mapped_column(Integer, default=0)
    trained_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow)
    activated_at: Mapped[datetime | None] = mapped_column(DateTime)


Index("ix_model_versions_status", ModelVersion.status)


class TrainingRun(Base):
    __tablename__ = "training_runs"
    id: Mapped[int] = mapped_column(primary_key=True)
    status: Mapped[str] = mapped_column(String(20), default="pending")  # pending|running|succeeded|failed
    params: Mapped[dict | None] = mapped_column(JSON)
    auto_activate: Mapped[bool] = mapped_column(Boolean, default=True)
    message: Mapped[str | None] = mapped_column(Text)
    model_version_id: Mapped[int | None] = mapped_column(ForeignKey("model_versions.id", ondelete="SET NULL"))
    created_by: Mapped[int | None] = mapped_column(ForeignKey("users.id", ondelete="SET NULL"))
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow)
    started_at: Mapped[datetime | None] = mapped_column(DateTime)
    finished_at: Mapped[datetime | None] = mapped_column(DateTime)
    model_version: Mapped[ModelVersion | None] = relationship(lazy="joined")


# ---------------------------------------------------------------- Kết quả
class EvaluationResult(Base):
    __tablename__ = "evaluation_results"
    __table_args__ = (UniqueConstraint("run_id", "method", "split", name="uq_eval_run_method"),)
    id: Mapped[int] = mapped_column(primary_key=True)
    run_id: Mapped[str] = mapped_column(String(40), index=True)
    method: Mapped[str] = mapped_column(String(20))
    split: Mapped[str] = mapped_column(String(10), default="test")
    params: Mapped[dict | None] = mapped_column(JSON)
    rmse: Mapped[float | None] = mapped_column(Float)
    mae: Mapped[float | None] = mapped_column(Float)
    precision_at_10: Mapped[float | None] = mapped_column(Float)
    recall_at_10: Mapped[float | None] = mapped_column(Float)
    extra: Mapped[dict | None] = mapped_column(JSON)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow)


class RecommendationEvent(Base):
    __tablename__ = "recommendation_events"
    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int | None] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    requested_method: Mapped[str] = mapped_column(String(20))
    served_method: Mapped[str] = mapped_column(String(20))
    model_version: Mapped[str | None] = mapped_column(String(40))
    fallback: Mapped[bool] = mapped_column(Boolean, default=False)
    n_items: Mapped[int] = mapped_column(Integer, default=0)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow, index=True)
