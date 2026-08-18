from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func
from pydantic import BaseModel as PydanticBase

from ...database import get_db
from ...auth import admin_only
from ...core.config import settings

admin_router = APIRouter(tags=["admin"])

@admin_router.get('/system/mode')
def get_system_mode_route():
    return {
        "system_mode": settings.SYSTEM_MODE,
        "auto_challan_generation": settings.AUTO_CHALLAN_GENERATION,
        "data_retention_days": settings.DATA_RETENTION_DAYS,
        "data_mode": getattr(settings, "DATA_MODE", "recorded_video")
    }

class ClearDataSchema(PydanticBase):
    target: str # METR_LA, BMD45, RECORDED_VIDEO, DEMO

@admin_router.post("/admin/clear-data")
def clear_admin_data_route(req: ClearDataSchema, db: Session = Depends(get_db), current_user=Depends(admin_only)):
    from ...models import VehicleDetection, VehicleTrack, TrafficRecord, TrafficViolation, TrafficTimeSeries
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
    return {"status": "success", "target": tgt, "deleted_count": deleted_count}

@admin_router.get("/admin/data-stats")
def get_admin_data_stats_route(db: Session = Depends(get_db), current_user=Depends(admin_only)):
    from ...models import VehicleDetection, VehicleTrack, TrafficRecord, TrafficViolation, Challan, SystemAlert, TrafficTimeSeries
    return {
        "vehicle_detections": db.query(func.count(VehicleDetection.id)).scalar() or 0,
        "vehicle_tracks": db.query(func.count(VehicleTrack.id)).scalar() or 0,
        "traffic_records": db.query(func.count(TrafficRecord.id)).scalar() or 0,
        "traffic_violations": db.query(func.count(TrafficViolation.id)).scalar() or 0,
        "challans": db.query(func.count(Challan.id)).scalar() or 0,
        "system_alerts": db.query(func.count(SystemAlert.id)).scalar() or 0,
        "metr_la_records": db.query(func.count(TrafficTimeSeries.id)).filter(TrafficTimeSeries.source == "METR-LA").scalar() or 0
    }
