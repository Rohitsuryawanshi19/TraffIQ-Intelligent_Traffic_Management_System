import re

with open('app/main.py', 'r', encoding='utf-8') as f:
    code = f.read()

admin_routes = '''
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
    lanes: int = 4
    status: str = "ACTIVE"

@app.post("/api/admin/intersections")
def create_intersection(req: IntersectionCreateSchema, db: Session = Depends(get_db), current_user=Depends(admin_only)):
    from .models import IntersectionNode
    existing = db.query(IntersectionNode).filter(IntersectionNode.intersection_id == req.intersection_id).first()
    if existing:
        raise HTTPException(status_code=400, detail="Intersection ID exists")
    node = IntersectionNode(intersection_id=req.intersection_id, name=req.name, location=req.location, lanes=req.lanes, status=req.status)
    db.add(node)
    db.commit()
    db.refresh(node)
    write_audit(db, "CREATED", "INTERSECTION", f"Intersection: {node.name}", node.intersection_id,
                new_value=f"Location: {node.location}, Lanes: {node.lanes}", details="Created new intersection node",
                username=current_user.username, role=current_user.role)
    return node

@app.put("/api/admin/intersections/{intersection_id}")
def update_intersection(intersection_id: str, req: IntersectionCreateSchema, db: Session = Depends(get_db), current_user=Depends(admin_only)):
    from .models import IntersectionNode
    node = db.query(IntersectionNode).filter(IntersectionNode.intersection_id == intersection_id).first()
    if not node:
        raise HTTPException(status_code=404, detail="Intersection not found")
    prev_str = f"Name: {node.name}, Status: {node.status}, Lanes: {node.lanes}"
    node.name = req.name
    node.location = req.location
    node.lanes = req.lanes
    node.status = req.status
    db.commit()
    new_str = f"Name: {node.name}, Status: {node.status}, Lanes: {node.lanes}"
    write_audit(db, "UPDATED", "INTERSECTION", f"Intersection: {node.name}", node.intersection_id,
                prev_value=prev_str, new_value=new_str, details="Updated intersection details",
                username=current_user.username, role=current_user.role)
    return node
'''

if "/api/admin/signal-config" not in code:
    code += "\n" + admin_routes
    with open('app/main.py', 'w', encoding='utf-8') as f:
        f.write(code)
    print("Admin endpoints patched")
else:
    print("Admin endpoints already exist")
