import json
from datetime import datetime, timezone
from sqlalchemy.orm import Session
from ..models.base import VehicleTrack, VehicleDetection

class VehicleService:
    @staticmethod
    def upsert_vehicle_track(
        db: Session,
        track_id: str,
        vehicle_type: str,
        intersection_id: str = "junction_1",
        camera_id: str = "CAM_01",
        lane: str = "lane_1",
        direction: str = "North->South",
        confidence: float = 0.9,
        bbox: list = None,
        speed: float = None
    ) -> VehicleTrack:
        """
        Upsert a persistent vehicle track record in the database.
        Updates last_seen and telemetry if the track already exists.
        """
        now = datetime.now(timezone.utc)
        bbox_json = json.dumps(bbox) if bbox else None

        track = db.query(VehicleTrack).filter(VehicleTrack.track_id == track_id).first()

        if track:
            # Update existing track record
            track.last_seen = now
            track.lane = lane
            track.direction = direction
            track.confidence = confidence
            if bbox_json:
                track.bbox = bbox_json
            if speed is not None:
                track.avg_speed = speed
        else:
            # Create new persistent track record
            track = VehicleTrack(
                track_id=track_id,
                intersection_id=intersection_id,
                camera_id=camera_id,
                vehicle_type=vehicle_type,
                lane=lane,
                direction=direction,
                confidence=confidence,
                bbox=bbox_json,
                first_seen=now,
                last_seen=now,
                avg_speed=speed
            )
            db.add(track)

        db.commit()
        db.refresh(track)
        return track
