from datetime import datetime, timedelta, timezone
from typing import Optional, List
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt
from passlib.context import CryptContext
from sqlalchemy.orm import Session
from .database import get_db

# ---------------------------------------------------------------------------
# Config
# ---------------------------------------------------------------------------
SECRET_KEY = "itms-jwt-secret-change-in-production-2026"
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 480  # 8 hours

ROLES = ["ADMIN", "TRAFFIC_OFFICER", "CONTROL_ROOM_OPERATOR", "ANALYST", "VIEWER"]

ROLE_PERMISSIONS = {
    "ADMIN":                  ["*"],
    "TRAFFIC_OFFICER":        ["violations", "evidence", "challans", "enforcement", "traffic_read", "alerts_read"],
    "CONTROL_ROOM_OPERATOR":  ["live_traffic", "signals", "cameras", "emergency", "alerts", "traffic_read", "alerts_read"],
    "ANALYST":                ["analytics", "reports", "traffic_read", "alerts_read"],
    "VIEWER":                 ["traffic_read", "alerts_read"],
}

# ---------------------------------------------------------------------------
# Crypto
# ---------------------------------------------------------------------------
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login", auto_error=False)

def hash_password(password: str) -> str:
    return pwd_context.hash(password)

def verify_password(plain: str, hashed: str) -> bool:
    return pwd_context.verify(plain, hashed)

# ---------------------------------------------------------------------------
# JWT
# ---------------------------------------------------------------------------
def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + (expires_delta or timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES))
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)

def decode_token(token: str) -> Optional[dict]:
    try:
        return jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
    except JWTError:
        return None

# ---------------------------------------------------------------------------
# Dependencies
# ---------------------------------------------------------------------------
def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)):
    from .models import User
    if not token:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Not authenticated")
    payload = decode_token(token)
    if not payload:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid or expired token")
    user = db.query(User).filter(User.username == payload.get("sub")).first()
    if not user or not user.is_active:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found or inactive")
    return user

def require_roles(*roles: str):
    """Factory: returns a FastAPI dependency that enforces role membership."""
    def dependency(current_user=Depends(get_current_user)):
        if current_user.role not in roles and current_user.role != "ADMIN":
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Role '{current_user.role}' does not have permission for this action"
            )
        return current_user
    return dependency

# Convenience shorthands
def any_authenticated(user=Depends(get_current_user)):
    return user

def admin_only(user=Depends(require_roles("ADMIN"))):
    return user
