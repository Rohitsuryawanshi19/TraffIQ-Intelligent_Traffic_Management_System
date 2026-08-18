import uuid
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
