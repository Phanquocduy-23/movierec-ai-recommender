from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict

from . import PROJECT_ROOT


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=Path(__file__).resolve().parents[1] / ".env",
                                      extra="ignore")

    database_url: str = "postgresql+psycopg2://movierec:movierec@localhost:5432/movierec"
    jwt_secret: str = "change-me-in-.env"
    jwt_algorithm: str = "HS256"
    jwt_expire_minutes: int = 120
    cors_origins: str = "http://localhost:5173,http://127.0.0.1:5173"

    artifacts_dir: Path = PROJECT_ROOT / "artifacts"
    data_dir: Path = PROJECT_ROOT / "data"
    recommend_cache_size: int = 2000

    @property
    def models_dir(self) -> Path:
        return self.artifacts_dir / "models"

    @property
    def experiments_dir(self) -> Path:
        return self.artifacts_dir / "experiments"

    @property
    def cors_list(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]


settings = Settings()
