import os
import re

# 1. Patch models.py
with open('app/models.py', 'r', encoding='utf-8') as f:
    models_code = f.read()

if 'last_reason' not in models_code:
    models_code = models_code.replace('updated_at = Column(DateTime', 'last_reason = Column(String, default="Initialized")\n    updated_at = Column(DateTime')
    with open('app/models.py', 'w', encoding='utf-8') as f:
        f.write(models_code)

# 2. Patch schemas.py
with open('app/schemas.py', 'r', encoding='utf-8') as f:
    schemas_code = f.read()

if 'last_reason' not in schemas_code:
    schemas_code = schemas_code.replace('remaining_time: int', 'remaining_time: int\n    last_reason: str = "N/A"')
    with open('app/schemas.py', 'w', encoding='utf-8') as f:
        f.write(schemas_code)

# 3. Rewrite adaptive_controller.py
adaptive_code = """
from datetime import datetime, timezone
from typing import Dict, Tuple

class AdaptiveConfig:
    weight_density: float = 1.0
    weight_waiting_time: float = 0.5
    weight_queue_length: float = 1.2
    weight_emergency: float = 1000.0
    penalty_recently_served: float = 50.0
    
    min_green_time: int = 15
    max_green_time: int = 90
    yellow_clearance: int = 3
    all_red_clearance: int = 2

config = AdaptiveConfig()

LANE_WAIT_START: Dict[str, Dict[str, datetime]] = {}
LANE_LAST_SERVED: Dict[str, str] = {}

def calculate_traffic_level(total_vehicles: int) -> str:
    if total_vehicles <= 20: return "LOW"
    elif total_vehicles <= 50: return "NORMAL"
    elif total_vehicles <= 100: return "HEAVY"
    else: return "VERY_HEAVY"

def select_next_lane(intersection: str, lane_counts: Dict[str, int], current_lane: str) -> Tuple[str, int, str]:
    now = datetime.now(timezone.utc)
    if intersection not in LANE_WAIT_START:
        LANE_WAIT_START[intersection] = {
            "lane_1": now, "lane_2": now, "lane_3": now, "lane_4": now
        }
        LANE_LAST_SERVED[intersection] = current_lane

    LANE_WAIT_START[intersection][current_lane] = now
    
    best_lane = current_lane
    highest_priority = -9999.0
    reason_parts = {}

    for lane, count in lane_counts.items():
        # 1. Density & Queue Length (using count as proxy for both for now)
        density_score = count * config.weight_density
        queue_score = count * config.weight_queue_length
        
        # 2. Waiting Time
        wait_seconds = (now - LANE_WAIT_START[intersection][lane]).total_seconds()
        wait_score = wait_seconds * config.weight_waiting_time
        
        # 3. Time of Day pattern (Simulated: +10% during peak hours 17:00-19:00)
        tod_multiplier = 1.1 if 17 <= now.hour <= 19 else 1.0
        
        # 4. Emergency Priority (Hook for future integration)
        emergency_score = 0
        
        # 5. Recently Served Penalty
        penalty = 0
        if lane == LANE_LAST_SERVED.get(intersection):
            penalty = config.penalty_recently_served
            
        # Total Score
        priority = ((density_score + queue_score + wait_score + emergency_score) * tod_multiplier) - penalty
        
        # Anti-starvation: if waiting > 120s, heavily boost priority
        if wait_seconds > 120 and lane != current_lane:
            priority += 500
            
        if priority > highest_priority:
            highest_priority = priority
            best_lane = lane
            reason_parts = {
                "density": round(density_score, 1),
                "wait": round(wait_score, 1),
                "penalty": penalty
            }
            
    LANE_LAST_SERVED[intersection] = best_lane
    
    # Calculate appropriate green time bounded by safety limits
    target_time = int(lane_counts.get(best_lane, 0) * 3) # 3 seconds per vehicle
    green_time = max(config.min_green_time, min(config.max_green_time, target_time))
    
    explanation = f"{best_lane.upper()} selected (Score: {round(highest_priority,1)}) because: Density({reason_parts.get('density')}) + Wait({reason_parts.get('wait')}) - Penalty({reason_parts.get('penalty')})."
    
    return best_lane, green_time, explanation
"""
with open('app/adaptive_controller.py', 'w', encoding='utf-8') as f:
    f.write(adaptive_code)


# 4. Patch main.py
with open('app/main.py', 'r', encoding='utf-8') as f:
    main_code = f.read()

new_update_signal = """
def update_signal_internal(intersection: str, l1: int, l2: int, l3: int, l4: int, db: Session):
    from .adaptive_controller import select_next_lane, config
    status = db.query(SignalStatus).filter(SignalStatus.intersection == intersection).first()
    lane_counts = {"lane_1": l1, "lane_2": l2, "lane_3": l3, "lane_4": l4}
    now = datetime.now(timezone.utc)
    
    if not status:
        next_lane, green_time, reason = select_next_lane(intersection, lane_counts, "lane_1")
        status = SignalStatus(
            intersection=intersection,
            current_lane=next_lane,
            state="GREEN",
            green_time=green_time,
            remaining_time=green_time,
            last_reason=reason,
            updated_at=now
        )
        db.add(status)
    else:
        elapsed = (now - status.updated_at.replace(tzinfo=timezone.utc)).total_seconds() if status.updated_at.tzinfo is None else (now - status.updated_at).total_seconds()
        
        if status.state == "GREEN":
            if elapsed >= status.green_time:
                next_lane, next_green, reason = select_next_lane(intersection, lane_counts, status.current_lane)
                if next_lane != status.current_lane:
                    # Safe transition: Enter Yellow
                    status.state = "YELLOW"
                    status.green_time = config.yellow_clearance
                    status.remaining_time = config.yellow_clearance
                    status.updated_at = now
                else:
                    # Extend green up to max
                    status.green_time = next_green
                    status.remaining_time = next_green
                    status.updated_at = now
                    status.last_reason = reason
            else:
                status.remaining_time = max(0, int(status.green_time - elapsed))
        elif status.state == "YELLOW":
            if elapsed >= config.yellow_clearance:
                status.state = "RED" # ALL-RED
                status.green_time = config.all_red_clearance
                status.remaining_time = config.all_red_clearance
                status.updated_at = now
            else:
                status.remaining_time = max(0, int(status.green_time - elapsed))
        elif status.state == "RED":
            if elapsed >= config.all_red_clearance:
                next_lane, next_green, reason = select_next_lane(intersection, lane_counts, status.current_lane)
                status.current_lane = next_lane
                status.state = "GREEN"
                status.green_time = next_green
                status.remaining_time = next_green
                status.updated_at = now
                status.last_reason = reason
            else:
                status.remaining_time = max(0, int(status.green_time - elapsed))
    db.commit()
    db.refresh(status)
    return status
"""

# Replace the existing function
main_code = re.sub(r'def update_signal_internal\(intersection: str, l1: int, l2: int, l3: int, l4: int, db: Session\):.*?return status', new_update_signal.strip(), main_code, flags=re.DOTALL)

with open('app/main.py', 'w', encoding='utf-8') as f:
    f.write(main_code)
