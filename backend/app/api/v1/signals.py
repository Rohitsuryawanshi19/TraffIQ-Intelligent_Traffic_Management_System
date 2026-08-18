from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from datetime import datetime, timezone
from typing import Optional

from ...database import get_db
from ...models import SignalStatus, TrafficRecord
from ...schemas import SignalStatusResponse
from ...adaptive_controller import force_lane_for_emergency

signals_router = APIRouter(tags=["signals"])

@signals_router.get('/signal/status', response_model=SignalStatusResponse)
@signals_router.get('/signals/status/{intersection_id}', response_model=SignalStatusResponse)
def get_signal_status_route(intersection_id: str = "junction_1", intersection: str = "junction_1", db: Session = Depends(get_db)):
    from ...main import update_signal_internal
    target_intersection = intersection_id if intersection_id != "junction_1" else intersection
    latest_record = (
        db.query(TrafficRecord)
        .filter(TrafficRecord.intersection == target_intersection)
        .order_by(TrafficRecord.id.desc())
        .first()
    )
    if not latest_record:
        status = update_signal_internal(target_intersection, 0, 0, 0, 0, db)
    else:
        status = update_signal_internal(
            target_intersection,
            latest_record.lane_1,
            latest_record.lane_2,
            latest_record.lane_3,
            latest_record.lane_4,
            db
        )
    return status

@signals_router.post('/signal/override')
def override_signal_route(target_lane: str = "lane_1", intersection: str = "junction_1", green_time: int = 60, db: Session = Depends(get_db)):
    status = db.query(SignalStatus).filter(SignalStatus.intersection == intersection).first()
    now = datetime.now(timezone.utc)
    if not status:
        status = SignalStatus(
            intersection=intersection,
            current_lane=target_lane,
            state="GREEN",
            green_time=green_time,
            remaining_time=green_time,
            updated_at=now
        )
        db.add(status)
    else:
        status.current_lane = target_lane
        status.state = "GREEN"
        status.green_time = green_time
        status.remaining_time = green_time
        status.updated_at = now
    db.commit()
    db.refresh(status)
    return status

@signals_router.post('/signal/emergency-preemption')
def emergency_preemption_route(target_lane: str = "lane_1", intersection: str = "junction_1", duration: int = 60):
    lane, dur, reason = force_lane_for_emergency(intersection, target_lane, duration)
    return {"status": "success", "lane": lane, "duration": dur, "reason": reason}
