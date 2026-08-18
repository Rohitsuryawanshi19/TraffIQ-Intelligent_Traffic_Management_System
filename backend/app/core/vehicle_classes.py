from dataclasses import dataclass
from typing import Dict, List, Optional

@dataclass
class VehicleClassDefinition:
    dataset_class_id: int
    dataset_class_name: str
    app_class_name: str
    display_name: str
    category: str
    is_supported: bool = True
    requires_custom_weights: bool = False

# ---------------------------------------------------------------------------
# COCO Dataset Default YOLOv8 Taxonomy
# ---------------------------------------------------------------------------
COCO_VEHICLE_TAXONOMY: Dict[int, VehicleClassDefinition] = {
    1: VehicleClassDefinition(1, "bicycle", "bicycle", "Bicycle", "Non-Motorized", is_supported=True),
    2: VehicleClassDefinition(2, "car", "car", "Car", "Motorized", is_supported=True),
    3: VehicleClassDefinition(3, "motorcycle", "motorcycle", "Motorcycle / Bike", "Motorized", is_supported=True),
    5: VehicleClassDefinition(5, "bus", "bus", "Bus", "Heavy Commercial", is_supported=True),
    7: VehicleClassDefinition(7, "truck", "truck", "Truck", "Heavy Commercial", is_supported=True),
}

# ---------------------------------------------------------------------------
# BMD-45 (Bengaluru Mobility Dataset) Fine-Grained Taxonomy
# ---------------------------------------------------------------------------
BMD45_VEHICLE_TAXONOMY: Dict[int, VehicleClassDefinition] = {
    0:  VehicleClassDefinition(0,  "Hatchback",         "car",               "Hatchback Car",            "Passenger Car",     is_supported=True),
    1:  VehicleClassDefinition(1,  "Sedan",             "car",               "Sedan Car",                "Passenger Car",     is_supported=True),
    2:  VehicleClassDefinition(2,  "SUV",               "suv",               "Jeep / SUV",               "Passenger Car",     is_supported=True),
    3:  VehicleClassDefinition(3,  "MUV",               "suv",               "Multi-Utility Vehicle",    "Passenger Car",     is_supported=True),
    4:  VehicleClassDefinition(4,  "Bus",               "bus",               "Public Bus",               "Heavy Commercial",  is_supported=True),
    5:  VehicleClassDefinition(5,  "Truck",             "truck",             "Commercial Truck",         "Heavy Commercial",  is_supported=True),
    6:  VehicleClassDefinition(6,  "Three-wheeler",     "auto_rickshaw",     "Auto Rickshaw (3-Wheeler)", "Para-Transit",      is_supported=True),
    7:  VehicleClassDefinition(7,  "Two-wheeler",       "motorcycle",        "Motorcycle / Scooter",     "Two-Wheeler",       is_supported=True),
    8:  VehicleClassDefinition(8,  "LCV",               "truck",             "Light Commercial Vehicle", "Light Commercial",  is_supported=True),
    9:  VehicleClassDefinition(9,  "Mini-bus",          "bus",               "Mini Bus",                 "Heavy Commercial",  is_supported=True),
    10: VehicleClassDefinition(10, "Tractor",           "other",             "Tractor / Farm Vehicle",   "Special Commercial",is_supported=True),
    11: VehicleClassDefinition(11, "E-rickshaw",        "auto_rickshaw",     "Electric Rickshaw",        "Para-Transit",      is_supported=True),
    12: VehicleClassDefinition(12, "Emergency Vehicle", "emergency_vehicle", "Ambulance / Emergency",    "Emergency Priority",is_supported=False, requires_custom_weights=True),
}

# Canonical Application Taxonomy Summary
APP_VEHICLE_CATEGORIES = {
    "car":               {"display_name": "Car",                   "icon": "car",        "supports_coco": True,  "supports_bmd45": True},
    "motorcycle":        {"display_name": "Motorcycle / Bike",     "icon": "bike",       "supports_coco": True,  "supports_bmd45": True},
    "bus":               {"display_name": "Bus",                   "icon": "bus",        "supports_coco": True,  "supports_bmd45": True},
    "truck":             {"display_name": "Truck",                 "icon": "truck",      "supports_coco": True,  "supports_bmd45": True},
    "auto_rickshaw":     {"display_name": "Auto Rickshaw",         "icon": "auto",       "supports_coco": False, "supports_bmd45": True},
    "suv":               {"display_name": "Jeep / SUV",            "icon": "suv",        "supports_coco": False, "supports_bmd45": True},
    "bicycle":           {"display_name": "Bicycle",               "icon": "bicycle",    "supports_coco": True,  "supports_bmd45": False},
    "emergency_vehicle": {"display_name": "Emergency Vehicle",     "icon": "ambulance",  "supports_coco": False, "supports_bmd45": False, "note": "Requires fine-tuned weights"},
    "other":             {"display_name": "Other / Special",       "icon": "help-circle","supports_coco": True,  "supports_bmd45": True},
}

def resolve_vehicle_class(class_id: int, dataset_name: str = "coco") -> VehicleClassDefinition:
    """Resolve raw YOLO class_id into standardized VehicleClassDefinition."""
    if dataset_name.lower() == "bmd45":
        return BMD45_VEHICLE_TAXONOMY.get(
            class_id,
            VehicleClassDefinition(class_id, "Unknown", "other", "Other Vehicle", "Unknown")
        )
    else:
        return COCO_VEHICLE_TAXONOMY.get(
            class_id,
            VehicleClassDefinition(class_id, "Unknown", "other", "Other Vehicle", "Unknown")
        )

def get_taxonomy_summary() -> List[Dict]:
    """Return complete explainable vehicle taxonomy for frontend/documentation."""
    summary = []
    for app_code, info in APP_VEHICLE_CATEGORIES.items():
        summary.append({
            "app_class_name": app_code,
            "display_name": info["display_name"],
            "supports_coco": info["supports_coco"],
            "supports_bmd45": info["supports_bmd45"],
            "note": info.get("note", "Fully supported")
        })
    return summary

VEHICLE_DENSITY_WEIGHTS = {
    "car": 1.0,
    "suv": 1.2,
    "motorcycle": 0.5,
    "bicycle": 0.3,
    "bus": 2.5,
    "truck": 2.5,
    "auto_rickshaw": 0.8,
    "emergency_vehicle": 5.0,
    "other": 1.0
}

def get_vehicle_weight(app_class_name: str) -> float:
    """Return density weight for vehicle category (e.g. bus/truck=2.5, motorcycle=0.5)."""
    return VEHICLE_DENSITY_WEIGHTS.get((app_class_name or "").lower(), 1.0)

def assign_lane(cx: float, cy: float, width: float, height: float) -> str:
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

