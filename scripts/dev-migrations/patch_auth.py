import re

with open('app/main.py', 'r', encoding='utf-8') as f:
    code = f.read()

# 1 - Add imports at top
if 'from .auth import' not in code:
    code = code.replace(
        'from .adaptive_controller import (',
        'from .auth import (\n    hash_password, verify_password,\n    create_access_token, get_current_user,\n    require_roles, any_authenticated, admin_only\n)\nfrom .models import User\nfrom .adaptive_controller import ('
    )

# 2 - Add seed users + auth routes after Base.metadata.create_all line
seed_and_routes = '''
# ---------------------------------------------------------------------------
# Seed default users on startup
# ---------------------------------------------------------------------------
def _seed_users():
    from .database import SessionLocal
    db = SessionLocal()
    try:
        if db.query(User).count() == 0:
            defaults = [
                ("admin",    "admin@itms.local",    "admin123",    "ADMIN"),
                ("officer",  "officer@itms.local",  "officer123",  "TRAFFIC_OFFICER"),
                ("operator", "operator@itms.local", "operator123", "CONTROL_ROOM_OPERATOR"),
                ("analyst",  "analyst@itms.local",  "analyst123",  "ANALYST"),
                ("viewer",   "viewer@itms.local",   "viewer123",   "VIEWER"),
            ]
            for username, email, pw, role in defaults:
                db.add(User(
                    username=username,
                    email=email,
                    hashed_password=hash_password(pw),
                    role=role
                ))
            db.commit()
    finally:
        db.close()

_seed_users()

# ---------------------------------------------------------------------------
# Auth routes
# ---------------------------------------------------------------------------
from pydantic import BaseModel as PydanticBase

class LoginRequest(PydanticBase):
    username: str
    password: str

class UserCreate(PydanticBase):
    username: str
    email: str = None
    password: str
    role: str = "VIEWER"

@app.post("/api/auth/login")
def login(req: LoginRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.username == req.username).first()
    if not user or not verify_password(req.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    if not user.is_active:
        raise HTTPException(status_code=403, detail="Account disabled")
    token = create_access_token({"sub": user.username, "role": user.role})
    return {
        "access_token": token,
        "token_type": "bearer",
        "user": {"id": user.id, "username": user.username, "email": user.email, "role": user.role}
    }

@app.get("/api/auth/me")
def get_me(current_user=Depends(get_current_user)):
    return {"id": current_user.id, "username": current_user.username, "email": current_user.email, "role": current_user.role}

@app.get("/api/users")
def list_users(db: Session = Depends(get_db), _=Depends(admin_only)):
    users = db.query(User).all()
    return [{"id": u.id, "username": u.username, "email": u.email, "role": u.role, "is_active": u.is_active} for u in users]

@app.post("/api/users")
def create_user(req: UserCreate, db: Session = Depends(get_db), _=Depends(admin_only)):
    if db.query(User).filter(User.username == req.username).first():
        raise HTTPException(status_code=400, detail="Username already exists")
    user = User(username=req.username, email=req.email, hashed_password=hash_password(req.password), role=req.role)
    db.add(user)
    db.commit()
    db.refresh(user)
    return {"id": user.id, "username": user.username, "role": user.role}

@app.put("/api/users/{user_id}/role")
def update_user_role(user_id: int, role: str, db: Session = Depends(get_db), _=Depends(admin_only)):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    user.role = role
    db.commit()
    return {"id": user.id, "username": user.username, "role": user.role}

@app.put("/api/users/{user_id}/toggle")
def toggle_user(user_id: int, db: Session = Depends(get_db), _=Depends(admin_only)):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    user.is_active = not user.is_active
    db.commit()
    return {"id": user.id, "is_active": user.is_active}
'''

# Insert after Base.metadata.create_all line
if '_seed_users()' not in code:
    code = code.replace(
        '# Auto-create tables on startup\nBase.metadata.create_all(bind=engine)',
        '# Auto-create tables on startup\nBase.metadata.create_all(bind=engine)' + seed_and_routes
    )

with open('app/main.py', 'w', encoding='utf-8') as f:
    f.write(code)
print("Done")
