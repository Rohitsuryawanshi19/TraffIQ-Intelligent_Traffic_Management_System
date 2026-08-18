import sys
import os

# Import from backend core
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "backend")))
try:
    from app.core.vehicle_classes import (
        COCO_VEHICLE_TAXONOMY,
        BMD45_VEHICLE_TAXONOMY,
        APP_VEHICLE_CATEGORIES,
        resolve_vehicle_class,
        get_taxonomy_summary
    )
except ImportError:
    # Standalone fallback definition
    COCO_VEHICLE_TAXONOMY = {
        2: {"app_class_name": "car", "display_name": "Car"},
        3: {"app_class_name": "motorcycle", "display_name": "Motorcycle / Bike"},
        5: {"app_class_name": "bus", "display_name": "Bus"},
        7: {"app_class_name": "truck", "display_name": "Truck"},
    }
    BMD45_VEHICLE_TAXONOMY = {}
    resolve_vehicle_class = lambda cid, ds='coco': COCO_VEHICLE_TAXONOMY.get(cid, {"app_class_name": "other"})
