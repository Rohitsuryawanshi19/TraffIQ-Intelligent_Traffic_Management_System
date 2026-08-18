import re

with open('app/main.py', 'r', encoding='utf-8') as f:
    code = f.read()

control_room_endpoint = '''
# ---------------------------------------------------------------------------
# Control Room Live Real-Time Operations Endpoint
# ---------------------------------------------------------------------------
@app.get("/api/control-room/summary")
def get_control_room_summary(db: Session = Depends(get_db)):
    from .models import TrafficRecord, TrafficViolation, SystemAlert, EmergencyEvent, TrafficCamera, IntersectionNode, SignalStatus
    
    # 1. Total vehicles detected
    total_vehicles = db.query(func.sum(TrafficRecord.total_vehicles)).scalar() or 0
    
    # 2. Active violations
    active_violations = db.query(TrafficViolation).filter(TrafficViolation.status == "DETECTED").count()
    total_violations = db.query(TrafficViolation).count()
    
    # 3. Active incidents / alerts
    active_incidents = db.query(SystemAlert).filter(SystemAlert.status.in_(["NEW", "IN_PROGRESS"])).count()
    
    # 4. Emergency events active
    active_emergencies = db.query(EmergencyEvent).filter(EmergencyEvent.end_time == None).count()
    
    # 5. Cameras online vs total
    total_cams = db.query(TrafficCamera).count()
    online_cams = db.query(TrafficCamera).filter(TrafficCamera.status == "ONLINE").count()
    
    # 6. Intersections online vs total
    total_nodes = db.query(IntersectionNode).count()
    active_nodes = db.query(IntersectionNode).filter(IntersectionNode.status == "ACTIVE").count()
    
    # 7. Live Node list with status and Demo GPS coordinates
    demo_coords = {
        "junction_1": {"lat": 28.6139, "lng": 77.2090, "name": "Connaught Place Junction (Demo)"},
        "junction_2": {"lat": 28.5355, "lng": 77.3910, "name": "Noida Sector 62 Junction (Demo)"},
        "junction_3": {"lat": 28.4595, "lng": 77.0266, "name": "Gurugram Cyber Hub Junction (Demo)"},
    }
    
    nodes_live = []
    for n in db.query(IntersectionNode).all():
        sig = db.query(SignalStatus).filter(SignalStatus.intersection == n.intersection_id).first()
        coords = demo_coords.get(n.intersection_id, {"lat": 28.61, "lng": 77.20, "name": n.name})
        nodes_live.append({
            "intersection_id": n.intersection_id,
            "name": n.name,
            "location": n.location,
            "status": n.status,
            "lanes": n.lanes,
            "current_lane": sig.current_lane if sig else "lane_1",
            "state": sig.state if sig else "OFFLINE",
            "green_time": sig.green_time if sig else 0,
            "remaining_time": sig.remaining_time if sig else 0,
            "last_reason": sig.last_reason if sig else "N/A",
            "lat": coords["lat"],
            "lng": coords["lng"],
            "coords_label": coords["name"]
        })
        
    # 8. Live Cameras list
    cameras_live = []
    for c in db.query(TrafficCamera).all():
        cameras_live.append({
            "camera_id": c.camera_id,
            "intersection": c.intersection,
            "direction": c.direction,
            "status": c.status,
            "fps": c.fps,
            "resolution": c.resolution,
            "ai_status": c.ai_status,
            "latency": c.latency
        })
        
    # 9. Recent Alerts
    alerts = db.query(SystemAlert).order_by(SystemAlert.timestamp.desc()).limit(10).all()
    recent_alerts = [{
        "alert_id": a.alert_id,
        "type": a.alert_type,
        "severity": a.severity,
        "location": a.location,
        "intersection": a.intersection,
        "status": a.status,
        "description": a.description,
        "time": a.timestamp.isoformat() if a.timestamp else ""
    } for a in alerts]
    
    # 10. Recent Violations
    viols = db.query(TrafficViolation).order_by(TrafficViolation.timestamp.desc()).limit(6).all()
    recent_viols = [{
        "violation_id": v.violation_id,
        "vehicle_number": v.vehicle_number or "N/A",
        "vehicle_type": v.vehicle_type,
        "violation_type": v.violation_type,
        "intersection": v.intersection,
        "status": v.status,
        "time": v.timestamp.isoformat() if v.timestamp else ""
    } for v in viols]

    return {
        "metrics": {
            "vehicles_detected": total_vehicles,
            "active_violations": active_violations,
            "total_violations": total_violations,
            "active_incidents": active_incidents,
            "emergency_events": active_emergencies,
            "cameras_online": f"{online_cams}/{total_cams}",
            "intersections_online": f"{active_nodes}/{total_nodes}"
        },
        "intersections": nodes_live,
        "cameras": cameras_live,
        "recent_alerts": recent_alerts,
        "recent_violations": recent_viols
    }
'''

if "/api/control-room/summary" not in code:
    code += "\n" + control_room_endpoint
    with open('app/main.py', 'w', encoding='utf-8') as f:
        f.write(code)
    print("Control room endpoint added")
else:
    print("Control room endpoint already exists")
