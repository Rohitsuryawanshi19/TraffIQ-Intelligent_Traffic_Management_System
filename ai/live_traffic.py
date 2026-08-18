import cv2
import time
import os
import random
import numpy as np
from api_client import TrafficAPIClient
from vehicle_classes import (
    COCO_VEHICLE_TAXONOMY,
    BMD45_VEHICLE_TAXONOMY,
    resolve_vehicle_class
)

try:
    from ultralytics import YOLO
    YOLO_AVAILABLE = True
except ImportError:
    YOLO_AVAILABLE = False

def assign_lane(cx, cy, width, height):
    """Assign vehicle to 1 of 4 logical lane quadrants based on bounding box center (cx, cy)."""
    mid_x = width / 2.0
    mid_y = height / 2.0

    if cx < mid_x and cy < mid_y:
        return "lane_1"
    elif cx >= mid_x and cy < mid_y:
        return "lane_2"
    elif cx < mid_x and cy >= mid_y:
        return "lane_3"
    else:
        return "lane_4"

def determine_direction(lane):
    dirs = {
        "lane_1": "North->South",
        "lane_2": "East->West",
        "lane_3": "West->East",
        "lane_4": "South->North"
    }
    return dirs.get(lane, "Unknown")

def load_traffic_model():
    """
    Load YOLO model based on TRAFFIC_MODEL_PATH env var or default best_bmd45.pt.
    Returns (model, model_name, dataset_type).
    """
    if not YOLO_AVAILABLE:
        print("[AI WORKER WARNING] Ultralytics YOLO package unavailable. Operating in adaptive simulation mode.")
        return None, "Simulation Mode", "SIMULATION"

    env_path = os.getenv("TRAFFIC_MODEL_PATH")
    base_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))

    model_path = None
    dataset_type = "COCO"
    model_name = "YOLOv8n Baseline"

    if env_path:
        target_path = os.path.abspath(env_path) if os.path.isabs(env_path) else os.path.join(base_dir, env_path)
        if os.path.exists(target_path):
            model_path = target_path
            model_name = f"Custom Configured ({os.path.basename(target_path)})"
            dataset_type = "BMD45" if "bmd45" in target_path.lower() else "COCO"
        else:
            print(f"[AI WORKER WARNING] Configured TRAFFIC_MODEL_PATH '{env_path}' not found at '{target_path}'.")
            print("  -> Falling back to default model resolution...")

    if not model_path:
        default_bmd = os.path.join(base_dir, "models", "best_bmd45.pt")
        if os.path.exists(default_bmd):
            model_path = default_bmd
            model_name = "BMD-45 Fine-Tuned (best_bmd45.pt)"
            dataset_type = "BMD45"
        else:
            model_path = "yolov8n.pt"
            model_name = "YOLOv8n Baseline (COCO)"
            dataset_type = "COCO"

    try:
        print(f"\n==========================================================")
        print(f" TRAFFIQ AI Detection Worker - Active Model Status")
        print(f"==========================================================")
        print(f" - Active Model:   {model_name}")
        print(f" - Weights Path:   {model_path}")
        print(f" - Taxonomy Mode:  {dataset_type}")
        print(f"==========================================================\n")
        model = YOLO(model_path)
        return model, model_name, dataset_type
    except Exception as e:
        print(f"[AI WORKER ERROR] Failed to load model '{model_path}': {e}")
        print("  -> Falling back to simulation mode.")
        return None, "Simulation Fallback", "SIMULATION"

def run_ai_pipeline(source_path="data/traffic.mp4", interval=5.0):
    client = TrafficAPIClient()
    model, model_name, dataset_type = load_traffic_model()

    cap = None
    if os.path.exists(source_path):
        cap = cv2.VideoCapture(source_path)

    last_post_time = time.time()
    tracked_vehicles = set()
    track_history = {}
    sim_track_counter = 1000
    frame_count = 0

    print("AI Worker pipeline running. Sending traffic observations to API...")

    try:
        while True:
            lane_counts = {"lane_1": 0, "lane_2": 0, "lane_3": 0, "lane_4": 0}

            if cap and cap.isOpened():
                ret, frame = cap.read()
                if not ret:
                    cap.set(cv2.CAP_PROP_POS_FRAMES, 0)
                    continue

                h, w, _ = frame.shape
                COUNTING_LINE_Y = h * 0.6

                if model:
                    results = model.track(source=frame, persist=True, tracker="bytetrack.yaml", verbose=False)
                    for r in results:
                        if r.boxes.id is not None:
                            track_ids = r.boxes.id.int().cpu().tolist()
                            classes = r.boxes.cls.int().cpu().tolist()
                            confs = r.boxes.conf.cpu().tolist()
                            boxes = r.boxes.xyxy.cpu().tolist()

                            for track_id, cls_id, conf, box in zip(track_ids, classes, confs, boxes):
                                class_def = resolve_vehicle_class(cls_id, dataset_type)
                                v_type = class_def.app_class_name if hasattr(class_def, 'app_class_name') else "car"

                                x1, y1, x2, y2 = box
                                cx = (x1 + x2) / 2.0
                                cy = (y1 + y2) / 2.0
                                lane = assign_lane(cx, cy, w, h)
                                lane_counts[lane] += 1

                                # Line crossing logic for tracking single detections
                                if track_id not in track_history:
                                    track_history[track_id] = []
                                track_history[track_id].append((cx, cy))

                                if len(track_history[track_id]) >= 2:
                                    prev_cx, prev_cy = track_history[track_id][-2]
                                    crossed_down = prev_cy < COUNTING_LINE_Y and cy >= COUNTING_LINE_Y
                                    crossed_up = prev_cy > COUNTING_LINE_Y and cy <= COUNTING_LINE_Y

                                    if (crossed_down or crossed_up) and track_id not in tracked_vehicles:
                                        tracked_vehicles.add(track_id)
                                        direction = determine_direction(lane)

                                        client.send_vehicle_detection(
                                            track_id=str(track_id),
                                            vehicle_type=v_type,
                                            lane=lane,
                                            direction=direction,
                                            confidence=conf
                                        )

            else:
                # Simulation Mode fallback if video file not present
                frame_count += 1
                lane_counts = {
                    "lane_1": random.randint(3, 18),
                    "lane_2": random.randint(8, 35),
                    "lane_3": random.randint(1, 12),
                    "lane_4": random.randint(12, 45),
                }

                new_vehicles = random.randint(0, 3)
                for _ in range(new_vehicles):
                    sim_track_counter += 1
                    t_type = random.choice(['car', 'car', 'motorcycle', 'bus', 'truck', 'auto_rickshaw', 'suv'])
                    t_lane = random.choice(["lane_1", "lane_2", "lane_3", "lane_4"])
                    client.send_vehicle_detection(
                        track_id=f"SIM-{sim_track_counter}",
                        vehicle_type=t_type,
                        lane=t_lane,
                        direction=determine_direction(t_lane),
                        confidence=random.uniform(0.65, 0.98)
                    )
                time.sleep(0.5)

            now = time.time()
            if now - last_post_time >= interval:
                client.send_traffic_data(
                    lane_1=lane_counts["lane_1"],
                    lane_2=lane_counts["lane_2"],
                    lane_3=lane_counts["lane_3"],
                    lane_4=lane_counts["lane_4"]
                )
                last_post_time = now

    except KeyboardInterrupt:
        print("\n[AI WORKER] Service stopped cleanly.")
    finally:
        if cap:
            cap.release()

if __name__ == "__main__":
    run_ai_pipeline()
