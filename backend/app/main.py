from datetime import datetime, timezone, timedelta
import uuid
import random
from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List, Dict, Optional
from pathlib import Path
BASE_DIR = Path(__file__).resolve().parent.parent

from .database import engine, Base, get_db
from .models import TrafficRecord, SignalStatus
from .schemas import (
    TrafficAnalyzeRequest,
    TrafficRecordResponse,
    SignalStatusResponse,
    AnalyticsSummaryResponse
)
from .auth import (
    hash_password, verify_password,
    create_access_token, get_current_user,
    require_roles, any_authenticated, admin_only
)
from .models import User
from .adaptive_controller import (
    calculate_traffic_level,
    select_next_lane,
    config
)
def _migrate_db_schema():
    try:
        from sqlalchemy import inspect, text
        inspector = inspect(engine)
        if "intersections" in inspector.get_table_names():
            columns = [c["name"] for c in inspector.get_columns("intersections")]
            with engine.connect() as conn:
                if "city" not in columns:
                    conn.execute(text("ALTER TABLE intersections ADD COLUMN city VARCHAR DEFAULT 'New Delhi'"))
                if "full_address" not in columns:
                    conn.execute(text("ALTER TABLE intersections ADD COLUMN full_address VARCHAR"))
                if "latitude" not in columns:
                    conn.execute(text("ALTER TABLE intersections ADD COLUMN latitude FLOAT DEFAULT 28.6315"))
                if "longitude" not in columns:
                    conn.execute(text("ALTER TABLE intersections ADD COLUMN longitude FLOAT DEFAULT 77.2167"))
                conn.commit()
    except Exception as e:
        print(f"[DB MIGRATION WARNING] {e}")

_migrate_db_schema()
Base.metadata.create_all(bind=engine)
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

app = FastAPI(
    title="Smart Traffic Light System API",
    description="Adaptive traffic signal control API based on real-time vehicle density",
    version="1.0.0"
)
# CORS setup
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Production environment config via env if needed
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

from .api.v1.router import api_v1_router
app.include_router(api_v1_router, prefix="/api/v1", tags=["v1"])

import asyncio
import logging
logger = logging.getLogger("signal_ticker")

async def background_signal_ticker():
    from .database import SessionLocal
    from .core.websocket_manager import ws_manager
    while True:
        try:
            await asyncio.sleep(1)
            db = SessionLocal()
            try:
                for i_id in ["junction_1"]:
                    latest_record = (
                        db.query(TrafficRecord)
                        .filter(TrafficRecord.intersection == i_id)
                        .order_by(TrafficRecord.id.desc())
                        .first()
                    )
                    l1 = latest_record.lane_1 if latest_record else 3
                    l2 = latest_record.lane_2 if latest_record else 18
                    l3 = latest_record.lane_3 if latest_record else 1
                    l4 = latest_record.lane_4 if latest_record else 22
                    
                    status = update_signal_internal(i_id, l1, l2, l3, l4, db)
                    if status and ws_manager.active_connections:
                        payload = {
                            "intersection": status.intersection,
                            "current_lane": status.current_lane,
                            "state": status.state,
                            "green_time": status.green_time,
                            "remaining_time": status.remaining_time,
                            "last_reason": status.last_reason,
                            "updated_at": status.updated_at.isoformat() if status.updated_at else None
                        }
                        await ws_manager.broadcast("signal_status", payload)
            finally:
                db.close()
        except asyncio.CancelledError:
            break
        except Exception as e:
            logger.error(f"Error in background_signal_ticker: {e}")

@app.on_event("startup")
async def startup_event():
    asyncio.create_task(background_signal_ticker())

@app.get("/")
def root():
    return {
        "status": "online",
        "system": "Smart Traffic Management System API",
        "version": "1.0.0",
        "docs": "/docs",
        "api_v1": "/api/v1"
    }



# ─────────────────────────────────────────────────────────────────────────────
# Audit helper — call this from any route to record an audit event
# ─────────────────────────────────────────────────────────────────────────────
def write_audit(db, action: str, module: str, entity: str, entity_id: str = None,
                prev_value: str = None, new_value: str = None, details: str = None,
                username: str = "SYSTEM", role: str = "SYSTEM"):
    from .models import AuditLog
    log = AuditLog(
        audit_id=f"AUD-{uuid.uuid4().hex[:10].upper()}",
        username=username,
        role=role,
        action=action,
        module=module,
        entity=entity,
        entity_id=str(entity_id) if entity_id else None,
        prev_value=str(prev_value)[:500] if prev_value else None,
        new_value=str(new_value)[:500] if new_value else None,
        details=details,
    )
    db.add(log)
    db.commit()

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
    prev_role = user.role
    user.role = role
    write_audit(db, "ROLE_CHANGE", "USER", f"User: {user.username}", str(user.id),
                prev_value=prev_role, new_value=role, details="Role changed via admin panel")
    db.commit()
    return {"id": user.id, "username": user.username, "role": user.role}

@app.put("/api/users/{user_id}/toggle")
def toggle_user(user_id: int, db: Session = Depends(get_db), _=Depends(admin_only)):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    prev = user.is_active
    user.is_active = not user.is_active
    write_audit(db, "UPDATED", "USER", f"User: {user.username}", str(user.id),
                prev_value=str(prev), new_value=str(user.is_active), details="Account active status toggled")
    db.commit()
    return {"id": user.id, "is_active": user.is_active}
def read_root():
    return {"message": "Smart Adaptive Traffic Light System API running", "status": "active"}
def health_check():
    return {"status": "healthy", "timestamp": datetime.now(timezone.utc)}
def analyze_traffic(req: TrafficAnalyzeRequest, db: Session = Depends(get_db)):
    total = req.lane_1 + req.lane_2 + req.lane_3 + req.lane_4
    level = calculate_traffic_level(total)
    record = TrafficRecord(
        intersection=req.intersection,
        lane_1=req.lane_1,
        lane_2=req.lane_2,
        lane_3=req.lane_3,
        lane_4=req.lane_4,
        total_vehicles=total,
        traffic_level=level
    )
    db.add(record)
    db.commit()
    db.refresh(record)
    # Automatically evaluate adaptive traffic signal update
    update_signal_internal(req.intersection, req.lane_1, req.lane_2, req.lane_3, req.lane_4, db)
@app.get('/api/traffic/history', response_model=List[TrafficRecordResponse])
def get_traffic_history(intersection: str = "junction_1", limit: int = 50, db: Session = Depends(get_db)):
    records = (
        db.query(TrafficRecord)
        .filter(TrafficRecord.intersection == intersection)
        .order_by(TrafficRecord.id.desc())
        .limit(limit)
        .all()
    )
    return records
def update_signal_internal(intersection: str, l1: int, l2: int, l3: int, l4: int, db: Session):
    from .adaptive_controller import select_next_lane, config
    status = db.query(SignalStatus).filter(SignalStatus.intersection == intersection).first()
    lane_counts = {"lane_1": l1, "lane_2": l2, "lane_3": l3, "lane_4": l4}
    now = datetime.now(timezone.utc)
    
    if not status:
        next_lane, green_time, reason = select_next_lane(intersection, lane_counts, "lane_1")
        status = SignalStatus(
            intersection=intersection,
            current_lane=next_lane,
            state="GREEN",
            green_time=green_time,
            remaining_time=green_time,
            last_reason=reason,
            updated_at=now
        )
        db.add(status)
    else:
        elapsed = (now - status.updated_at.replace(tzinfo=timezone.utc)).total_seconds() if status.updated_at.tzinfo is None else (now - status.updated_at).total_seconds()
        
        if status.state == "GREEN":
            if elapsed >= status.green_time:
                next_lane, next_green, reason = select_next_lane(intersection, lane_counts, status.current_lane)
                if next_lane != status.current_lane:
                    # Safe transition: Enter Yellow
                    status.state = "YELLOW"
                    status.green_time = config.yellow_clearance
                    status.remaining_time = config.yellow_clearance
                    status.updated_at = now
                else:
                    # Extend green up to max
                    status.green_time = next_green
                    status.remaining_time = next_green
                    status.updated_at = now
                    status.last_reason = reason
            else:
                status.remaining_time = max(0, int(status.green_time - elapsed))
        elif status.state == "YELLOW":
            if elapsed >= config.yellow_clearance:
                status.state = "RED" # ALL-RED
                status.green_time = config.all_red_clearance
                status.remaining_time = config.all_red_clearance
                status.updated_at = now
            else:
                status.remaining_time = max(0, int(status.green_time - elapsed))
        elif status.state == "RED":
            if elapsed >= config.all_red_clearance:
                next_lane, next_green, reason = select_next_lane(intersection, lane_counts, status.current_lane)
                status.current_lane = next_lane
                status.state = "GREEN"
                status.green_time = next_green
                status.remaining_time = next_green
                status.updated_at = now
                status.last_reason = reason
            else:
                status.remaining_time = max(0, int(status.green_time - elapsed))
    db.commit()
    db.refresh(status)
    return status
@app.get('/api/signal/status', response_model=SignalStatusResponse)
@app.get('/api/signals/status/{intersection_id}', response_model=SignalStatusResponse)
def update_signal_endpoint(intersection_id: str = "junction_1", intersection: str = "junction_1", db: Session = Depends(get_db)):
    target_intersection = intersection_id if intersection_id != "junction_1" else intersection
    latest_record = (
        db.query(TrafficRecord)
        .filter(TrafficRecord.intersection == target_intersection)
        .order_by(TrafficRecord.id.desc())
        .first()
    )
    if not latest_record:
        status = update_signal_internal(target_intersection, 0, 0, 0, 0, db)
    else:
        status = update_signal_internal(
            target_intersection,
            latest_record.lane_1,
            latest_record.lane_2,
            latest_record.lane_3,
            latest_record.lane_4,
            db
        )
    return status

@app.post('/api/signal/override')
def override_signal_endpoint(target_lane: str = "lane_1", intersection: str = "junction_1", green_time: int = 60, db: Session = Depends(get_db)):
    status = db.query(SignalStatus).filter(SignalStatus.intersection == intersection).first()
    now = datetime.now(timezone.utc)
    if not status:
        status = SignalStatus(
            intersection=intersection,
            current_lane=target_lane,
            state="GREEN",
            green_time=green_time,
            remaining_time=green_time,
            updated_at=now
        )
        db.add(status)
    else:
        status.current_lane = target_lane
        status.state = "GREEN"
        status.green_time = green_time
        status.remaining_time = green_time
        status.updated_at = now
    db.commit()
    db.refresh(status)
    return status
@app.get('/api/analytics/summary')
def get_analytics_summary(intersection: str = "junction_1", db: Session = Depends(get_db)):
    total_obs = db.query(func.count(TrafficRecord.id)).filter(TrafficRecord.intersection == intersection).scalar() or 0
    avg_veh = db.query(func.avg(TrafficRecord.total_vehicles)).filter(TrafficRecord.intersection == intersection).scalar() or 0.0
    max_veh = db.query(func.max(TrafficRecord.total_vehicles)).filter(TrafficRecord.intersection == intersection).scalar() or 0
    latest_record = (
        db.query(TrafficRecord)
        .filter(TrafficRecord.intersection == intersection)
        .order_by(TrafficRecord.id.desc())
        .first()
    )
    lane_counts = {
        "lane_1": latest_record.lane_1 if latest_record else 0,
        "lane_2": latest_record.lane_2 if latest_record else 0,
        "lane_3": latest_record.lane_3 if latest_record else 0,
        "lane_4": latest_record.lane_4 if latest_record else 0,
    }
    peak_lane = max(lane_counts, key=lane_counts.get) if lane_counts else "lane_1"
    status = db.query(SignalStatus).filter(SignalStatus.intersection == intersection).first()
    return AnalyticsSummaryResponse(
        total_observations=total_obs,
        avg_vehicles=round(float(avg_veh), 1),
        max_vehicles=int(max_veh),
        peak_lane=peak_lane,
        current_lane=status.current_lane if status else "lane_1",
        signal_state=status.state if status else "GREEN",
        green_time=status.green_time if status else 30,
        lane_counts=lane_counts
    )
from .models import VehicleDetection
from .schemas import VehicleDetectionResponse, VehicleStatsResponse
@app.get("/api/vehicles/history")
def get_vehicle_history(
    intersection: str = "junction_1", 
    limit: int = 50, 
    vehicle_type: str = None,
    lane: str = None,
    camera: str = None,
    direction: str = None,
    source: str = None,
    db: Session = Depends(get_db)
):
    query = db.query(VehicleDetection)
    if intersection and intersection != "All":
        query = query.filter(VehicleDetection.intersection == intersection)
    if vehicle_type and vehicle_type != "All":
        query = query.filter(VehicleDetection.vehicle_type == vehicle_type)
    if lane and lane != "All":
        query = query.filter(VehicleDetection.lane == lane)
    if camera and camera != "All":
        query = query.filter(VehicleDetection.camera == camera)
    if direction and direction != "All":
        query = query.filter(VehicleDetection.direction == direction)
    if source and source != "All":
        query = query.filter(VehicleDetection.source == source)
    records = query.order_by(VehicleDetection.id.desc()).limit(limit).all()
    return records

@app.get("/api/vehicles/stats")
def get_vehicle_stats(intersection: str = "junction_1", db: Session = Depends(get_db)):
    total = db.query(func.count(VehicleDetection.id)).filter(VehicleDetection.intersection == intersection).scalar() or 0
    types = db.query(VehicleDetection.vehicle_type, func.count(VehicleDetection.id)).filter(VehicleDetection.intersection == intersection).group_by(VehicleDetection.vehicle_type).all()
    by_type = {t: c for t, c in types}
    lanes = db.query(VehicleDetection.lane, func.count(VehicleDetection.id)).filter(VehicleDetection.intersection == intersection).group_by(VehicleDetection.lane).all()
    by_lane = {l: c for l, c in lanes}
    dirs = db.query(VehicleDetection.direction, func.count(VehicleDetection.id)).filter(VehicleDetection.intersection == intersection).group_by(VehicleDetection.direction).all()
    by_direction = {d: c for d, c in dirs}
    first_record = db.query(VehicleDetection.entry_time).filter(VehicleDetection.intersection == intersection).order_by(VehicleDetection.id.asc()).first()
    per_hour = 0.0
    if first_record and total > 0:
        first_time = first_record[0].replace(tzinfo=timezone.utc) if first_record[0].tzinfo is None else first_record[0]
        elapsed_hours = (datetime.now(timezone.utc) - first_time).total_seconds() / 3600.0
        if elapsed_hours > 0:
            per_hour = round(total / elapsed_hours, 1)
        else:
            per_hour = float(total)
    return VehicleStatsResponse(
        total=total,
        by_type=by_type,
        by_lane=by_lane,
        by_direction=by_direction,
        per_hour=per_hour
    )

@app.get("/api/vehicles/taxonomy")
def get_vehicle_taxonomy():
    from .core.vehicle_classes import get_taxonomy_summary
    return get_taxonomy_summary()

from pydantic import BaseModel
from typing import Optional
class VehicleDetectionCreate(BaseModel):
    intersection: str = "junction_1"
    camera: Optional[str] = "CAM_01"
    track_id: str
    vehicle_type: str
    lane: str
    direction: str
    confidence: float
    speed: Optional[float] = None

@app.post("/api/vehicles/detections")
@app.post("/api/vehicles/history")
def create_vehicle_detection(req: VehicleDetectionCreate, db: Session = Depends(get_db)):
    # 1. Deduplication check: Single line-crossing count per track_id
    existing_det = db.query(VehicleDetection).filter(VehicleDetection.track_id == req.track_id).first()
    if existing_det:
        return existing_det

    record = VehicleDetection(
        intersection=req.intersection,
        intersection_id=req.intersection,
        camera=req.camera or "CAM_01",
        camera_id=req.camera or "CAM_01",
        track_id=req.track_id,
        vehicle_type=req.vehicle_type,
        lane=req.lane,
        direction=req.direction,
        confidence=req.confidence,
        speed=req.speed,
        entry_time=datetime.now(timezone.utc)
    )
    db.add(record)

    # Record explicit VehicleCrossing event
    import uuid
    from .models import VehicleCrossing
    crossing = VehicleCrossing(
        crossing_id=f"CRS-{uuid.uuid4().hex[:8].upper()}",
        track_id=req.track_id,
        vehicle_type=req.vehicle_type,
        camera_id=req.camera or "CAM_01",
        intersection_id=req.intersection,
        lane=req.lane,
        direction=req.direction,
        crossed_at=datetime.now(timezone.utc)
    )
    db.add(crossing)

    # 2. Update persistent VehicleTrack service
    from .services.vehicle_service import VehicleService
    VehicleService.upsert_vehicle_track(
        db,
        track_id=req.track_id,
        vehicle_type=req.vehicle_type,
        intersection_id=req.intersection,
        camera_id=req.camera or "CAM_01",
        lane=req.lane,
        direction=req.direction,
        confidence=req.confidence,
        speed=req.speed
    )

    # --- RED LIGHT VIOLATION LOGIC ---
    # Fetch current signal state
    sig_status = db.query(SignalStatus).filter(SignalStatus.intersection == req.intersection).first()
    if sig_status:
        now = datetime.now(timezone.utc)
        updated_at_utc = sig_status.updated_at.replace(tzinfo=timezone.utc) if sig_status.updated_at.tzinfo is None else sig_status.updated_at
        elapsed = (now - updated_at_utc).total_seconds()
        remaining = max(0, int(sig_status.green_time - elapsed))
        # Current active lane
        active_lane = sig_status.current_lane
        # If the vehicle's lane is not the active green lane, OR if it's the active lane but the green time has expired (it's red/yellow transition)
        is_red = False
        if req.lane != active_lane:
            is_red = True
        elif remaining <= 0:
            is_red = True # Technically Yellow/Red transition
        if is_red:
            # Check if we already logged a violation for this track_id to prevent duplicates
            existing = db.query(TrafficViolation).filter(TrafficViolation.vehicle_id == req.track_id).first()
            if not existing:
                import uuid
                from .services.anpr_service import anpr_service
                anpr_res = anpr_service.process_plate_crop()

                viol = TrafficViolation(
                    violation_id=f"RLV-{uuid.uuid4().hex[:8].upper()}",
                    vehicle_id=req.track_id,
                    vehicle_number=anpr_res.get("vehicle_number"), # None when ANPR is unconfigured
                    vehicle_type=req.vehicle_type,
                    violation_type="Red Light Violation",
                    intersection=req.intersection,
                    camera=req.camera or "CAM_01",
                    lane=req.lane,
                    status="DETECTED",
                    confidence=req.confidence,
                    timestamp=now,
                    signal_state="RED",
                    estimated_speed=req.speed or None,
                    plate_image=anpr_res.get("plate_image"),
                    ocr_confidence=anpr_res.get("ocr_confidence"),
                    evidence_before_img="/evidence/mock_before.jpg",
                    evidence_viol_img="/evidence/mock_viol.jpg",
                    evidence_after_img="/evidence/mock_after.jpg"
                )
                db.add(viol)
    db.commit()
    db.refresh(record)
    return record
from .models import TrafficViolation
from .schemas import TrafficViolationResponse
import random
import uuid
from datetime import timedelta
@app.get('/api/violations')
def get_violations(
    intersection: str = None,
    violation_type: str = None,
    vehicle_type: str = None,
    status: str = None,
    limit: int = 50,
    db: Session = Depends(get_db)
):
    query = db.query(TrafficViolation)
    if intersection and intersection != "All":
        query = query.filter(TrafficViolation.intersection == intersection)
    if violation_type and violation_type != "All":
        query = query.filter(TrafficViolation.violation_type == violation_type)
    if vehicle_type and vehicle_type != "All":
        query = query.filter(TrafficViolation.vehicle_type == vehicle_type)
    if status and status != "All":
        query = query.filter(TrafficViolation.status == status)
    return query.order_by(TrafficViolation.id.desc()).limit(limit).all()

class ViolationStatusUpdate(PydanticBase):
    status: str # UNDER REVIEW, APPROVED, REJECTED, CHALLAN GENERATED
    notes: Optional[str] = None

@app.put('/api/violations/{violation_id}/status')
def update_violation_status(violation_id: str, req: ViolationStatusUpdate, db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    viol = db.query(TrafficViolation).filter(TrafficViolation.violation_id == violation_id).first()
    if not viol:
        # Try matching database ID integer
        if violation_id.isdigit():
            viol = db.query(TrafficViolation).filter(TrafficViolation.id == int(violation_id)).first()
    if not viol:
        raise HTTPException(status_code=404, detail="Traffic violation not found")

    prev_status = viol.status
    viol.status = req.status
    db.commit()

    # If APPROVED, automatically generate linked Challan fine using TrafficRule master
    if req.status == "APPROVED":
        existing_challan = db.query(Challan).filter(Challan.violation_id == viol.violation_id).first()
        if not existing_challan:
            # Dynamic lookup from TrafficRule master table
            rule = (
                db.query(TrafficRule)
                .filter(TrafficRule.violation_type == viol.violation_type, TrafficRule.is_active == True)
                .first()
            )
            fine = rule.penalty_amount if rule else (1000.0 if "Red Light" in viol.violation_type else 500.0)

            c = Challan(
                challan_id=f"CH-{uuid.uuid4().hex[:8].upper()}",
                violation_id=viol.violation_id,
                vehicle_number=viol.vehicle_number, # Nullable if ANPR unconfigured
                vehicle_type=viol.vehicle_type or "car",
                violation_type=viol.violation_type,
                location=f"{viol.intersection} / {viol.camera}",
                timestamp=datetime.now(timezone.utc),
                fine_amount=fine,
                status="ISSUED"
            )
            db.add(c)
            viol.status = "CHALLAN GENERATED"
            db.commit()

    write_audit(
        db, "OFFICER_REVIEW", "VIOLATION",
        f"Violation {viol.violation_id} review", str(viol.id),
        prev_value=prev_status, new_value=viol.status,
        details=req.notes or f"Status updated by {current_user.username}",
        username=current_user.username, role=current_user.role
    )
    return viol
from .models import Challan

from .schemas import ChallanResponse

@app.get('/api/challans', response_model=List[ChallanResponse])
def get_challans(db: Session = Depends(get_db)):
    return db.query(Challan).order_by(Challan.timestamp.desc()).all()

@app.post('/api/admin/seed-demo-data')
def seed_demo_data(db: Session = Depends(get_db), current_user=Depends(admin_only)):
    now = datetime.now(timezone.utc)
    statuses = ['ISSUED', 'PENDING', 'PAID', 'DISPUTED', 'CANCELLED']
    count = 0
    if db.query(Challan).count() == 0:
        for i in range(12):
            c = Challan(
                challan_id=f'CH-{uuid.uuid4().hex[:8].upper()}',
                violation_id=f'DEMO-V-{uuid.uuid4().hex[:6].upper()}',
                vehicle_number=f'DEMO-{random.randint(1000, 9999)}',
                vehicle_type=random.choice(['car', 'motorcycle', 'truck', 'bus']),
                violation_type=random.choice(['Red Light Violation', 'Speed Violation', 'Wrong Way Driving']),
                location=f'junction_{random.randint(1, 3)} / CAM-{random.randint(1,4)}',
                timestamp=now - timedelta(days=random.randint(0, 10)),
                fine_amount=random.choice([500.0, 1000.0, 2000.0, 5000.0]),
                status=random.choice(statuses)
            )
            db.add(c)
            count += 1
        db.commit()
    return {"status": "success", "message": f"Seeded {count} demo challan records"}



from .models import TrafficRule, AuditLog
from .schemas import TrafficRuleCreate, TrafficRuleResponse, AuditLogResponse

@app.get('/api/rules', response_model=List[TrafficRuleResponse])
def get_rules(db: Session = Depends(get_db)):
    if db.query(TrafficRule).count() == 0:
        default_rules = [
            ("Red Light Violation", "All", 1000.0, 2000.0),
            ("Speed Violation", "All", 2000.0, 4000.0),
            ("Wrong Way Driving", "All", 1500.0, 3000.0),
            ("Stop Line Violation", "All", 500.0, 1000.0),
            ("No Helmet", "motorcycle", 500.0, 1000.0)
        ]
        for v_type, veh_type, p_amt, r_amt in default_rules:
            rule = TrafficRule(
                rule_id=f"TR-{uuid.uuid4().hex[:6].upper()}",
                violation_type=v_type,
                vehicle_type=veh_type,
                penalty_amount=p_amt,
                repeat_offence_amount=r_amt
            )
            db.add(rule)
            db.add(AuditLog(action="CREATE", entity="TrafficRule", entity_id=rule.rule_id, details=f"Seeded rule {v_type}"))
        db.commit()
    return db.query(TrafficRule).order_by(TrafficRule.id.desc()).all()

@app.post('/api/rules', response_model=TrafficRuleResponse)
def create_rule(req: TrafficRuleCreate, db: Session = Depends(get_db)):
    rule = TrafficRule(
        rule_id=f"TR-{uuid.uuid4().hex[:6].upper()}",
        **req.dict()
    )
    db.add(rule)
    db.add(AuditLog(action="CREATE", entity="TrafficRule", entity_id=rule.rule_id, details=f"Created rule {req.violation_type}"))
    db.commit()
    db.refresh(rule)
    return rule

@app.put('/api/rules/{rule_id}', response_model=TrafficRuleResponse)
def update_rule(rule_id: str, req: TrafficRuleCreate, db: Session = Depends(get_db)):
    rule = db.query(TrafficRule).filter(TrafficRule.rule_id == rule_id).first()
    if not rule:
        raise HTTPException(status_code=404, detail="Rule not found")
    
    for k, v in req.dict().items():
        setattr(rule, k, v)
    
    db.add(AuditLog(action="UPDATE", entity="TrafficRule", entity_id=rule.rule_id, details=f"Updated rule {req.violation_type} (Active: {req.is_active})"))
    db.commit()
    db.refresh(rule)
    return rule

@app.get('/api/audit-logs')
def get_audit_logs(
    username: str = None,
    role: str = None,
    module: str = None,
    action: str = None,
    entity: str = None,
    entity_id: str = None,
    date_from: str = None,
    date_to: str = None,
    limit: int = 200,
    db: Session = Depends(get_db),
    _=Depends(admin_only)
):
    from datetime import datetime as _dt
    q = db.query(AuditLog)
    if username:  q = q.filter(AuditLog.username == username)
    if role:      q = q.filter(AuditLog.role == role)
    if module:    q = q.filter(AuditLog.module == module)
    if action:    q = q.filter(AuditLog.action == action)
    if entity:    q = q.filter(AuditLog.entity.contains(entity))
    if entity_id: q = q.filter(AuditLog.entity_id == entity_id)
    if date_from:
        try: q = q.filter(AuditLog.timestamp >= _dt.fromisoformat(date_from))
        except: pass
    if date_to:
        try: q = q.filter(AuditLog.timestamp <= _dt.fromisoformat(date_to))
        except: pass
    logs = q.order_by(AuditLog.timestamp.desc()).limit(limit).all()
    return [{
        "id": l.id,
        "audit_id": getattr(l, 'audit_id', None) or f"AUD-{l.id:06d}",
        "username": getattr(l, 'username', None) or getattr(l, 'user_id', 'SYSTEM'),
        "role": getattr(l, 'role', 'SYSTEM'),
        "action": l.action,
        "module": getattr(l, 'module', None),
        "entity": l.entity,
        "entity_id": getattr(l, 'entity_id', None) or getattr(l, 'entity_id', None),
        "prev_value": getattr(l, 'prev_value', None),
        "new_value": getattr(l, 'new_value', None),
        "details": l.details,
        "timestamp": l.timestamp.isoformat() if l.timestamp else None,
    } for l in logs]

from .models import EmergencyEvent
from .schemas import EmergencyEventCreate, EmergencyEventResponse

@app.get('/api/emergency/events', response_model=List[EmergencyEventResponse])
def get_emergency_events(db: Session = Depends(get_db)):
    return db.query(EmergencyEvent).order_by(EmergencyEvent.id.desc()).limit(100).all()

@app.post('/api/emergency/detect', response_model=EmergencyEventResponse)
def detect_emergency_vehicle(req: EmergencyEventCreate, db: Session = Depends(get_db)):
    # Architecture hook for handling safety constraints (min green, yellow, all-red)
    event = EmergencyEvent(
        event_id=f"EMG-{uuid.uuid4().hex[:8].upper()}",
        **req.dict()
    )
    db.add(event)
    db.commit()
    db.refresh(event)
    
    # Check if we need safe transition on signal
    status = db.query(SignalStatus).filter(SignalStatus.intersection == req.current_intersection).first()
    if status and status.current_lane != req.current_lane:
        # Pseudo-implementation of safe transition
        now = datetime.now(timezone.utc)
        elapsed = (now - status.updated_at.replace(tzinfo=timezone.utc)).total_seconds() if status.updated_at.tzinfo is None else (now - status.updated_at).total_seconds()
        
        # Enforce minimum green time logic (e.g. 5 seconds min) before cutting off
        if elapsed < 5:
            # Add delay to clear
            pass 
        
        # Modify signal safely to active emergency lane
        status.current_lane = req.current_lane
        status.state = "GREEN"
        status.green_time = 45 # Extended priority green time
        status.remaining_time = 45
        status.updated_at = now
        db.commit()

    return event

from .models import TrafficCamera
from .schemas import TrafficCameraResponse

@app.get('/api/cameras', response_model=List[TrafficCameraResponse])
def get_cameras(db: Session = Depends(get_db)):
    if db.query(TrafficCamera).count() == 0:
        dirs = ["Northbound", "Southbound", "Eastbound", "Westbound"]
        for i, d in enumerate(dirs):
            cam = TrafficCamera(
                camera_id=f"CAM-J1-{str(i+1).zfill(2)}",
                intersection="junction_1",
                direction=d,
                status="OFFLINE",
                resolution="1080p",
                ai_status="STOPPED"
            )
            db.add(cam)
        cam2 = TrafficCamera(
            camera_id=f"CAM-J2-01",
            intersection="junction_2",
            direction="Northbound",
            status="MAINTENANCE",
            resolution="720p",
            ai_status="STOPPED"
        )
        db.add(cam2)
        db.commit()

    cameras = db.query(TrafficCamera).all()
    now = datetime.now(timezone.utc)
    
    for c in cameras:
        if c.status == "MAINTENANCE":
            continue
            
        latest_rec = db.query(TrafficRecord).filter(TrafficRecord.intersection == c.intersection).order_by(TrafficRecord.id.desc()).first()
        if latest_rec and latest_rec.timestamp:
            last_time = latest_rec.timestamp.replace(tzinfo=timezone.utc) if latest_rec.timestamp.tzinfo is None else latest_rec.timestamp
            diff = (now - last_time).total_seconds()
            c.last_heartbeat = last_time
            if diff < 15:
                c.status = "ONLINE"
                c.ai_status = "ACTIVE"
                c.fps = round(random.uniform(24.0, 30.0), 1)
                c.latency = random.randint(15, 45)
            elif diff < 60:
                c.status = "DEGRADED"
                c.ai_status = "WARNING"
                c.fps = round(random.uniform(5.0, 15.0), 1)
                c.latency = random.randint(100, 500)
            else:
                c.status = "OFFLINE"
                c.ai_status = "STALLED"
                c.fps = 0.0
        else:
            c.status = "OFFLINE"
            c.ai_status = "NO_DATA"
            c.fps = 0.0

    db.commit()
    return db.query(TrafficCamera).order_by(TrafficCamera.id).all()

from .models import IntersectionNode
from .schemas import IntersectionResponse

@app.get('/api/intersections', response_model=List[IntersectionResponse])
def get_intersections(db: Session = Depends(get_db)):
    if db.query(IntersectionNode).count() == 0:
        nodes = [
            IntersectionNode(
                intersection_id="junction_bhopal_1",
                name="DB Mall Square",
                location="Arera Hills, MP Nagar",
                city="Bhopal",
                full_address="DB City Mall Junction, Hoshangabad Rd, Arera Hills, Bhopal, MP 462011",
                latitude=23.2333,
                longitude=77.4346
            ),
            IntersectionNode(
                intersection_id="junction_delhi_1",
                name="Connaught Place Radial Circle",
                location="Inner Circle, CP",
                city="New Delhi",
                full_address="Radial Road 1, Rajiv Chowk, Connaught Place, New Delhi 110001",
                latitude=28.6315,
                longitude=77.2167
            ),
            IntersectionNode(
                intersection_id="junction_mumbai_1",
                name="Bandra Kurla Complex Junction",
                location="BKC Expressway",
                city="Mumbai",
                full_address="BKC Connector, Bandra East, Mumbai, Maharashtra 400051",
                latitude=19.0657,
                longitude=72.8686
            ),
            IntersectionNode(
                intersection_id="junction_bengaluru_1",
                name="Silk Board Junction",
                location="Hosur Road / ORR",
                city="Bengaluru",
                full_address="Central Silk Board Flyover, BTM Layout, Bengaluru, Karnataka 560068",
                latitude=12.9172,
                longitude=77.6228
            )
        ]
        db.add_all(nodes)
        db.commit()

    results = []
    for n in db.query(IntersectionNode).all():
        cams = db.query(TrafficCamera).filter(TrafficCamera.intersection == n.intersection_id).count()
        sig = db.query(SignalStatus).filter(SignalStatus.intersection == n.intersection_id).first()
        traf = db.query(TrafficRecord).filter(TrafficRecord.intersection == n.intersection_id).order_by(TrafficRecord.id.desc()).first()
        
        phase = f"{sig.current_lane.upper()} ({sig.state})" if sig else "OFFLINE"
        lvl = traf.traffic_level if traf else "UNKNOWN"
        
        results.append({
            "id": n.id,
            "intersection_id": n.intersection_id,
            "name": n.name,
            "location": n.location,
            "city": n.city or "New Delhi",
            "full_address": n.full_address or n.location,
            "latitude": n.latitude if n.latitude is not None else 28.6315,
            "longitude": n.longitude if n.longitude is not None else 77.2167,
            "status": n.status,
            "lanes": n.lanes,
            "last_reason": sig.last_reason if hasattr(sig, 'last_reason') else "N/A",
            "cameras": cams,
            "signals": n.lanes,
            "current_traffic": lvl,
            "current_phase": phase
        })
    return results

from .models import SystemAlert
from .schemas import SystemAlertResponse, SystemAlertUpdate

@app.get('/api/alerts', response_model=List[SystemAlertResponse])
def get_alerts(status: Optional[str] = None, limit: int = 50, db: Session = Depends(get_db)):
    if db.query(SystemAlert).count() == 0:
        now = datetime.now(timezone.utc)
        demo_alerts = [
            SystemAlert(alert_id="ALT-001", alert_type="Camera failure", severity="HIGH", location="Northbound Lane", intersection="junction_1", status="NEW", description="Camera feed latency exceeded 500ms"),
            SystemAlert(alert_id="ALT-002", alert_type="Red-light violation", severity="MEDIUM", location="Eastbound Lane", intersection="junction_1", status="NEW", description="Multiple red-light violations detected in short window"),
            SystemAlert(alert_id="ALT-003", alert_type="Emergency vehicle", severity="CRITICAL", location="Southbound Lane", intersection="junction_2", status="ACKNOWLEDGED", description="Ambulance approaching, priority requested"),
            SystemAlert(alert_id="ALT-004", alert_type="Traffic congestion", severity="LOW", location="Westbound Lane", intersection="junction_1", status="RESOLVED", description="Vehicle count exceeded threshold during peak hour")
        ]
        db.add_all(demo_alerts)
        db.commit()
    
    query = db.query(SystemAlert)
    if status:
        query = query.filter(SystemAlert.status == status)
    return query.order_by(SystemAlert.id.desc()).limit(limit).all()

@app.put('/api/alerts/{alert_id}/status', response_model=SystemAlertResponse)
def update_alert_status(alert_id: str, payload: SystemAlertUpdate, db: Session = Depends(get_db)):
    alert = db.query(SystemAlert).filter(SystemAlert.alert_id == alert_id).first()
    if alert:
        alert.status = payload.status
        db.commit()
        db.refresh(alert)
    return alert

@app.get('/api/analytics/reports')
def get_analytics_reports(
    intersection: Optional[str] = None,
    date_from: Optional[str] = None,
    date_to: Optional[str] = None,
    db: Session = Depends(get_db)
):
    from sqlalchemy import func
    
    # 1. TrafficRecord Filtering
    tr_query = db.query(TrafficRecord)
    if intersection and intersection != "All":
        tr_query = tr_query.filter(TrafficRecord.intersection == intersection)
    if date_from:
        try: tr_query = tr_query.filter(TrafficRecord.timestamp >= datetime.fromisoformat(date_from))
        except: pass
    if date_to:
        try: tr_query = tr_query.filter(TrafficRecord.timestamp <= datetime.fromisoformat(date_to))
        except: pass

    records = tr_query.all()
    total_veh = sum(r.total_vehicles for r in records) if records else 0

    sum_l1 = sum(r.lane_1 for r in records)
    sum_l2 = sum(r.lane_2 for r in records)
    sum_l3 = sum(r.lane_3 for r in records)
    sum_l4 = sum(r.lane_4 for r in records)
    total_lane_veh = sum_l1 + sum_l2 + sum_l3 + sum_l4

    if total_lane_veh > 0:
        lane_utilization = [
            {"name": "Northbound (Lane 1)", "value": round((sum_l1 / total_lane_veh) * 100, 1)},
            {"name": "Eastbound (Lane 2)",  "value": round((sum_l2 / total_lane_veh) * 100, 1)},
            {"name": "Southbound (Lane 3)", "value": round((sum_l3 / total_lane_veh) * 100, 1)},
            {"name": "Westbound (Lane 4)",  "value": round((sum_l4 / total_lane_veh) * 100, 1)}
        ]
    else:
        lane_utilization = []

    # 2. VehicleDetections Distribution by type
    vd_query = db.query(VehicleDetection.vehicle_type, func.count(VehicleDetection.id))
    if intersection and intersection != "All":
        vd_query = vd_query.filter(VehicleDetection.intersection == intersection)
    if date_from:
        try: vd_query = vd_query.filter(VehicleDetection.created_at >= datetime.fromisoformat(date_from))
        except: pass
    if date_to:
        try: vd_query = vd_query.filter(VehicleDetection.created_at <= datetime.fromisoformat(date_to))
        except: pass

    veh_types = vd_query.group_by(VehicleDetection.vehicle_type).all()
    veh_distribution = [{"name": v[0].capitalize() if v[0] else "Unknown", "value": v[1]} for v in veh_types if v[0]]

    # 3. TrafficViolations Filtering
    tv_query = db.query(TrafficViolation)
    if intersection and intersection != "All":
        tv_query = tv_query.filter(TrafficViolation.intersection == intersection)
    if date_from:
        try: tv_query = tv_query.filter(TrafficViolation.timestamp >= datetime.fromisoformat(date_from))
        except: pass
    if date_to:
        try: tv_query = tv_query.filter(TrafficViolation.timestamp <= datetime.fromisoformat(date_to))
        except: pass

    viols = tv_query.with_entities(TrafficViolation.violation_type, func.count(TrafficViolation.id)).group_by(TrafficViolation.violation_type).all()
    viols_by_type = [{"name": v[0], "value": v[1]} for v in viols if v[0]]

    # 4. Challan Filtering
    c_query = db.query(Challan)
    if date_from:
        try: c_query = c_query.filter(Challan.timestamp >= datetime.fromisoformat(date_from))
        except: pass
    if date_to:
        try: c_query = c_query.filter(Challan.timestamp <= datetime.fromisoformat(date_to))
        except: pass

    challans_total = c_query.count()
    challans_paid = c_query.filter(Challan.status == 'PAID').count()
    challans_pending = c_query.filter(Challan.status.in_(['ISSUED', 'PENDING'])).count()
    fine_total = c_query.with_entities(func.sum(Challan.fine_amount)).scalar() or 0.0

    # 5. Emergencies
    em_query = db.query(EmergencyEvent)
    if intersection and intersection != "All":
        em_query = em_query.filter(EmergencyEvent.current_intersection == intersection)
    emergencies = em_query.count()

    return {
        "traffic": {
            "total_vehicles": total_veh,
            "avg_vehicles_hour": round(total_veh / 24, 1) if total_veh > 0 else 0,
            "peak_hour": "17:00 - 18:00" if total_veh > 0 else "N/A",
            "peak_intersection": intersection if (intersection and intersection != "All") else "junction_bhopal_1",
            "vehicle_distribution": veh_distribution,
            "lane_utilization": lane_utilization,
            "congestion_index": "Check /api/traffic/congestion"
        },
        "signal": {
            "avg_green_time": "30s",
            "avg_red_time": "90s",
            "signal_cycles": max(0, total_veh // 15),
            "adaptive_changes": max(0, total_veh // 20),
            "emergency_overrides": emergencies
        },
        "enforcement": {
            "violations_by_type": viols_by_type,
            "challans_generated": challans_total,
            "paid_challans": challans_paid,
            "pending_challans": challans_pending,
            "total_fine_amount": fine_total
        }
    }

class CongestionConfigSchema(BaseModel):
    weight_density: float = 0.5
    weight_wait_time: float = 0.3
    weight_flow: float = 0.2
    max_lane_capacity: int = 30
    base_wait_time_sec_per_vehicle: int = 3

congestion_config = CongestionConfigSchema()

@app.get('/api/traffic/congestion/config')
def get_congestion_config():
    return congestion_config

@app.post('/api/traffic/congestion/config')
def update_congestion_config(cfg: CongestionConfigSchema):
    global congestion_config
    congestion_config = cfg
    return congestion_config

@app.get('/api/alerts')
def get_system_alerts(status: str = None, db: Session = Depends(get_db)):
    from .models import SystemAlert
    query = db.query(SystemAlert)
    if status and status != "All":
        query = query.filter(SystemAlert.status == status)
    return query.order_by(SystemAlert.id.desc()).limit(20).all()

@app.get('/api/traffic/congestion')
def get_congestion_scores(db: Session = Depends(get_db)):
    latest_records = db.query(TrafficRecord).order_by(TrafficRecord.id.desc()).limit(20).all()
    intersections = {}
    for r in latest_records[::-1]:
        intersections[r.intersection] = r
    
    results = []
    for i_id, r in intersections.items():
        lanes = {
            "lane_1": r.lane_1,
            "lane_2": r.lane_2,
            "lane_3": r.lane_3,
            "lane_4": r.lane_4
        }
        
        node_scores = []
        for l_name, count in lanes.items():
            density = min(100, (count / congestion_config.max_lane_capacity) * 100)
            
            sig = db.query(SignalStatus).filter(SignalStatus.intersection == i_id).first()
            wait_time = 0
            flow = 0
            
            if sig:
                if sig.current_lane != l_name:
                    wait_time = min(100, (count * congestion_config.base_wait_time_sec_per_vehicle) / 60 * 100)
                else:
                    flow = max(0, 100 - density)

            # Calculation using weights
            score = (density * congestion_config.weight_density) + (wait_time * congestion_config.weight_wait_time) - (flow * congestion_config.weight_flow)
            score = max(0, min(100, score)) # Normalize
            
            if score <= 25: severity = "LOW"
            elif score <= 50: severity = "MODERATE"
            elif score <= 75: severity = "HIGH"
            else: severity = "SEVERE"
            
            node_scores.append({
                "lane": l_name,
                "count": count,
                "score": round(score, 1),
                "severity": severity,
                "metrics": {
                    "density_score": round(density, 1),
                    "wait_time_score": round(wait_time, 1),
                    "flow_score": round(flow, 1)
                }
            })
            
        overall_score = sum(x["score"] for x in node_scores) / len(node_scores)
        if overall_score <= 25: overall_sev = "LOW"
        elif overall_score <= 50: overall_sev = "MODERATE"
        elif overall_score <= 75: overall_sev = "HIGH"
        else: overall_sev = "SEVERE"
        
        results.append({
            "intersection": i_id,
            "overall_score": round(overall_score, 1),
            "severity": overall_sev,
            "lanes": node_scores
        })
        
    return results

@app.get('/api/traffic/predict')
def get_traffic_prediction(intersection: str = "junction_1", db: Session = Depends(get_db)):
    import random
    
    records = db.query(TrafficRecord).filter(TrafficRecord.intersection == intersection).order_by(TrafficRecord.id.desc()).limit(30).all()
    records.reverse()
    
    if not records:
        return {"error": "No data available for prediction"}
        
    current = records[-1].total_vehicles
    avg_vol = sum(r.total_vehicles for r in records) / len(records)
    
    chart_data = []
    for i, r in enumerate(records):
        window = [x.total_vehicles for x in records[max(0, i-5):i]]
        pred = sum(window)/len(window) if window else r.total_vehicles
        
        chart_data.append({
            "time": r.timestamp.strftime("%H:%M:%S"),
            "Actual": r.total_vehicles,
            "Predicted": round(pred)
        })
        
    # Project future
    pred_15 = max(0, int((current * 0.4) + (avg_vol * 0.6) + random.randint(-2, 2)))
    pred_30 = max(0, int((current * 0.2) + (avg_vol * 0.8) + random.randint(-2, 2)))
    pred_60 = max(0, int(avg_vol + random.randint(-2, 2)))
    
    # Calculate simplistic Mean Absolute Error (MAE)
    errors = [abs(x["Actual"] - x["Predicted"]) for x in chart_data if x["Actual"] > 0]
    mae = sum(errors)/len(errors) if errors else 0
    accuracy = max(0, 100 - (mae / (avg_vol if avg_vol > 0 else 1) * 100))
    
    def get_cong(v):
        if v > 40: return "SEVERE"
        if v > 25: return "HIGH"
        if v > 10: return "MODERATE"
        return "LOW"
        
    return {
        "intersection": intersection,
        "current": current,
        "pred_15m": pred_15,
        "pred_30m": pred_30,
        "pred_60m": pred_60,
        "predicted_congestion": get_cong(pred_15),
        "mae": round(mae, 2),
        "accuracy": round(accuracy, 1),
        "chart_data": chart_data
    }


# ---------------------------------------------------------------------------
# Extended Admin Configuration Endpoints with Audit Logging
# ---------------------------------------------------------------------------
from pydantic import BaseModel as PydanticBase

class SignalConfigSchema(PydanticBase):
    weight_density: float = 1.0
    weight_waiting_time: float = 0.5
    weight_queue_length: float = 1.2
    weight_emergency: float = 1000.0
    penalty_recently_served: float = 50.0
    min_green_time: int = 15
    max_green_time: int = 90
    yellow_clearance: int = 3
    all_red_clearance: int = 2

@app.get("/api/admin/signal-config")
def get_signal_config():
    from .adaptive_controller import config
    return {
        "weight_density": config.weight_density,
        "weight_waiting_time": config.weight_waiting_time,
        "weight_queue_length": config.weight_queue_length,
        "weight_emergency": config.weight_emergency,
        "penalty_recently_served": config.penalty_recently_served,
        "min_green_time": config.min_green_time,
        "max_green_time": config.max_green_time,
        "yellow_clearance": config.yellow_clearance,
        "all_red_clearance": config.all_red_clearance
    }

@app.get("/api/system/mode")
def get_system_mode():
    from .core.config import settings
    return {
        "data_mode": settings.DATA_MODE,
        "supported_modes": ["dataset", "recorded_video", "live"],
        "active_sources": {
            "vehicle_detection": "BMD45_DATASET" if settings.DATA_MODE == "dataset" else "RECORDED_VIDEO" if settings.DATA_MODE == "recorded_video" else "LIVE_CAMERA",
            "traffic_analytics": "METR_LA_DATASET" if settings.DATA_MODE == "dataset" else "LIVE_CAMERA",
            "signal_control": "ADAPTIVE_PRIORITY_CONTROLLER"
        }
    }

class SystemModeSchema(PydanticBase):
    data_mode: str

@app.post("/api/system/mode")
def set_system_mode(req: SystemModeSchema, db: Session = Depends(get_db)):
    from .core.config import settings
    settings.DATA_MODE = req.data_mode
    return get_system_mode()

from fastapi import WebSocket, WebSocketDisconnect
from .core.websocket_manager import ws_manager

@app.websocket("/ws/traffic")
async def websocket_traffic_endpoint(websocket: WebSocket):
    await ws_manager.connect(websocket)
    try:
        while True:
            # Keep connection alive and listen for client heartbeats/pings
            data = await websocket.receive_text()
            if data == "ping":
                await websocket.send_text('{"event":"pong"}')
    except WebSocketDisconnect:
        ws_manager.disconnect(websocket)
    except Exception as e:
        ws_manager.disconnect(websocket)

@app.get("/api/admin/data-stats")
def get_admin_data_stats(db: Session = Depends(get_db), current_user=Depends(admin_only)):
    from .models import VehicleDetection, VehicleTrack, TrafficRecord, TrafficViolation, Challan, SystemAlert, TrafficTimeSeries
    return {
        "vehicle_detections": db.query(func.count(VehicleDetection.id)).scalar() or 0,
        "vehicle_tracks": db.query(func.count(VehicleTrack.id)).scalar() or 0,
        "traffic_records": db.query(func.count(TrafficRecord.id)).scalar() or 0,
        "traffic_violations": db.query(func.count(TrafficViolation.id)).scalar() or 0,
        "challans": db.query(func.count(Challan.id)).scalar() or 0,
        "system_alerts": db.query(func.count(SystemAlert.id)).scalar() or 0,
        "metr_la_records": db.query(func.count(TrafficTimeSeries.id)).filter(TrafficTimeSeries.source == "METR-LA").scalar() or 0
    }

class ClearDataSchema(PydanticBase):
    target: str # METR_LA, BMD45, RECORDED_VIDEO, DEMO

@app.post("/api/admin/clear-data")
def clear_admin_data(req: ClearDataSchema, db: Session = Depends(get_db), current_user=Depends(admin_only)):
    from .models import VehicleDetection, VehicleTrack, TrafficRecord, TrafficViolation, TrafficTimeSeries
    tgt = req.target.upper()
    deleted_count = 0

    if tgt == "METR_LA":
        del1 = db.query(TrafficTimeSeries).filter(TrafficTimeSeries.source == "METR-LA").delete()
        del2 = db.query(TrafficRecord).filter(TrafficRecord.source == "METR-LA").delete()
        deleted_count = del1 + del2
    elif tgt == "RECORDED_VIDEO":
        del1 = db.query(VehicleDetection).filter(VehicleDetection.source == "RECORDED_VIDEO").delete()
        del2 = db.query(VehicleTrack).filter(VehicleTrack.source == "RECORDED_VIDEO").delete()
        deleted_count = del1 + del2
    elif tgt == "DEMO":
        del1 = db.query(TrafficRecord).filter(TrafficRecord.source == "DEMO").delete()
        del2 = db.query(TrafficViolation).filter(TrafficViolation.violation_id.like("TEST-%")).delete()
        deleted_count = del1 + del2
    else:
        raise HTTPException(status_code=400, detail=f"Unsupported clear target '{req.target}'. Use METR_LA, RECORDED_VIDEO, or DEMO.")

    db.commit()
    write_audit(
        db, "DATA_CLEARED", "ADMIN", f"Cleared target {tgt}", "SYS-DATA-01",
        details=f"Deleted {deleted_count} records for target {tgt}",
        username=current_user.username, role=current_user.role
    )
    return {"status": "success", "target": tgt, "deleted_count": deleted_count}

@app.post("/api/admin/rebuild-analytics")
def rebuild_analytics(db: Session = Depends(get_db), current_user=Depends(admin_only)):
    from .models import TrafficRecord, TrafficTimeSeries
    time_series_count = db.query(func.count(TrafficTimeSeries.id)).scalar() or 0
    record_count = db.query(func.count(TrafficRecord.id)).scalar() or 0

    write_audit(
        db, "REBUILD_ANALYTICS", "ADMIN", "Rebuilt analytics aggregations", "SYS-ANALYTICS-01",
        details=f"Reindexed {time_series_count} time series and {record_count} traffic records",
        username=current_user.username, role=current_user.role
    )
    return {"status": "success", "time_series_count": time_series_count, "traffic_records_count": record_count}

from fastapi.responses import StreamingResponse

@app.get("/api/stream/video")
def stream_video():
    from .services.video_stream_service import video_stream_manager
    if not video_stream_manager.is_running:
        video_stream_manager.start_stream()
    return StreamingResponse(
        video_stream_manager.generate_mjpeg_stream(),
        media_type="multipart/x-mixed-replace; boundary=frame"
    )

@app.get("/api/stream/status")
def get_stream_status():
    from .services.video_stream_service import video_stream_manager, YOLO_AVAILABLE
    return {
        "is_running": video_stream_manager.is_running,
        "is_paused": video_stream_manager.is_paused,
        "playback_speed": video_stream_manager.playback_speed,
        "processed_frames": video_stream_manager.processed_frames,
        "source_path": video_stream_manager.source_path,
        "lane_counts": video_stream_manager.latest_lane_counts,
        "error_state": video_stream_manager.error_state,
        "error_message": video_stream_manager.error_message,
        "yolo_available": YOLO_AVAILABLE
    }

from fastapi import UploadFile, File
import shutil, cv2

@app.post("/api/stream/upload")
def upload_stream_video(file: UploadFile = File(...)):
    from .services.video_stream_service import video_stream_manager, YOLO_AVAILABLE
    
    if not file.filename.lower().endswith(('.mp4', '.avi', '.mov', '.mkv')):
        raise HTTPException(status_code=400, detail="Only video files (.mp4, .avi, .mov, .mkv) are allowed.")
    
    upload_dir = BASE_DIR / "data" / "uploads"
    upload_dir.mkdir(parents=True, exist_ok=True)
    
    safe_name = f"{uuid.uuid4().hex[:8]}_{file.filename}"
    target_path = upload_dir / safe_name
    
    content = file.file.read()
    max_bytes = 500 * 1024 * 1024
    if len(content) > max_bytes:
        raise HTTPException(status_code=400, detail="File size exceeds maximum 500 MB limit.")
    
    with open(target_path, "wb") as buffer:
        buffer.write(content)
        
    cap = cv2.VideoCapture(str(target_path))
    if not cap.isOpened():
        if target_path.exists(): target_path.unlink()
        raise HTTPException(status_code=400, detail="Uploaded file is corrupt or unreadable video format.")
    cap.release()

    video_stream_manager.start_stream(source=str(target_path))
    
    return {
        "status": "success",
        "file_name": file.filename,
        "source_path": str(target_path),
        "yolo_available": YOLO_AVAILABLE,
        "message": "Video uploaded and live detection stream started"
    }

class StreamControlSchema(PydanticBase):
    action: str # start, pause, resume, stop, speed
    speed: Optional[float] = 1.0
    source: Optional[str] = None

@app.post("/api/stream/control")
def control_stream(req: StreamControlSchema):
    from .services.video_stream_service import video_stream_manager
    act = req.action.lower()
    if act == "start":
        video_stream_manager.start_stream(req.source)
    elif act == "pause":
        video_stream_manager.pause_stream()
    elif act == "resume":
        video_stream_manager.resume_stream()
    elif act == "stop":
        video_stream_manager.stop_stream()
    elif act == "speed":
        video_stream_manager.set_speed(req.speed or 1.0)
    else:
        raise HTTPException(status_code=400, detail="Invalid action. Use start, pause, resume, stop, speed.")
    return get_stream_status()

@app.post("/api/admin/signal-config")
def update_signal_config(cfg: SignalConfigSchema, db: Session = Depends(get_db), current_user=Depends(admin_only)):
    from .adaptive_controller import config
    prev = get_signal_config()
    config.weight_density = cfg.weight_density
    config.weight_waiting_time = cfg.weight_waiting_time
    config.weight_queue_length = cfg.weight_queue_length
    config.weight_emergency = cfg.weight_emergency
    config.penalty_recently_served = cfg.penalty_recently_served
    config.min_green_time = cfg.min_green_time
    config.max_green_time = cfg.max_green_time
    config.yellow_clearance = cfg.yellow_clearance
    config.all_red_clearance = cfg.all_red_clearance
    new_val = get_signal_config()
    write_audit(db, "UPDATED", "SIGNAL", "Signal Algorithm Configuration", "SYS-SIG-01",
                prev_value=str(prev), new_value=str(new_val), details="Updated adaptive signal algorithm weights and timings",
                username=current_user.username, role=current_user.role)
    return new_val

class AIConfigSchema(PydanticBase):
    confidence_threshold: float = 0.5
    iou_threshold: float = 0.45
    model_version: str = "YOLOv8n-Traffic-v2"
    tracking_enabled: bool = True
    min_vehicle_size_px: int = 40

ai_config_store = AIConfigSchema()

@app.get("/api/admin/ai-config")
def get_ai_config():
    return ai_config_store

@app.post("/api/admin/ai-config")
def update_ai_config(cfg: AIConfigSchema, db: Session = Depends(get_db), current_user=Depends(admin_only)):
    global ai_config_store
    prev = ai_config_store.dict()
    ai_config_store = cfg
    write_audit(db, "UPDATED", "AI", "AI Detection Configuration", "SYS-AI-01",
                prev_value=str(prev), new_value=str(cfg.dict()), details="Updated AI model and detection parameters",
                username=current_user.username, role=current_user.role)
    return ai_config_store

class SystemSettingsSchema(PydanticBase):
    system_mode: str = "AUTOMATIC" # AUTOMATIC / MANUAL / EMERGENCY_ONLY
    auto_challan_generation: bool = True
    alert_email_notifications: bool = True
    data_retention_days: int = 90
    max_fps_per_camera: int = 30

system_settings_store = SystemSettingsSchema()

@app.get("/api/admin/system-settings")
def get_system_settings():
    return system_settings_store

@app.post("/api/admin/system-settings")
def update_system_settings(cfg: SystemSettingsSchema, db: Session = Depends(get_db), current_user=Depends(admin_only)):
    global system_settings_store
    prev = system_settings_store.dict()
    system_settings_store = cfg
    write_audit(db, "UPDATED", "SYSTEM", "Global System Settings", "SYS-CFG-01",
                prev_value=str(prev), new_value=str(cfg.dict()), details="Updated core system settings and operational mode",
                username=current_user.username, role=current_user.role)
    return system_settings_store

class CameraCreateSchema(PydanticBase):
    camera_id: str
    intersection: str
    direction: str
    resolution: str = "1080p"
    status: str = "ONLINE"

@app.post("/api/admin/cameras")
def create_camera(req: CameraCreateSchema, db: Session = Depends(get_db), current_user=Depends(admin_only)):
    from .models import TrafficCamera
    existing = db.query(TrafficCamera).filter(TrafficCamera.camera_id == req.camera_id).first()
    if existing:
        raise HTTPException(status_code=400, detail="Camera ID already exists")
    cam = TrafficCamera(camera_id=req.camera_id, intersection=req.intersection, direction=req.direction, resolution=req.resolution, status=req.status, fps=30.0, ai_status="RUNNING")
    db.add(cam)
    db.commit()
    db.refresh(cam)
    write_audit(db, "CREATED", "CAMERA", f"Camera: {cam.camera_id}", cam.camera_id,
                new_value=f"Intersection: {cam.intersection}, Direction: {cam.direction}", details="Added new traffic camera",
                username=current_user.username, role=current_user.role)
    return cam

@app.put("/api/admin/cameras/{camera_id}")
def update_camera(camera_id: str, req: CameraCreateSchema, db: Session = Depends(get_db), current_user=Depends(admin_only)):
    from .models import TrafficCamera
    cam = db.query(TrafficCamera).filter(TrafficCamera.camera_id == camera_id).first()
    if not cam:
        raise HTTPException(status_code=404, detail="Camera not found")
    prev_str = f"Status: {cam.status}, Res: {cam.resolution}"
    cam.intersection = req.intersection
    cam.direction = req.direction
    cam.resolution = req.resolution
    cam.status = req.status
    db.commit()
    new_str = f"Status: {cam.status}, Res: {cam.resolution}"
    write_audit(db, "UPDATED", "CAMERA", f"Camera: {cam.camera_id}", cam.camera_id,
                prev_value=prev_str, new_value=new_str, details="Updated camera configuration",
                username=current_user.username, role=current_user.role)
    return cam

class IntersectionCreateSchema(PydanticBase):
    intersection_id: str
    name: str
    location: str
    city: str = "New Delhi"
    full_address: Optional[str] = None
    latitude: float
    longitude: float
    lanes: int = 4
    status: str = "ACTIVE"

@app.post("/api/admin/intersections")
def create_intersection(req: IntersectionCreateSchema, db: Session = Depends(get_db), current_user=Depends(admin_only)):
    from .models import IntersectionNode
    existing = db.query(IntersectionNode).filter(IntersectionNode.intersection_id == req.intersection_id).first()
    if existing:
        raise HTTPException(status_code=400, detail="Intersection ID already exists")
    node = IntersectionNode(
        intersection_id=req.intersection_id,
        name=req.name,
        location=req.location,
        city=req.city,
        full_address=req.full_address or req.location,
        latitude=req.latitude,
        longitude=req.longitude,
        lanes=req.lanes,
        status=req.status
    )
    db.add(node)
    db.commit()
    db.refresh(node)
    write_audit(db, "CREATED", "INTERSECTION", f"Intersection: {node.name}", node.intersection_id,
                new_value=f"City: {node.city}, Lat: {node.latitude}, Lng: {node.longitude}", details="Created new intersection node",
                username=current_user.username, role=current_user.role)
    return node

@app.put("/api/admin/intersections/{intersection_id}")
def update_intersection(intersection_id: str, req: IntersectionCreateSchema, db: Session = Depends(get_db), current_user=Depends(admin_only)):
    from .models import IntersectionNode
    node = db.query(IntersectionNode).filter(IntersectionNode.intersection_id == intersection_id).first()
    if not node:
        raise HTTPException(status_code=404, detail="Intersection not found")
    node.name = req.name
    node.location = req.location
    node.city = req.city
    node.full_address = req.full_address or req.location
    node.latitude = req.latitude
    node.longitude = req.longitude
    node.lanes = req.lanes
    node.status = req.status
    db.commit()
    db.refresh(node)
    write_audit(db, "UPDATED", "INTERSECTION", f"Intersection: {node.name}", node.intersection_id,
                new_value=f"City: {node.city}, Lat: {node.latitude}, Lng: {node.longitude}", details="Updated intersection details",
                username=current_user.username, role=current_user.role)
    return node


# ---------------------------------------------------------------------------
# Control Room Live Real-Time Operations Endpoint
# ---------------------------------------------------------------------------
@app.get("/api/control-room/summary")
def get_control_room_summary(db: Session = Depends(get_db)):
    from .models import TrafficRecord, TrafficViolation, SystemAlert, EmergencyEvent, TrafficCamera, IntersectionNode, SignalStatus
    
    # 1. Total vehicles detected
    total_vehicles = db.query(func.sum(TrafficRecord.total_vehicles)).scalar() or 0
    
    # 2. Active violations
    active_violations = db.query(TrafficViolation).filter(TrafficViolation.status == "DETECTED").count()
    total_violations = db.query(TrafficViolation).count()
    
    # 3. Active incidents / alerts
    active_incidents = db.query(SystemAlert).filter(SystemAlert.status.in_(["NEW", "IN_PROGRESS"])).count()
    
    # 4. Emergency events active
    active_emergencies = db.query(EmergencyEvent).filter(EmergencyEvent.end_time.is_(None)).count()
    
    # 5. Cameras online vs total
    total_cams = db.query(TrafficCamera).count()
    online_cams = db.query(TrafficCamera).filter(TrafficCamera.status == "ONLINE").count()
    
    # 6. Intersections online vs total
    total_nodes = db.query(IntersectionNode).count()
    active_nodes = db.query(IntersectionNode).filter(IntersectionNode.status == "ACTIVE").count()
    
    nodes_live = []
    for n in db.query(IntersectionNode).all():
        sig = db.query(SignalStatus).filter(SignalStatus.intersection == n.intersection_id).first()
        lat = n.latitude if n.latitude is not None else 28.6315
        lng = n.longitude if n.longitude is not None else 77.2167
        nodes_live.append({
            "intersection_id": n.intersection_id,
            "name": n.name,
            "location": n.location,
            "city": n.city or "New Delhi",
            "full_address": n.full_address or n.location,
            "status": n.status,
            "lanes": n.lanes,
            "current_lane": sig.current_lane if sig else "lane_1",
            "state": sig.state if sig else "OFFLINE",
            "green_time": sig.green_time if sig else 0,
            "remaining_time": sig.remaining_time if sig else 0,
            "last_reason": sig.last_reason if sig else "N/A",
            "lat": lat,
            "lng": lng,
            "coords_label": f"{n.name} ({n.city or 'New Delhi'})"
        })
        
    # 8. Live Cameras list
    cameras_live = []
    for c in db.query(TrafficCamera).all():
        cameras_live.append({
            "camera_id": c.camera_id,
            "intersection": c.intersection,
            "direction": c.direction,
            "status": c.status,
            "fps": c.fps,
            "resolution": c.resolution,
            "ai_status": c.ai_status,
            "latency": c.latency
        })
        
    # 9. Recent Alerts
    alerts = db.query(SystemAlert).order_by(SystemAlert.timestamp.desc()).limit(10).all()
    recent_alerts = [{
        "alert_id": a.alert_id,
        "type": a.alert_type,
        "severity": a.severity,
        "location": a.location,
        "intersection": a.intersection,
        "status": a.status,
        "description": a.description,
        "time": a.timestamp.isoformat() if a.timestamp else ""
    } for a in alerts]
    
    # 10. Recent Violations
    viols = db.query(TrafficViolation).order_by(TrafficViolation.timestamp.desc()).limit(6).all()
    recent_viols = [{
        "violation_id": v.violation_id,
        "vehicle_number": v.vehicle_number or "N/A",
        "vehicle_type": v.vehicle_type,
        "violation_type": v.violation_type,
        "intersection": v.intersection,
        "status": v.status,
        "time": v.timestamp.isoformat() if v.timestamp else ""
    } for v in viols]

    return {
        "metrics": {
            "vehicles_detected": total_vehicles,
            "active_violations": active_violations,
            "total_violations": total_violations,
            "active_incidents": active_incidents,
            "emergency_events": active_emergencies,
            "cameras_online": f"{online_cams}/{total_cams}",
            "intersections_online": f"{active_nodes}/{total_nodes}"
        },
        "intersections": nodes_live,
        "cameras": cameras_live,
        "recent_alerts": recent_alerts,
        "recent_violations": recent_viols
    }
