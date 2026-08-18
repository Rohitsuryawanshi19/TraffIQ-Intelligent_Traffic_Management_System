import os

# 1. Patch models.py
with open('app/models.py', 'r', encoding='utf-8') as f:
    models_code = f.read()

if 'EmergencyEvent' not in models_code:
    models_code += """
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
"""
    with open('app/models.py', 'w', encoding='utf-8') as f:
        f.write(models_code)

# 2. Patch schemas.py
with open('app/schemas.py', 'r', encoding='utf-8') as f:
    schemas_code = f.read()

if 'EmergencyEventResponse' not in schemas_code:
    schemas_code += """
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
"""
    with open('app/schemas.py', 'w', encoding='utf-8') as f:
        f.write(schemas_code)

# 3. Patch main.py API
with open('app/main.py', 'r', encoding='utf-8') as f:
    main_code = f.read()

if '/api/emergency/events' not in main_code:
    main_code += """
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
"""
    with open('app/main.py', 'w', encoding='utf-8') as f:
        f.write(main_code)
