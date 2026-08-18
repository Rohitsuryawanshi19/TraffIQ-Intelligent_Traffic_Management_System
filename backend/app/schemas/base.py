from pydantic import BaseModel, Field
from datetime import datetime
from typing import Optional, Dict

class UserCreate(BaseModel):
    username: str
    email: str
    password: str
    role: str = "VIEWER"

class UserResponse(BaseModel):
    id: int
    username: str
    email: Optional[str] = None
    role: str
    is_active: bool

    class Config:
        from_attributes = True

class LoginRequest(BaseModel):
    username: str
    password: str

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse

class CongestionConfigSchema(BaseModel):
    weight_density: float = 0.4
    weight_wait_time: float = 0.4
    weight_flow: float = 0.2
    max_lane_capacity: int = 50
    base_wait_time_sec_per_vehicle: float = 12.0

class TrafficAnalyzeRequest(BaseModel):
    intersection: str = "junction_1"
    lane_1: int = Field(ge=0, default=0)
    lane_2: int = Field(ge=0, default=0)
    lane_3: int = Field(ge=0, default=0)
    lane_4: int = Field(ge=0, default=0)

class SignalOverrideRequest(BaseModel):
    intersection: str = "junction_1"
    target_lane: str = "lane_1"
    green_time: int = 60

class TrafficRecordResponse(BaseModel):
    id: int
    intersection: str
    lane_1: int
    lane_2: int
    lane_3: int
    lane_4: int
    total_vehicles: int
    traffic_level: str
    timestamp: datetime

    class Config:
        from_attributes = True

class SignalStatusResponse(BaseModel):
    intersection: str
    current_lane: str
    state: str
    green_time: int
    remaining_time: int
    last_reason: str = "N/A"
    updated_at: datetime

    class Config:
        from_attributes = True

class AnalyticsSummaryResponse(BaseModel):
    total_observations: int
    avg_vehicles: float
    max_vehicles: int
    peak_lane: str
    current_lane: str
    signal_state: str
    green_time: int
    lane_counts: Dict[str, int]

class VehicleDetectionResponse(BaseModel):
    id: int
    intersection: str
    track_id: str
    vehicle_type: str
    lane: str
    direction: str
    confidence: float
    speed: Optional[float]
    entry_time: datetime
    exit_time: Optional[datetime]

    class Config:
        from_attributes = True

class VehicleStatsResponse(BaseModel):
    total: int
    by_type: Dict[str, int]
    by_lane: Dict[str, int]
    by_direction: Dict[str, int]
    per_hour: float

class TrafficViolationResponse(BaseModel):
    id: int
    violation_id: str
    vehicle_id: str
    vehicle_number: Optional[str]
    vehicle_type: str
    violation_type: str
    intersection: str
    camera: str
    lane: str
    status: str
    confidence: float
    timestamp: datetime
    signal_state: Optional[str] = None
    estimated_speed: Optional[float] = None
    evidence_before_img: Optional[str] = None
    evidence_viol_img: Optional[str] = None
    evidence_after_img: Optional[str] = None
    evidence_video: Optional[str] = None

    class Config:
        from_attributes = True

class ChallanResponse(BaseModel):
    id: int
    challan_id: str
    violation_id: str
    vehicle_number: str
    vehicle_type: str
    violation_type: str
    location: str
    timestamp: datetime
    fine_amount: float
    status: str

    class Config:
        from_attributes = True

class TrafficRuleBase(BaseModel):
    violation_type: str
    vehicle_type: str
    penalty_amount: float
    repeat_offence_amount: float
    is_active: bool = True

class TrafficRuleCreate(TrafficRuleBase):
    pass

class TrafficRuleResponse(TrafficRuleBase):
    id: int
    rule_id: str
    effective_from: datetime
    effective_to: Optional[datetime] = None

    class Config:
        from_attributes = True

class AuditLogResponse(BaseModel):
    id: int
    action: str
    entity: str
    entity_id: str
    details: str
    timestamp: datetime
    user_id: str

    class Config:
        from_attributes = True

class EmergencyEventBase(BaseModel):
    vehicle_type: str
    vehicle_id: str
    current_intersection: str
    current_lane: str
    direction: str
    next_intersections: str
    priority_status: str = "REQUESTED"

class EmergencyEventCreate(EmergencyEventBase):
    pass

class EmergencyEventResponse(EmergencyEventBase):
    id: int
    event_id: str
    start_time: datetime
    end_time: Optional[datetime] = None

    class Config:
        from_attributes = True

class TrafficCameraResponse(BaseModel):
    id: int
    camera_id: str
    intersection: str
    direction: str
    status: str
    fps: float
    resolution: str
    ai_status: str
    last_heartbeat: Optional[datetime] = None
    latency: int

    class Config:
        from_attributes = True

class IntersectionResponse(BaseModel):
    id: int
    intersection_id: str
    name: str
    location: str
    city: Optional[str] = "New Delhi"
    full_address: Optional[str] = None
    latitude: Optional[float] = 28.6315
    longitude: Optional[float] = 77.2167
    status: str
    lanes: int
    cameras: int = 0
    signals: int = 0
    current_traffic: str = "UNKNOWN"
    current_phase: str = "UNKNOWN"

    class Config:
        from_attributes = True

class SystemAlertResponse(BaseModel):
    id: int
    alert_id: str
    alert_type: str
    severity: str
    location: str
    intersection: str
    timestamp: datetime
    status: str
    description: str

    class Config:
        from_attributes = True

class SystemAlertUpdate(BaseModel):
    status: str
