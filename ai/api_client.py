import requests
import os
import logging

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")

class TrafficAPIClient:
    def __init__(self, api_url=None):
        self.api_url = api_url or os.getenv("API_URL", "http://127.0.0.1:8000/api/traffic/analyze")

    def send_traffic_data(self, lane_1: int, lane_2: int, lane_3: int, lane_4: int, intersection: str = "junction_1"):
        payload = {
            "intersection": intersection,
            "lane_1": lane_1,
            "lane_2": lane_2,
            "lane_3": lane_3,
            "lane_4": lane_4
        }
        try:
            res = requests.post(self.api_url, json=payload, timeout=3)
            if res.status_code == 200:
                logging.info(f"Traffic data posted successfully: {res.json()}")
                return res.json()
            else:
                logging.warning(f"API post returned status {res.status_code}: {res.text}")
                return None
        except Exception as e:
            logging.error(f"Error posting traffic data to API ({self.api_url}): {e}")
            return None
    def send_vehicle_detection(self, track_id: str, vehicle_type: str, lane: str, direction: str, confidence: float, intersection: str = "junction_1"):
        payload = {
            "intersection": intersection,
            "track_id": track_id,
            "vehicle_type": vehicle_type,
            "lane": lane,
            "direction": direction,
            "confidence": confidence
        }
        url = self.api_url.replace("/traffic/analyze", "/vehicles/history")
        try:
            res = requests.post(url, json=payload, timeout=2)
            if res.status_code == 200:
                return res.json()
        except Exception:
            pass
        return None
