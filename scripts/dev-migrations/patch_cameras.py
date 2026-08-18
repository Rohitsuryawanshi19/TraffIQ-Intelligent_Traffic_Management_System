import os

# 1. Patch models.py
with open('app/models.py', 'r', encoding='utf-8') as f:
    models_code = f.read()

if 'TrafficCamera' not in models_code:
    models_code += """
class TrafficCamera(Base):
    __tablename__ = "traffic_cameras"
    id = Column(Integer, primary_key=True, index=True)
    camera_id = Column(String, unique=True, index=True)
    intersection = Column(String)
    direction = Column(String)
    status = Column(String, default="OFFLINE")
    fps = Column(Float, default=0.0)
    resolution = Column(String, default="1080p")
    ai_status = Column(String, default="STOPPED")
    last_heartbeat = Column(DateTime, nullable=True)
    latency = Column(Integer, default=0)
"""
    with open('app/models.py', 'w', encoding='utf-8') as f:
        f.write(models_code)

# 2. Patch schemas.py
with open('app/schemas.py', 'r', encoding='utf-8') as f:
    schemas_code = f.read()

if 'TrafficCameraResponse' not in schemas_code:
    schemas_code += """
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
"""
    with open('app/schemas.py', 'w', encoding='utf-8') as f:
        f.write(schemas_code)

# 3. Patch main.py API
with open('app/main.py', 'r', encoding='utf-8') as f:
    main_code = f.read()

if '/api/cameras' not in main_code:
    main_code += """
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
"""
    with open('app/main.py', 'w', encoding='utf-8') as f:
        f.write(main_code)
