import os

# 1. app/services/audit_service.py
with open('app/services/audit_service.py', 'w', encoding='utf-8') as f:
    f.write('''import uuid
from datetime import datetime, timezone
from sqlalchemy.orm import Session
from ..models import AuditLog

class AuditService:
    @staticmethod
    def record(db: Session, action: str, module: str, entity: str, entity_id: str = None,
               prev_value: str = None, new_value: str = None, details: str = None,
               username: str = "SYSTEM", role: str = "SYSTEM") -> AuditLog:
        log = AuditLog(
            audit_id=f"AUD-{uuid.uuid4().hex[:10].upper()}",
            username=username,
            role=role,
            action=action,
            module=module,
            entity=entity,
            entity_id=str(entity_id) if entity_id else None,
            prev_value=str(prev_value)[:500] if prev_value else None,
            new_value=str(new_value)[:500] if new_value else None,
            details=details,
        )
        db.add(log)
        db.commit()
        db.refresh(log)
        return log
''')

# 2. app/services/signal_service.py
with open('app/services/signal_service.py', 'w', encoding='utf-8') as f:
    f.write('''from datetime import datetime, timezone
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
''')

print("Created audit and signal services")
