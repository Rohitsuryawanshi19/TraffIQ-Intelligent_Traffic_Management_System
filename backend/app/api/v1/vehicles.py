from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List, Optional

from ...database import get_db
from ...models import TrafficRecord, VehicleDetection, VehicleTrack
from ...schemas import TrafficAnalyzeRequest, TrafficRecordResponse
from ...core.vehicle_classes import get_taxonomy_summary

vehicles_router = APIRouter(tags=["vehicles"])

@vehicles_router.post('/traffic/analyze', response_model=TrafficRecordResponse)
def analyze_traffic_route(req: TrafficAnalyzeRequest, db: Session = Depends(get_db)):
    from ...main import update_signal_internal
    total = req.lane_1 + req.lane_2 + req.lane_3 + req.lane_4
    record = TrafficRecord(
        intersection=req.intersection,
        lane_1=req.lane_1,
        lane_2=req.lane_2,
        lane_3=req.lane_3,
        lane_4=req.lane_4,
        total_vehicles=total,
        source=req.source
    )
    db.add(record)
    db.commit()
    db.refresh(record)

    update_signal_internal(req.intersection, req.lane_1, req.lane_2, req.lane_3, req.lane_4, db)
    return record

@vehicles_router.get('/traffic/history', response_model=List[TrafficRecordResponse])
def get_traffic_history_route(intersection: str = "junction_1", limit: int = 20, db: Session = Depends(get_db)):
    records = (
        db.query(TrafficRecord)
        .filter(TrafficRecord.intersection == intersection)
        .order_by(TrafficRecord.id.desc())
        .limit(limit)
        .all()
    )
    return records

@vehicles_router.get('/vehicles/taxonomy')
def get_vehicles_taxonomy_route():
    return get_taxonomy_summary()

@vehicles_router.get('/vehicles/stats')
def get_vehicles_stats_route(intersection: str = "junction_1", db: Session = Depends(get_db)):
    total = db.query(func.count(VehicleDetection.id)).scalar() or 0
    by_type_rows = db.query(VehicleDetection.vehicle_type, func.count(VehicleDetection.id)).group_by(VehicleDetection.vehicle_type).all()
    by_lane_rows = db.query(VehicleDetection.lane, func.count(VehicleDetection.id)).group_by(VehicleDetection.lane).all()
    
    return {
        "total": total,
        "by_type": {r[0]: r[1] for r in by_type_rows if r[0]},
        "by_lane": {r[0]: r[1] for r in by_lane_rows if r[0]}
    }
