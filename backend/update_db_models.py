import sqlite3, os

MODELS_CODE = '''from datetime import datetime, timezone
from sqlalchemy import Column, Boolean, Integer, String, DateTime, Float, ForeignKey, Text
from sqlalchemy.orm import relationship
from ..database import Base

class Role(Base):
    __tablename__ = "roles"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, index=True, nullable=False) # ADMIN, TRAFFIC_OFFICER, CONTROL_ROOM_OPERATOR, ANALYST, VIEWER
    description = Column(String, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True, nullable=False)
    email = Column(String, unique=True, index=True, nullable=True)
    hashed_password = Column(String, nullable=False)
    role = Column(String, default="VIEWER")
    role_id = Column(Integer, ForeignKey("roles.id", ondelete="SET NULL"), nullable=True)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

class IntersectionNode(Base):
    __tablename__ = "intersections"
    id = Column(Integer, primary_key=True, index=True)
    intersection_id = Column(String, unique=True, index=True, nullable=False)
    name = Column(String, nullable=False)
    location = Column(String, nullable=True)
    status = Column(String, default="ACTIVE")
    lanes = Column(Integer, default=4)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

class TrafficCamera(Base):
    __tablename__ = "traffic_cameras"
    id = Column(Integer, primary_key=True, index=True)
    camera_id = Column(String, unique=True, index=True, nullable=False)
    intersection = Column(String, index=True)
    intersection_node_id = Column(Integer, ForeignKey("intersections.id", ondelete="CASCADE"), nullable=True)
    direction = Column(String)
    status = Column(String, default="OFFLINE")
    fps = Column(Float, default=0.0)
    resolution = Column(String, default="1080p")
    ai_status = Column(String, default="STOPPED")
    last_heartbeat = Column(DateTime, nullable=True)
    latency = Column(Integer, default=0)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

class SignalStatus(Base):
    __tablename__ = "signal_status"
    id = Column(Integer, primary_key=True, index=True)
    intersection = Column(String, default="junction_1", unique=True, index=True)
    intersection_node_id = Column(Integer, ForeignKey("intersections.id", ondelete="CASCADE"), nullable=True)
    current_lane = Column(String, default="lane_1")
    state = Column(String, default="GREEN")
    green_time = Column(Integer, default=30)
    remaining_time = Column(Integer, default=30)
    last_reason = Column(String, default="Initialized")
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

class SignalPhase(Base):
    __tablename__ = "signal_phases"
    id = Column(Integer, primary_key=True, index=True)
    signal_status_id = Column(Integer, ForeignKey("signal_status.id", ondelete="CASCADE"), index=True)
    phase_name = Column(String, nullable=False) # e.g. GREEN_LANE_1
    lane = Column(String, nullable=False)
    duration_seconds = Column(Integer, default=30)
    sequence_order = Column(Integer, default=1)
    is_active = Column(Boolean, default=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

class TrafficRecord(Base):
    __tablename__ = "traffic_records"
    id = Column(Integer, primary_key=True, index=True)
    intersection = Column(String, default="junction_1", index=True)
    lane_1 = Column(Integer, default=0)
    lane_2 = Column(Integer, default=0)
    lane_3 = Column(Integer, default=0)
    lane_4 = Column(Integer, default=0)
    total_vehicles = Column(Integer, default=0)
    traffic_level = Column(String, default="LOW")
    timestamp = Column(DateTime, default=lambda: datetime.now(timezone.utc), index=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

class VehicleTrack(Base):
    __tablename__ = "vehicle_tracks"
    id = Column(Integer, primary_key=True, index=True)
    track_id = Column(String, unique=True, index=True, nullable=False)
    vehicle_type = Column(String, nullable=False)
    first_seen = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    last_seen = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    avg_speed = Column(Float, nullable=True)

class VehicleDetection(Base):
    __tablename__ = "vehicle_detections"
    id = Column(Integer, primary_key=True, index=True)
    intersection = Column(String, default="junction_1", index=True)
    camera = Column(String, nullable=True, index=True)
    track_id = Column(String, index=True)
    vehicle_track_id = Column(Integer, ForeignKey("vehicle_tracks.id", ondelete="SET NULL"), nullable=True)
    vehicle_type = Column(String)
    lane = Column(String)
    direction = Column(String)
    confidence = Column(Float)
    speed = Column(Float, nullable=True)
    entry_time = Column(DateTime, default=lambda: datetime.now(timezone.utc), index=True)
    exit_time = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

class TrafficViolation(Base):
    __tablename__ = "traffic_violations"
    id = Column(Integer, primary_key=True, index=True)
    violation_id = Column(String, unique=True, index=True)
    vehicle_id = Column(String, index=True)
    vehicle_track_id = Column(Integer, ForeignKey("vehicle_tracks.id", ondelete="SET NULL"), nullable=True)
    vehicle_number = Column(String, nullable=True, index=True)
    vehicle_type = Column(String)
    violation_type = Column(String, index=True)
    intersection = Column(String, index=True)
    camera = Column(String)
    lane = Column(String)
    status = Column(String, default="DETECTED", index=True)
    confidence = Column(Float)
    signal_state = Column(String, nullable=True)
    estimated_speed = Column(Float, nullable=True)
    evidence_before_img = Column(String, nullable=True)
    evidence_viol_img = Column(String, nullable=True)
    evidence_after_img = Column(String, nullable=True)
    evidence_video = Column(String, nullable=True)
    timestamp = Column(DateTime, default=lambda: datetime.now(timezone.utc), index=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

class ViolationEvidence(Base):
    __tablename__ = "violation_evidences"
    id = Column(Integer, primary_key=True, index=True)
    violation_id = Column(String, ForeignKey("traffic_violations.violation_id", ondelete="CASCADE"), index=True)
    evidence_type = Column(String, nullable=False) # IMAGE / VIDEO / ANPR_SNAPSHOT
    file_path = Column(String, nullable=False)
    timestamp = Column(DateTime, default=lambda: datetime.now(timezone.utc))

class TrafficRule(Base):
    __tablename__ = "traffic_rules"
    id = Column(Integer, primary_key=True, index=True)
    rule_id = Column(String, unique=True, index=True)
    violation_type = Column(String, nullable=False)
    vehicle_type = Column(String, default="All")
    penalty_amount = Column(Float, nullable=False)
    repeat_offence_amount = Column(Float, nullable=False)
    is_active = Column(Boolean, default=True)
    effective_from = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    effective_to = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

class Challan(Base):
    __tablename__ = "challans"
    id = Column(Integer, primary_key=True, index=True)
    challan_id = Column(String, unique=True, index=True)
    violation_id = Column(String, ForeignKey("traffic_violations.violation_id", ondelete="CASCADE"), index=True)
    vehicle_number = Column(String, index=True)
    vehicle_type = Column(String)
    violation_type = Column(String)
    location = Column(String)
    fine_amount = Column(Float)
    status = Column(String, default="ISSUED", index=True)
    timestamp = Column(DateTime, default=lambda: datetime.now(timezone.utc), index=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

class EmergencyEvent(Base):
    __tablename__ = "emergency_events"
    id = Column(Integer, primary_key=True, index=True)
    event_id = Column(String, unique=True, index=True)
    vehicle_type = Column(String)
    vehicle_id = Column(String)
    current_intersection = Column(String)
    current_lane = Column(String)
    direction = Column(String)
    next_intersections = Column(String)
    priority_status = Column(String)
    start_time = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    end_time = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

class SystemAlert(Base):
    __tablename__ = "system_alerts"
    id = Column(Integer, primary_key=True, index=True)
    alert_id = Column(String, unique=True, index=True)
    alert_type = Column(String)
    severity = Column(String)
    location = Column(String)
    intersection = Column(String)
    status = Column(String, default="NEW", index=True)
    description = Column(String)
    timestamp = Column(DateTime, default=lambda: datetime.now(timezone.utc), index=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

class AuditLog(Base):
    __tablename__ = "audit_logs"
    id = Column(Integer, primary_key=True, index=True)
    audit_id = Column(String, unique=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    username = Column(String, default="SYSTEM", index=True)
    role = Column(String, default="SYSTEM")
    action = Column(String, index=True)
    module = Column(String, index=True)
    entity = Column(String)
    entity_id = Column(String, nullable=True)
    prev_value = Column(Text, nullable=True)
    new_value = Column(Text, nullable=True)
    details = Column(Text, nullable=True)
    timestamp = Column(DateTime, default=lambda: datetime.now(timezone.utc), index=True)
'''

with open('app/models/base.py', 'w', encoding='utf-8') as f:
    f.write(MODELS_CODE)

print("Updated app/models/base.py")

# Create missing tables in SQLite DB automatically
from app.database import engine, Base
Base.metadata.create_all(bind=engine)
print("Updated database tables without deleting existing data")
