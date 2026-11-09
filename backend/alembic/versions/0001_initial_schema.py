"""Initial schema - 14 tables across 6 functional groups.

Revision ID: 0001_initial
Revises:
Create Date: 2026-11-09 00:00:00
"""
from alembic import op
import sqlalchemy as sa

revision = "0001_initial"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "roles",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("name", sa.String(length=20), nullable=False, unique=True),
        sa.Column("description", sa.String(length=200), nullable=True),
    )

    op.create_table(
        "users",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("email", sa.String(length=255), nullable=False, unique=True),
        sa.Column("username", sa.String(length=50), nullable=False, unique=True),
        sa.Column("full_name", sa.String(length=120), nullable=True),
        sa.Column("password_hash", sa.String(length=255), nullable=False),
        sa.Column("role_id", sa.Integer(), sa.ForeignKey("roles.id"), nullable=False),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("ratings_updated_at", sa.DateTime(), nullable=True),
    )
    op.create_index("ix_users_email", "users", ["email"], unique=True)
    op.create_index("ix_users_username", "users", ["username"], unique=True)

    op.create_table(
        "genres",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("name", sa.String(length=50), nullable=False, unique=True),
    )

    op.create_table(
        "movies",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("movielens_id", sa.Integer(), nullable=True, unique=True),
        sa.Column("title", sa.String(length=300), nullable=False),
        sa.Column("year", sa.Integer(), nullable=True),
        sa.Column("overview", sa.Text(), nullable=True),
        sa.Column("poster_url", sa.String(length=500), nullable=True),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column("rating_count", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("rating_sum", sa.Float(), nullable=False, server_default="0.0"),
        sa.Column("created_at", sa.DateTime(), nullable=False),
    )
    op.create_index("ix_movies_movielens_id", "movies", ["movielens_id"], unique=True)
    op.create_index("ix_movies_title", "movies", ["title"])
    op.create_index("ix_movies_year", "movies", ["year"])

    op.create_table(
        "movie_genres",
        sa.Column("movie_id", sa.Integer(), sa.ForeignKey("movies.id", ondelete="CASCADE"), primary_key=True),
        sa.Column("genre_id", sa.Integer(), sa.ForeignKey("genres.id", ondelete="CASCADE"), primary_key=True),
    )

    op.create_table(
        "movie_links",
        sa.Column("movie_id", sa.Integer(), sa.ForeignKey("movies.id", ondelete="CASCADE"), primary_key=True),
        sa.Column("imdb_id", sa.String(length=20), nullable=True),
        sa.Column("tmdb_id", sa.Integer(), nullable=True),
    )

    op.create_table(
        "ratings",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("movie_id", sa.Integer(), sa.ForeignKey("movies.id", ondelete="CASCADE"), nullable=False),
        sa.Column("score", sa.Float(), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
        sa.UniqueConstraint("user_id", "movie_id", name="uq_rating_user_movie"),
        sa.CheckConstraint("score >= 0.5 AND score <= 5.0", name="ck_rating_range"),
        sa.CheckConstraint("CAST(score * 2 AS INTEGER) = score * 2", name="ck_rating_half_step"),
    )
    op.create_index("ix_ratings_user_id", "ratings", ["user_id"])
    op.create_index("ix_ratings_movie_id", "ratings", ["movie_id"])

    op.create_table(
        "watchlist_items",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("movie_id", sa.Integer(), sa.ForeignKey("movies.id", ondelete="CASCADE"), nullable=False),
        sa.Column("note", sa.String(length=300), nullable=True),
        sa.Column("added_at", sa.DateTime(), nullable=False),
        sa.UniqueConstraint("user_id", "movie_id", name="uq_watchlist_user_movie"),
    )
    op.create_index("ix_watchlist_items_user_id", "watchlist_items", ["user_id"])

    op.create_table(
        "dataset_versions",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("name", sa.String(length=100), nullable=False),
        sa.Column("source", sa.String(length=300), nullable=True),
        sa.Column("file_sha256", sa.String(length=64), nullable=False, unique=True),
        sa.Column("n_movies", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("n_ratings", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("n_users", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("imported_at", sa.DateTime(), nullable=False),
    )

    op.create_table(
        "dataset_ratings",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("dataset_version_id", sa.Integer(), sa.ForeignKey("dataset_versions.id", ondelete="CASCADE"), nullable=False),
        sa.Column("source_user_id", sa.Integer(), nullable=False),
        sa.Column("movie_id", sa.Integer(), sa.ForeignKey("movies.id", ondelete="CASCADE"), nullable=False),
        sa.Column("score", sa.Float(), nullable=False),
        sa.Column("rated_at", sa.DateTime(), nullable=True),
        sa.UniqueConstraint("dataset_version_id", "source_user_id", "movie_id", name="uq_dsrating"),
    )
    op.create_index("ix_dataset_ratings_dataset_version_id", "dataset_ratings", ["dataset_version_id"])
    op.create_index("ix_dataset_ratings_movie_id", "dataset_ratings", ["movie_id"])

    op.create_table(
        "import_jobs",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("status", sa.String(length=20), nullable=False, server_default="pending"),
        sa.Column("source", sa.String(length=300), nullable=True),
        sa.Column("dataset_version_id", sa.Integer(), sa.ForeignKey("dataset_versions.id", ondelete="SET NULL"), nullable=True),
        sa.Column("rows_ok", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("rows_error", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("message", sa.Text(), nullable=True),
        sa.Column("created_by", sa.Integer(), sa.ForeignKey("users.id", ondelete="SET NULL"), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("finished_at", sa.DateTime(), nullable=True),
    )

    op.create_table(
        "model_versions",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("version", sa.String(length=40), nullable=False, unique=True),
        sa.Column("path", sa.String(length=500), nullable=False),
        sa.Column("status", sa.String(length=20), nullable=False, server_default="ready"),
        sa.Column("params", sa.JSON(), nullable=True),
        sa.Column("validation", sa.JSON(), nullable=True),
        sa.Column("n_users", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("n_items", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("n_ratings", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("trained_at", sa.DateTime(), nullable=False),
        sa.Column("activated_at", sa.DateTime(), nullable=True),
    )
    op.create_index("ix_model_versions_status", "model_versions", ["status"])

    op.create_table(
        "training_runs",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("status", sa.String(length=20), nullable=False, server_default="pending"),
        sa.Column("params", sa.JSON(), nullable=True),
        sa.Column("auto_activate", sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column("message", sa.Text(), nullable=True),
        sa.Column("model_version_id", sa.Integer(), sa.ForeignKey("model_versions.id", ondelete="SET NULL"), nullable=True),
        sa.Column("created_by", sa.Integer(), sa.ForeignKey("users.id", ondelete="SET NULL"), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("started_at", sa.DateTime(), nullable=True),
        sa.Column("finished_at", sa.DateTime(), nullable=True),
    )

    op.create_table(
        "evaluation_results",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("run_id", sa.String(length=40), nullable=False),
        sa.Column("method", sa.String(length=20), nullable=False),
        sa.Column("split", sa.String(length=10), nullable=False, server_default="test"),
        sa.Column("params", sa.JSON(), nullable=True),
        sa.Column("rmse", sa.Float(), nullable=True),
        sa.Column("mae", sa.Float(), nullable=True),
        sa.Column("precision_at_10", sa.Float(), nullable=True),
        sa.Column("recall_at_10", sa.Float(), nullable=True),
        sa.Column("extra", sa.JSON(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.UniqueConstraint("run_id", "method", "split", name="uq_eval_run_method"),
    )
    op.create_index("ix_evaluation_results_run_id", "evaluation_results", ["run_id"])

    op.create_table(
        "recommendation_events",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=True),
        sa.Column("requested_method", sa.String(length=20), nullable=False),
        sa.Column("served_method", sa.String(length=20), nullable=False),
        sa.Column("model_version", sa.String(length=40), nullable=True),
        sa.Column("fallback", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column("n_items", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("created_at", sa.DateTime(), nullable=False),
    )
    op.create_index("ix_recommendation_events_user_id", "recommendation_events", ["user_id"])
    op.create_index("ix_recommendation_events_created_at", "recommendation_events", ["created_at"])


def downgrade() -> None:
    for table in [
        "recommendation_events", "evaluation_results", "training_runs", "model_versions",
        "import_jobs", "dataset_ratings", "dataset_versions", "watchlist_items", "ratings",
        "movie_links", "movie_genres", "movies", "genres", "users", "roles",
    ]:
        op.drop_table(table)
