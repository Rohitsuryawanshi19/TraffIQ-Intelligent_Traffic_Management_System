from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel as PydanticBase
from typing import List, Optional

from ...database import get_db
from ...models import User
from ...auth import (
    hash_password, verify_password, create_access_token,
    get_current_user, require_roles, any_authenticated, admin_only
)

auth_router = APIRouter(tags=["auth"])

class LoginRequest(PydanticBase):
    username: str
    password: str

class UserCreate(PydanticBase):
    username: str
    email: Optional[str] = None
    password: str
    role: str = "VIEWER"

@auth_router.post("/auth/login")
def login(req: LoginRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.username == req.username).first()
    if not user or not verify_password(req.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Invalid username or password")
    if not user.is_active:
        raise HTTPException(status_code=403, detail="User account disabled")
    token = create_access_token({"sub": user.username, "role": user.role})
    return {
        "access_token": token,
        "token_type": "bearer",
        "user": {
            "id": user.id,
            "username": user.username,
            "email": user.email,
            "role": user.role
        }
    }

@auth_router.get("/auth/me")
def get_me(user: User = Depends(get_current_user)):
    return {
        "id": user.id,
        "username": user.username,
        "email": user.email,
        "role": user.role,
        "is_active": user.is_active
    }

@auth_router.get("/users")
def list_users(db: Session = Depends(get_db), current_user=Depends(admin_only)):
    users = db.query(User).all()
    return [{
        "id": u.id, "username": u.username, "email": u.email,
        "role": u.role, "is_active": u.is_active,
        "created_at": u.created_at.isoformat() if u.created_at else None
    } for u in users]
