from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field, field_validator


class ORM(BaseModel):
    model_config = ConfigDict(from_attributes=True)


# ---------------------------------------------------------------- Auth
class RegisterIn(BaseModel):
    email: str = Field(min_length=5, max_length=255, pattern=r"^[^@\s]+@[^@\s]+\.[^@\s]+$")
    username: str = Field(min_length=3, max_length=50, pattern=r"^[A-Za-z0-9_.]+$")
    password: str = Field(min_length=6, max_length=72)
    full_name: str | None = Field(default=None, max_length=120)


class UserOut(ORM):
    id: int
    email: str
    username: str
    full_name: str | None
    role_name: str
    is_active: bool
    created_at: datetime


class TokenOut(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserOut


class ProfileUpdate(BaseModel):
    full_name: str | None = Field(default=None, max_length=120)
    current_password: str | None = None
    new_password: str | None = Field(default=None, min_length=6, max_length=72)


# ---------------------------------------------------------------- Movies
class GenreOut(ORM):
    id: int
    name: str


class MovieLinkOut(ORM):
    imdb_id: str | None
    tmdb_id: int | None


class MovieOut(ORM):
    id: int
    movielens_id: int | None
    title: str
    year: int | None
    poster_url: str | None
    rating_avg: float | None
    rating_count: int
    genres: list[GenreOut]


class MovieDetail(MovieOut):
    overview: str | None
    link: MovieLinkOut | None
    is_active: bool
    my_rating: float | None = None
    in_watchlist: bool = False


class MovieIn(BaseModel):
    title: str = Field(min_length=1, max_length=300)
    year: int | None = Field(default=None, ge=1870, le=2100)
    overview: str | None = None
    poster_url: str | None = Field(default=None, max_length=500)
    genre_ids: list[int] = []
    is_active: bool = True
    imdb_id: str | None = None
    tmdb_id: int | None = None


class Page(BaseModel):
    items: list
    total: int
    page: int
    size: int


# ---------------------------------------------------------------- Ratings & watchlist
class RatingIn(BaseModel):
    score: float

    @field_validator("score")
    @classmethod
    def half_steps(cls, v: float) -> float:
        if not (0.5 <= v <= 5.0) or (v * 2) % 1 != 0:
            raise ValueError("Điểm phải từ 0.5 đến 5.0, bước 0.5")
        return v


class RatingOut(ORM):
    movie_id: int
    score: float
    created_at: datetime
    updated_at: datetime
    movie: MovieOut


class WatchlistIn(BaseModel):
    note: str | None = Field(default=None, max_length=300)


class WatchlistOut(ORM):
    movie_id: int
    note: str | None
    added_at: datetime
    movie: MovieOut


# ---------------------------------------------------------------- Recommendations
class RecItem(BaseModel):
    movie: MovieOut
    predicted_score: float | None
    source: str               # svd | item_knn | popular
    because: list[str] = []   # tên phim đã thích dẫn tới gợi ý (Item-based)


class RecommendationOut(BaseModel):
    requested_method: str
    served_method: str
    model_version: str | None
    fallback: bool
    reason: str
    items: list[RecItem]


# ---------------------------------------------------------------- Admin
class UserAdminUpdate(BaseModel):
    role: str | None = Field(default=None, pattern="^(user|admin)$")
    is_active: bool | None = None


class TrainIn(BaseModel):
    svd_factors: int = Field(50, ge=5, le=300)
    svd_epochs: int = Field(20, ge=5, le=200)
    svd_lr: float = Field(0.005, gt=0, le=0.1)
    svd_reg: float = Field(0.02, ge=0, le=1)
    knn_k: int = Field(40, ge=5, le=200)
    knn_shrink: float = Field(0.0, ge=0, le=100)
    pop_m: float = Field(10, ge=0, le=1000)
    auto_activate: bool = True


class TrainingRunOut(ORM):
    id: int
    status: str
    params: dict | None
    auto_activate: bool
    message: str | None
    created_at: datetime
    started_at: datetime | None
    finished_at: datetime | None
    model_version_id: int | None


class ModelVersionOut(ORM):
    id: int
    version: str
    status: str
    params: dict | None
    validation: dict | None
    n_users: int
    n_items: int
    n_ratings: int
    trained_at: datetime
    activated_at: datetime | None


class ImportJobOut(ORM):
    id: int
    status: str
    source: str | None
    dataset_version_id: int | None
    rows_ok: int
    rows_error: int
    message: str | None
    created_at: datetime
    finished_at: datetime | None
