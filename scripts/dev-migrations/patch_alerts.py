import os
from datetime import datetime, timezone

# 1. Patch models.py
with open('app/models.py', 'r', encoding='utf-8') as f:
    models_code = f.read()

if 'SystemAlert' not in models_code:
    models_code += """
class SystemAlert(Base):
    __tablename__ = "system_alerts"
    id = Column(Integer, primary_key=True, index=True)
    alert_id = Column(String, unique=True, index=True)
    alert_type = Column(String)
    severity = Column(String) # LOW, MEDIUM, HIGH, CRITICAL
    location = Column(String)
    intersection = Column(String)
    timestamp = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    status = Column(String, default="NEW") # NEW, ACKNOWLEDGED, IN_PROGRESS, RESOLVED
    description = Column(String)
"""
    with open('app/models.py', 'w', encoding='utf-8') as f:
        f.write(models_code)

# 2. Patch schemas.py
with open('app/schemas.py', 'r', encoding='utf-8') as f:
    schemas_code = f.read()

if 'SystemAlertResponse' not in schemas_code:
    schemas_code += """
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
"""
    with open('app/schemas.py', 'w', encoding='utf-8') as f:
        f.write(schemas_code)

# 3. Patch main.py API
with open('app/main.py', 'r', encoding='utf-8') as f:
    main_code = f.read()

if '/api/alerts' not in main_code:
    main_code += """
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
"""
    with open('app/main.py', 'w', encoding='utf-8') as f:
        f.write(main_code)
