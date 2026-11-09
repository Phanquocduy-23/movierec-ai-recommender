import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles
from sqlalchemy import select, text
from sqlalchemy.exc import SQLAlchemyError

from .config import settings
from .database import Base, SessionLocal, engine
from .models import Role
from .routers import admin, auth, movies, ratings, recommendations

logging.basicConfig(level=logging.INFO)
log = logging.getLogger("movierec")

@asynccontextmanager
async def lifespan(_app: FastAPI):
    ensure_roles()
    yield


app = FastAPI(title="MovieRec API", version="1.0.0", lifespan=lifespan,
              description="Website gợi ý phim cá nhân hóa - lọc cộng tác (Item-based KNN, SVD)")

app.add_middleware(CORSMiddleware, allow_origins=settings.cors_list, allow_credentials=True,
                   allow_methods=["*"], allow_headers=["*"])

for r in (auth.router, movies.router, ratings.router, recommendations.router, admin.router):
    app.include_router(r)

settings.experiments_dir.mkdir(parents=True, exist_ok=True)
app.mount("/static/experiments", StaticFiles(directory=settings.experiments_dir), name="experiments")


@app.exception_handler(SQLAlchemyError)
async def db_error_handler(request: Request, exc: SQLAlchemyError):
    # Không trả chi tiết kết nối/SQL ra ngoài
    log.exception("Database error")
    return JSONResponse(status_code=500, content={"detail": "Lỗi cơ sở dữ liệu, vui lòng thử lại sau"})


def ensure_roles():
    try:
        Base.metadata.create_all(engine)
        with SessionLocal() as db:
            for name, desc in (("user", "Người dùng"), ("admin", "Quản trị viên")):
                if not db.scalar(select(Role).where(Role.name == name)):
                    db.add(Role(name=name, description=desc))
            db.commit()
    except SQLAlchemyError:
        log.warning("Chưa tạo được roles - hãy chạy 'alembic upgrade head' trước")


@app.get("/api/health")
def health():
    db_ok = True
    try:
        with SessionLocal() as db:
            db.execute(text("SELECT 1"))
    except SQLAlchemyError:
        db_ok = False
    return {"status": "ok", "database": db_ok}
