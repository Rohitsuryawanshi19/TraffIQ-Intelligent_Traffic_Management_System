from datetime import datetime, timezone
from sqlalchemy.orm import Session
from ..models import SignalStatus
from ..adaptive_controller import calculate_traffic_level, select_next_lane, config

class SignalService:
    @staticmethod
    def get_status(db: Session, intersection: str = "junction_1") -> SignalStatus:
        status = db.query(SignalStatus).filter(SignalStatus.intersection == intersection).first()
        if not status:
            status = SignalStatus(intersection=intersection, current_lane="lane_1", state="GREEN", green_time=30, remaining_time=30, last_reason="Default Init")
            db.add(status)
            db.commit()
            db.refresh(status)
        return status

    @staticmethod
    def override(db: Session, target_lane: str, green_time: int = 60, intersection: str = "junction_1") -> SignalStatus:
        status = SignalService.get_status(db, intersection)
        status.current_lane = target_lane
        status.state = "GREEN"
        status.green_time = green_time
        status.remaining_time = green_time
        status.last_reason = f"Manual Override -> {target_lane}"
        status.updated_at = datetime.now(timezone.utc)
        db.commit()
        db.refresh(status)
        return status
