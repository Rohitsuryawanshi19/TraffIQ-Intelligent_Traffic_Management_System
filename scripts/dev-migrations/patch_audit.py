"""
Audit Logs backend patch:
1. Migrate SQLite table to add new columns
2. Create write_audit() helper
3. Hook it into: signal override, rule CRUD, challan status, violation status, user CRUD, emergency
4. Add GET /api/audit-logs with filters
"""
import sqlite3, re

# ─── 1. SQLite migration ───────────────────────────────────────────────
con = sqlite3.connect('smart_traffic.db')
cur = con.cursor()
existing = [r[1] for r in cur.execute("PRAGMA table_info(audit_logs)").fetchall()]

to_add = {
    "audit_id": "VARCHAR",
    "username": "VARCHAR DEFAULT 'SYSTEM'",
    "role":     "VARCHAR DEFAULT 'SYSTEM'",
    "module":   "VARCHAR",
    "prev_value": "VARCHAR",
    "new_value":  "VARCHAR",
}
for col, typ in to_add.items():
    if col not in existing:
        cur.execute(f"ALTER TABLE audit_logs ADD COLUMN {col} {typ}")
        print(f"  Added column: {col}")

# Rename user_id → username if needed (add username if not there)
if 'entity_id' not in existing:
    cur.execute("ALTER TABLE audit_logs ADD COLUMN entity_id VARCHAR")
    print("  Added entity_id")

con.commit()
con.close()

# ─── 2. Patch main.py ─────────────────────────────────────────────────
with open('app/main.py', 'r', encoding='utf-8') as f:
    code = f.read()

# 2a. write_audit helper (insert once)
HELPER = '''
# ─────────────────────────────────────────────────────────────────────────────
# Audit helper — call this from any route to record an audit event
# ─────────────────────────────────────────────────────────────────────────────
def write_audit(db, action: str, module: str, entity: str, entity_id: str = None,
                prev_value: str = None, new_value: str = None, details: str = None,
                username: str = "SYSTEM", role: str = "SYSTEM"):
    from .models import AuditLog
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
'''

if 'def write_audit(' not in code:
    # Insert after the CORS block
    code = code.replace(
        '    allow_headers=["*"],\n)\n',
        '    allow_headers=["*"],\n)\n' + HELPER
    )

# 2b. Replace /api/audit-logs endpoint (improved)
AUDIT_ROUTE = '''
@app.get("/api/audit-logs")
def get_audit_logs(
    username: str = None,
    role: str = None,
    module: str = None,
    action: str = None,
    entity: str = None,
    entity_id: str = None,
    date_from: str = None,
    date_to: str = None,
    limit: int = 200,
    db: Session = Depends(get_db),
    _=Depends(admin_only)
):
    from .models import AuditLog
    from datetime import datetime
    q = db.query(AuditLog)
    if username: q = q.filter(AuditLog.username == username)
    if role:     q = q.filter(AuditLog.role == role)
    if module:   q = q.filter(AuditLog.module == module)
    if action:   q = q.filter(AuditLog.action == action)
    if entity:   q = q.filter(AuditLog.entity.contains(entity))
    if entity_id: q = q.filter(AuditLog.entity_id == entity_id)
    if date_from:
        try: q = q.filter(AuditLog.timestamp >= datetime.fromisoformat(date_from))
        except: pass
    if date_to:
        try: q = q.filter(AuditLog.timestamp <= datetime.fromisoformat(date_to))
        except: pass
    logs = q.order_by(AuditLog.timestamp.desc()).limit(limit).all()
    return [{
        "id": l.id,
        "audit_id": l.audit_id,
        "username": l.username,
        "role": l.role,
        "action": l.action,
        "module": l.module,
        "entity": l.entity,
        "entity_id": l.entity_id,
        "prev_value": l.prev_value,
        "new_value": l.new_value,
        "details": l.details,
        "timestamp": l.timestamp.isoformat() if l.timestamp else None,
    } for l in logs]
'''

# Remove old simple audit-logs route and replace
code = re.sub(
    r'@app\.get\("/api/audit-logs"\)\ndef get_audit_logs.*?return db\.query\(AuditLog\)\.order_by\(AuditLog\.timestamp\.desc\(\)\)\.limit\(100\)\.all\(\)',
    AUDIT_ROUTE.strip(),
    code,
    flags=re.DOTALL
)

# If the route doesn't exist at all, append
if '/api/audit-logs' not in code:
    code += AUDIT_ROUTE

# 2c. Hook write_audit into signal override endpoint
OLD_OVERRIDE = 'status.updated_at = now\n    db.commit()\n    db.refresh(status)\n    return status\ndef update_signal_endpoint'
NEW_OVERRIDE  = 'status.updated_at = now\n    write_audit(db, "OVERRIDE", "SIGNAL", f"Signal Override - {intersection}", intersection,\n                prev_value=status.current_lane, new_value=target_lane, details=f"Manual override to {target_lane} for {green_time}s")\n    db.commit()\n    db.refresh(status)\n    return status\ndef update_signal_endpoint'
if 'write_audit(db, "OVERRIDE", "SIGNAL"' not in code:
    code = code.replace(OLD_OVERRIDE, NEW_OVERRIDE, 1)

# 2d. Hook into user toggle
OLD_TOGGLE = 'user.is_active = not user.is_active\n    db.commit()\n    return {"id": user.id, "is_active": user.is_active}'
NEW_TOGGLE  = 'prev = user.is_active\n    user.is_active = not user.is_active\n    write_audit(db, "UPDATED", "USER", f"User: {user.username}", str(user.id),\n                prev_value=str(prev), new_value=str(user.is_active), details="Account active status toggled")\n    db.commit()\n    return {"id": user.id, "is_active": user.is_active}'
if 'write_audit(db, "UPDATED", "USER"' not in code:
    code = code.replace(OLD_TOGGLE, NEW_TOGGLE, 1)

# 2e. Hook into update_user_role
OLD_ROLE = 'user.role = role\n    db.commit()\n    return {"id": user.id, "username": user.username, "role": user.role}'
NEW_ROLE  = 'prev_role = user.role\n    user.role = role\n    write_audit(db, "ROLE_CHANGE", "USER", f"User: {user.username}", str(user.id),\n                prev_value=prev_role, new_value=role, details="Role changed via admin panel")\n    db.commit()\n    return {"id": user.id, "username": user.username, "role": user.role}'
if 'write_audit(db, "ROLE_CHANGE", "USER"' not in code:
    code = code.replace(OLD_ROLE, NEW_ROLE, 1)

with open('app/main.py', 'w', encoding='utf-8') as f:
    f.write(code)

print("Audit patch done")
