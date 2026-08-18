import sys
import os
import json
import uuid
import pytest
from datetime import datetime, timezone

# Add backend to path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "backend")))

from app.database import SessionLocal, engine, Base
from app.models import (
    VehicleDetection, VehicleTrack, VehicleCrossing, TrafficRecord,
    TrafficViolation, Challan, TrafficRule, SignalStatus, TrafficTimeSeries
)
from app.services.vehicle_service import VehicleService
from app.services.anpr_service import anpr_service
from app.core.vehicle_classes import resolve_vehicle_class, get_taxonomy_summary

def setup_module(module):
    """Ensure database schema is created."""
    Base.metadata.create_all(bind=engine)

def test_centralized_vehicle_taxonomy():
    """Test resolution of COCO and BMD-45 vehicle classes."""
    # COCO Class 2 -> Car
    c_def = resolve_vehicle_class(2, "coco")
    assert c_def.app_class_name == "car"

    # BMD-45 Class 6 -> Auto Rickshaw
    b_def = resolve_vehicle_class(6, "bmd45")
    assert b_def.app_class_name == "auto_rickshaw"

    # Emergency vehicle -> Unsupported by baseline weights
    e_def = resolve_vehicle_class(12, "bmd45")
    assert e_def.is_supported == False
    assert e_def.requires_custom_weights == True

    summary = get_taxonomy_summary()
    assert len(summary) >= 8

def test_persistent_vehicle_tracking_and_deduplication():
    """Test persistent vehicle tracking and single line-crossing deduplication."""
    db = SessionLocal()
    try:
        t_id = f"TEST-TRACK-999"

        # 1. First line crossing event
        track1 = VehicleService.upsert_vehicle_track(
            db, track_id=t_id, vehicle_type="car",
            intersection_id="junction_1", camera_id="CAM_01",
            lane="lane_1", direction="North->South", confidence=0.92
        )
        assert track1.track_id == t_id
        assert track1.vehicle_type == "car"

        # 2. Second frame update for same vehicle track
        track2 = VehicleService.upsert_vehicle_track(
            db, track_id=t_id, vehicle_type="car",
            intersection_id="junction_1", camera_id="CAM_01",
            lane="lane_1", direction="North->South", confidence=0.95
        )
        assert track2.id == track1.id # Must update same record instead of creating duplicate

    finally:
        db.close()

def test_anpr_honest_reporting():
    """Test that ANPRService reports unconfigured status instead of fabricating fake registration numbers."""
    res = anpr_service.process_plate_crop()
    assert res["is_configured"] == False
    assert res["vehicle_number"] is None
    assert res["status"] == "ANPR_NOT_CONFIGURED"

def test_violation_to_challan_master_rule_lookup():
    """Test end-to-end violation creation and rule-based challan generation."""
    db = SessionLocal()
    try:
        # Create test traffic rule in master table
        rule = db.query(TrafficRule).filter(TrafficRule.violation_type == "Red Light Violation").first()
        if not rule:
            rule = TrafficRule(
                rule_id="RULE-RLV-01",
                violation_type="Red Light Violation",
                vehicle_type="All",
                penalty_amount=1000.0,
                repeat_offence_amount=2000.0,
                is_active=True
            )
            db.add(rule)
            db.commit()

        v_id = f"RLV-TEST-E2E-{uuid.uuid4().hex[:6]}"
        t_id = f"E2E-TRK-{uuid.uuid4().hex[:6]}"
        # Create violation record
        viol = TrafficViolation(
            violation_id=v_id,
            vehicle_id=t_id,
            vehicle_number=None, # ANPR unconfigured
            vehicle_type="car",
            violation_type="Red Light Violation",
            intersection="junction_1",
            camera="CAM_01",
            lane="lane_1",
            status="DETECTED",
            confidence=0.94,
            timestamp=datetime.now(timezone.utc),
            signal_state="RED"
        )
        db.add(viol)
        db.commit()

        # Simulate Officer Approval
        viol.status = "APPROVED"
        fine = rule.penalty_amount if rule else 1000.0

        c_id = f"CH-E2E-{uuid.uuid4().hex[:6]}"
        challan = Challan(
            challan_id=c_id,
            violation_id=viol.violation_id,
            vehicle_number=viol.vehicle_number,
            vehicle_type=viol.vehicle_type,
            violation_type=viol.violation_type,
            location=f"{viol.intersection} / {viol.camera}",
            timestamp=datetime.now(timezone.utc),
            fine_amount=fine,
            status="ISSUED"
        )
        db.add(challan)
        viol.status = "CHALLAN GENERATED"
        db.commit()

        # Verify links
        fetched_challan = db.query(Challan).filter(Challan.violation_id == v_id).first()
        assert fetched_challan is not None
        assert fetched_challan.fine_amount == 1000.0
        assert fetched_challan.vehicle_number is None

    finally:
        db.close()
