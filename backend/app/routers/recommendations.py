from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from ..database import get_db
from ..deps import get_optional_user
from ..models import User
from ..schemas import RecommendationOut
from ..services.recommender import recommend

router = APIRouter(prefix="/api", tags=["recommendations"])


@router.get("/recommendations", response_model=RecommendationOut)
def get_recommendations(method: str = Query("auto", pattern="^(auto|svd|item_knn|popular)$"),
                        n: int = Query(10, ge=1, le=50),
                        user: User | None = Depends(get_optional_user), db: Session = Depends(get_db)):
    """Top-N gợi ý. Khách nhận danh sách phổ biến; người dùng nhận gợi ý cá nhân hóa.

    Không bao giờ huấn luyện trong request này - chỉ dùng mô hình đã phát hành.
    """
    return recommend(db, user, method, n)
