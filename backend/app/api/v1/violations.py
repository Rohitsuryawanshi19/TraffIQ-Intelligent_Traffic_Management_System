from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Optional

from ...database import get_db
from ...models import TrafficViolation, Challan, TrafficRule
from ...auth import require_roles, any_authenticated

violations_router = APIRouter(tags=["violations"])

@violations_router.get('/violations')
def get_violations_route(status: Optional[str] = None, limit: int = 50, db: Session = Depends(get_db)):
    query = db.query(TrafficViolation)
    if status:
        query = query.filter(TrafficViolation.status == status.upper())
    violations = query.order_by(TrafficViolation.id.desc()).limit(limit).all()
    return [{
        "id": v.id,
        "violation_id": v.violation_id,
        "intersection": v.intersection,
        "camera_id": v.camera_id,
        "violation_type": v.violation_type,
        "vehicle_type": v.vehicle_type,
        "vehicle_number": v.vehicle_number,
        "fine_amount": v.fine_amount,
        "status": v.status,
        "timestamp": v.timestamp.isoformat() if v.timestamp else None
    } for v in violations]

@violations_router.get('/challans')
def get_challans_route(limit: int = 50, db: Session = Depends(get_db)):
    challans = db.query(Challan).order_by(Challan.id.desc()).limit(limit).all()
    return [{
        "id": c.id,
        "challan_number": c.challan_number,
        "violation_id": c.violation_id,
        "amount": c.amount,
        "status": c.status,
        "issue_date": c.issue_date.isoformat() if c.issue_date else None
    } for c in challans]
