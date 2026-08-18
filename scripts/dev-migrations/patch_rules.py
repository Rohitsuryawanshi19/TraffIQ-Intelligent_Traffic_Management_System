import os

# 1. Patch models.py
with open('app/models.py', 'r', encoding='utf-8') as f:
    models_code = f.read()

if 'TrafficRule' not in models_code:
    if 'Boolean' not in models_code:
        models_code = models_code.replace('from sqlalchemy import Column', 'from sqlalchemy import Column, Boolean')
    
    models_code += """
class TrafficRule(Base):
    __tablename__ = "traffic_rules"
    id = Column(Integer, primary_key=True, index=True)
    rule_id = Column(String, unique=True, index=True)
    violation_type = Column(String)
    vehicle_type = Column(String)
    penalty_amount = Column(Float)
    repeat_offence_amount = Column(Float)
    is_active = Column(Boolean, default=True)
    effective_from = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    effective_to = Column(DateTime, nullable=True)

class AuditLog(Base):
    __tablename__ = "audit_logs"
    id = Column(Integer, primary_key=True, index=True)
    action = Column(String)
    entity = Column(String)
    entity_id = Column(String)
    details = Column(String)
    timestamp = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    user_id = Column(String, default="SYSTEM_ADMIN")
"""
    with open('app/models.py', 'w', encoding='utf-8') as f:
        f.write(models_code)

# 2. Patch schemas.py
with open('app/schemas.py', 'r', encoding='utf-8') as f:
    schemas_code = f.read()

if 'TrafficRuleResponse' not in schemas_code:
    schemas_code += """
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
"""
    with open('app/schemas.py', 'w', encoding='utf-8') as f:
        f.write(schemas_code)

# 3. Patch main.py API
with open('app/main.py', 'r', encoding='utf-8') as f:
    main_code = f.read()

if '/api/rules' not in main_code:
    main_code += """
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

@app.get('/api/audit-logs', response_model=List[AuditLogResponse])
def get_audit_logs(db: Session = Depends(get_db)):
    return db.query(AuditLog).order_by(AuditLog.timestamp.desc()).limit(100).all()
"""
    with open('app/main.py', 'w', encoding='utf-8') as f:
        f.write(main_code)
