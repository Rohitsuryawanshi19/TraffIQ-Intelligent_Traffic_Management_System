import cv2
import time
import os
import threading
from datetime import datetime, timezone
from pathlib import Path
from typing import Dict, Set

try:
    from ultralytics import YOLO
    YOLO_AVAILABLE = True
except ImportError:
    YOLO_AVAILABLE = False

from app.core.vehicle_classes import assign_lane, get_vehicle_weight, resolve_vehicle_class

BASE_DIR = Path(__file__).resolve().parent.parent.parent

class VideoStreamManager:
    def __init__(self):
        self.source_path = str(BASE_DIR / "data" / "traffic.mp4")
        self.is_running = False
        self.is_paused = False
        self.playback_speed = 1.0  # 0.5x, 1.0x, 2.0x
        self.cap = None
        self.current_frame_jpeg = None
        self.processed_frames = 0
        self.latest_lane_counts: Dict[str, float] = {"lane_1": 0.0, "lane_2": 0.0, "lane_3": 0.0, "lane_4": 0.0}
        self.seen_track_ids: Set[int] = set()
        self.error_state = False
        self.error_message = None
        self.lock = threading.Lock()
        self.thread = None

        # Load YOLO model
        self.model = None
        if YOLO_AVAILABLE:
            custom_weights = BASE_DIR / "models" / "best_bmd45.pt"
            weights_path = str(custom_weights) if custom_weights.exists() else "yolov8n.pt"
            try:
                self.model = YOLO(weights_path)
                print(f"[STREAM SERVICE] Loaded YOLO model: {weights_path}")
            except Exception as e:
                print(f"[STREAM SERVICE WARNING] YOLO load error: {e}")
                self.error_message = f"YOLO load error: {e}"

    def start_stream(self, source: str = None):
        with self.lock:
            if source:
                self.source_path = source
            self.is_running = True
            self.is_paused = False
            self.processed_frames = 0
            self.seen_track_ids.clear()
            self.error_state = False
            self.error_message = None
            if self.thread is None or not self.thread.is_alive():
                self.thread = threading.Thread(target=self._process_loop, daemon=True)
                self.thread.start()
        print(f"[STREAM SERVICE] Video processing started: {self.source_path}")

    def pause_stream(self):
        with self.lock:
            self.is_paused = True

    def resume_stream(self):
        with self.lock:
            self.is_paused = False

    def stop_stream(self):
        with self.lock:
            self.is_running = False
            self.is_paused = False

    def set_speed(self, speed: float):
        with self.lock:
            self.playback_speed = max(0.25, min(4.0, speed))

    def _process_loop(self):
        dataset_mode = "bmd45" if "bmd45" in str(self.source_path).lower() else "coco"

        while self.is_running:
            if self.is_paused:
                time.sleep(0.2)
                continue

            if not os.path.exists(self.source_path) and not self.source_path.startswith("rtsp://"):
                frame = self._generate_synthetic_frame()
                self._update_jpeg(frame)
                time.sleep(0.1 / self.playback_speed)
                continue

            cap = cv2.VideoCapture(self.source_path)
            if not cap.isOpened():
                with self.lock:
                    self.error_state = True
                    self.error_message = f"OpenCV failed to open video file: {self.source_path}"
                time.sleep(1.0)
                continue

            while cap.isOpened() and self.is_running:
                if self.is_paused:
                    time.sleep(0.2)
                    continue

                ret, frame = cap.read()
                if not ret:
                    cap.set(cv2.CAP_PROP_POS_FRAMES, 0)
                    continue

                self.processed_frames += 1
                h, w, _ = frame.shape
                
                # Draw virtual quadrant lane dividers
                mid_x, mid_y = int(w / 2), int(h / 2)
                cv2.line(frame, (mid_x, 0), (mid_x, h), (100, 100, 100), 1)
                cv2.line(frame, (0, mid_y), (w, mid_y), (100, 100, 100), 1)

                frame_lane_weights = {"lane_1": 0.0, "lane_2": 0.0, "lane_3": 0.0, "lane_4": 0.0}

                # Run YOLO tracking if model is loaded
                if self.model:
                    try:
                        results = self.model.track(source=frame, persist=True, tracker="bytetrack.yaml", verbose=False)
                        for r in results:
                            if r.boxes.id is not None:
                                track_ids = r.boxes.id.int().cpu().tolist()
                                classes = r.boxes.cls.int().cpu().tolist()
                                confs = r.boxes.conf.cpu().tolist()
                                boxes = r.boxes.xyxy.cpu().tolist()

                                for track_id, cls_id, conf, box in zip(track_ids, classes, confs, boxes):
                                    x1, y1, x2, y2 = map(int, box)
                                    cx, cy = (x1 + x2) / 2.0, (y1 + y2) / 2.0
                                    
                                    assigned = assign_lane(cx, cy, w, h)
                                    v_class = resolve_vehicle_class(cls_id, dataset_mode)
                                    w_val = get_vehicle_weight(v_class.app_class_name)
                                    frame_lane_weights[assigned] += w_val

                                    # Record new unique vehicle tracks into database for enforcement/violations
                                    if track_id not in self.seen_track_ids:
                                        self.seen_track_ids.add(track_id)
                                        self._record_new_vehicle_detection(track_id, v_class.app_class_name, conf, assigned)

                                    label = f"#{track_id} {v_class.display_name} (w={w_val})"
                                    cv2.rectangle(frame, (x1, y1), (x2, y2), (0, 255, 0), 2)
                                    cv2.putText(frame, label, (x1, max(15, y1 - 8)),
                                                cv2.FONT_HERSHEY_SIMPLEX, 0.4, (0, 255, 0), 1)
                    except Exception as e:
                        with self.lock:
                            self.error_message = f"YOLO tracking warning: {e}"

                # Update current weighted lane counts
                with self.lock:
                    self.latest_lane_counts = frame_lane_weights.copy()

                # Auto-feed adaptive signal controller every 15 frames (~0.5s)
                if self.processed_frames % 15 == 0:
                    self._auto_feed_adaptive_controller(frame_lane_weights)

                # Overlay Badges & Lane Counts
                cv2.rectangle(frame, (10, 10), (380, 50), (0, 14, 38), -1)
                cv2.putText(frame, "LIVE DETECT & ADAPTIVE SIGNAL CONTROL", (18, 33),
                            cv2.FONT_HERSHEY_SIMPLEX, 0.45, (0, 229, 255), 2)
                
                l_str = f"L1:{int(round(frame_lane_weights['lane_1']))} L2:{int(round(frame_lane_weights['lane_2']))} L3:{int(round(frame_lane_weights['lane_3']))} L4:{int(round(frame_lane_weights['lane_4']))}"
                cv2.putText(frame, l_str, (18, 70), cv2.FONT_HERSHEY_SIMPLEX, 0.5, (0, 255, 0), 2)

                self._update_jpeg(frame)
                sleep_time = max(0.01, (1.0 / 30.0) / self.playback_speed)
                time.sleep(sleep_time)

            cap.release()

    def _record_new_vehicle_detection(self, track_id: int, vehicle_type: str, confidence: float, lane: str):
        """Record new unique track_id to POST /api/vehicles/detections flow for violation checking & analytics."""
        try:
            from app.database import SessionLocal
            from app.main import create_vehicle_detection, VehicleDetectionCreate
            
            db = SessionLocal()
            try:
                req = VehicleDetectionCreate(
                    intersection="junction_1",
                    camera="CAM_NORTH_01",
                    track_id=str(track_id),
                    vehicle_type=vehicle_type,
                    lane=lane,
                    direction="Northbound",
                    confidence=float(confidence),
                    speed=45.0
                )
                create_vehicle_detection(req, db)
            finally:
                db.close()
        except Exception as e:
            print(f"[STREAM SERVICE WARNING] Record vehicle detection error: {e}")

    def _auto_feed_adaptive_controller(self, lane_weights: Dict[str, float]):
        """Auto-feed weighted vehicle density counts directly into database & adaptive signal controller."""
        try:
            from app.database import SessionLocal
            from app.models import TrafficRecord
            from app.main import update_signal_internal
            
            db = SessionLocal()
            try:
                l1 = int(round(lane_weights.get("lane_1", 0)))
                l2 = int(round(lane_weights.get("lane_2", 0)))
                l3 = int(round(lane_weights.get("lane_3", 0)))
                l4 = int(round(lane_weights.get("lane_4", 0)))
                
                record = TrafficRecord(
                    intersection="junction_1",
                    lane_1=l1, lane_2=l2, lane_3=l3, lane_4=l4,
                    total_vehicles=l1 + l2 + l3 + l4,
                    source="RECORDED_VIDEO"
                )
                db.add(record)
                db.commit()
                update_signal_internal("junction_1", l1, l2, l3, l4, db)
            finally:
                db.close()
        except Exception as e:
            print(f"[STREAM SERVICE WARNING] Auto-feed adaptive controller error: {e}")

    def _generate_synthetic_frame(self):
        import numpy as np
        img = np.zeros((480, 640, 3), dtype=np.uint8)
        img[:] = (38, 14, 0)
        cv2.putText(img, "TRAFFIQ LIVE STREAM SIMULATOR", (50, 200),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 212, 255), 2)
        cv2.putText(img, f"Frame: {self.processed_frames}", (50, 250),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.5, (255, 255, 255), 1)
        return img

    def _update_jpeg(self, frame):
        ret, buffer = cv2.imencode('.jpg', frame)
        if ret:
            with self.lock:
                self.current_frame_jpeg = buffer.tobytes()

    def generate_mjpeg_stream(self):
        while self.is_running:
            with self.lock:
                frame_bytes = self.current_frame_jpeg

            if frame_bytes:
                yield (b'--frame\r\n'
                       b'Content-Type: image/jpeg\r\n\r\n' + frame_bytes + b'\r\n')
            time.sleep(0.03)

video_stream_manager = VideoStreamManager()
