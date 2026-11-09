import jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session

from .database import get_db
from .models import User
from .security import decode_token

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login", auto_error=False)

_CREDENTIALS_ERROR = HTTPException(
    status_code=status.HTTP_401_UNAUTHORIZED,
    detail="Phiên đăng nhập không hợp lệ hoặc đã hết hạn",
    headers={"WWW-Authenticate": "Bearer"},
)


def _user_from_token(token: str | None, db: Session) -> User | None:
    if not token:
        return None
    try:
        payload = decode_token(token)
        user_id = int(payload["sub"])
    except (jwt.PyJWTError, KeyError, ValueError):
        raise _CREDENTIALS_ERROR
    user = db.get(User, user_id)
    if not user or not user.is_active:
        raise _CREDENTIALS_ERROR
    return user


def get_current_user(token: str | None = Depends(oauth2_scheme), db: Session = Depends(get_db)) -> User:
    user = _user_from_token(token, db)
    if user is None:
        raise _CREDENTIALS_ERROR
    return user


def get_optional_user(token: str | None = Depends(oauth2_scheme), db: Session = Depends(get_db)) -> User | None:
    return _user_from_token(token, db)


def require_admin(user: User = Depends(get_current_user)) -> User:
    """Phân quyền kiểm tra ở backend (role lấy từ DB, không tin vào claim trong token)."""
    if user.role_name != "admin":
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Chỉ quản trị viên được thực hiện thao tác này")
    return user
