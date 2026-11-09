from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy import or_, select
from sqlalchemy.orm import Session

from ..database import get_db
from ..deps import get_current_user
from ..models import Role, User
from ..schemas import ProfileUpdate, RegisterIn, TokenOut, UserOut
from ..security import create_access_token, hash_password, verify_password

router = APIRouter(prefix="/api/auth", tags=["auth"])


@router.post("/register", response_model=TokenOut, status_code=201)
def register(data: RegisterIn, db: Session = Depends(get_db)):
    email = data.email.lower()
    if db.scalar(select(User).where(User.email == email)):
        raise HTTPException(status.HTTP_409_CONFLICT, "Email đã được sử dụng")
    if db.scalar(select(User).where(User.username == data.username)):
        raise HTTPException(status.HTTP_409_CONFLICT, "Tên đăng nhập đã tồn tại")
    role = db.scalar(select(Role).where(Role.name == "user"))
    user = User(email=email, username=data.username, full_name=data.full_name,
                password_hash=hash_password(data.password), role_id=role.id)
    db.add(user)
    db.commit()
    db.refresh(user)
    return TokenOut(access_token=create_access_token(user.id, user.role_name), user=user)


@router.post("/login", response_model=TokenOut)
def login(form: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    """Đăng nhập bằng email hoặc tên đăng nhập (chuẩn OAuth2 password flow)."""
    ident = form.username.strip()
    user = db.scalar(select(User).where(or_(User.email == ident.lower(), User.username == ident)))
    # Cùng một thông báo cho sai tài khoản / sai mật khẩu để không lộ email nào tồn tại
    if not user or not verify_password(form.password, user.password_hash):
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Sai tài khoản hoặc mật khẩu")
    if not user.is_active:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Tài khoản đã bị khóa")
    return TokenOut(access_token=create_access_token(user.id, user.role_name), user=user)


@router.get("/me", response_model=UserOut)
def me(user: User = Depends(get_current_user)):
    return user


@router.put("/me", response_model=UserOut)
def update_me(data: ProfileUpdate, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    if data.full_name is not None:
        user.full_name = data.full_name
    if data.new_password:
        if not data.current_password or not verify_password(data.current_password, user.password_hash):
            raise HTTPException(status.HTTP_400_BAD_REQUEST, "Mật khẩu hiện tại không đúng")
        user.password_hash = hash_password(data.new_password)
    db.commit()
    return user
