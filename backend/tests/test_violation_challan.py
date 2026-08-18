import pytest
from datetime import datetime, timezone
from app.models import SignalStatus, TrafficViolation, Challan, TrafficRule
from app.main import create_vehicle_detection, VehicleDetectionCreate, update_violation_status, ViolationStatusUpdate
from app.database import SessionLocal

def test_red_light_violation_detection_and_approval_challan_flow():
    db = SessionLocal()
    try:
        now = datetime.now(timezone.utc)
        
        # 1. Ensure SignalStatus exists with active green lane = lane_1 (lane_2 is RED)
        sig = db.query(SignalStatus).filter(SignalStatus.intersection == "junction_test_v").first()
        if not sig:
            sig = SignalStatus(
                intersection="junction_test_v",
                current_lane="lane_1",
                state="GREEN",
                green_time=30,
                remaining_time=30,
                updated_at=now
            )
            db.add(sig)
        else:
            sig.current_lane = "lane_1"
            sig.state = "GREEN"
            sig.green_time = 30
            sig.remaining_time = 30
            sig.updated_at = now

        # 2. Ensure TrafficRule exists for Red Light Violation
        rule = db.query(TrafficRule).filter(TrafficRule.violation_type == "Red Light Violation").first()
        if not rule:
            rule = TrafficRule(
                rule_id="TR-TEST-RLV",
                violation_type="Red Light Violation",
                vehicle_type="All",
                penalty_amount=1500.0,
                repeat_offence_amount=3000.0
            )
            db.add(rule)
        db.commit()

        # 3. Post simulated vehicle detection in lane_2 (which is RED)
        track_id = f"TEST-TRACK-{now.timestamp()}"
        req = VehicleDetectionCreate(
            intersection="junction_test_v",
            camera="CAM_01",
            track_id=track_id,
            vehicle_type="car",
            lane="lane_2",
            direction="Southbound",
            confidence=0.95,
            speed=48.0
        )
        
        det = create_vehicle_detection(req, db)
        assert det is not None
        assert det.track_id == track_id

        # 4. Assert TrafficViolation record was created with status DETECTED
        viol = db.query(TrafficViolation).filter(TrafficViolation.vehicle_id == track_id).first()
        assert viol is not None
        assert viol.violation_type == "Red Light Violation"
        assert viol.lane == "lane_2"

        # 5. Approve violation as traffic officer
        class MockOfficer:
            username = "test_officer"
            role = "TRAFFIC_OFFICER"

        update_req = ViolationStatusUpdate(status="APPROVED", notes="Approved via automated unit test")
        updated_viol = update_violation_status(viol.violation_id, update_req, db, MockOfficer())

        # 6. Assert Challan was created with exact fine amount from TrafficRule
        assert updated_viol.status == "CHALLAN GENERATED"
        challan = db.query(Challan).filter(Challan.violation_id == viol.violation_id).first()
        assert challan is not None
        assert challan.fine_amount == rule.penalty_amount
        assert challan.status == "ISSUED"

    finally:
        db.close()
