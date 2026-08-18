from datetime import datetime, timezone
from typing import Dict, Tuple, Optional

class AdaptiveConfig:
    min_green_time: int = 8
    min_green_normal: int = 15
    max_green_time: int = 60
    yellow_clearance: int = 3
    all_red_clearance: int = 1

config = AdaptiveConfig()

# Global state tracking for explicit emergency interrupts
EMERGENCY_INTERRUPTS: Dict[str, Tuple[str, int]] = {}

def calculate_traffic_level(total_vehicles: int) -> str:
    if total_vehicles <= 5:
        return "LOW"
    elif total_vehicles <= 15:
        return "NORMAL"
    elif total_vehicles <= 30:
        return "HEAVY"
    else:
        return "VERY_HEAVY"

def force_lane_for_emergency(intersection: str, lane_name: str, duration: int = 60) -> Tuple[str, int, str]:
    """Explicit emergency vehicle preemption interrupt path."""
    EMERGENCY_INTERRUPTS[intersection] = (lane_name, duration)
    explanation = f"EMERGENCY INTERRUPT: Forced {lane_name.upper()} green for {duration}s corridor clearance"
    return lane_name, duration, explanation

def select_next_lane(intersection: str, lane_counts: Dict[str, int], current_lane: str) -> Tuple[str, int, str]:
    """
    Cyclic fairness-preserving adaptive algorithm:
    1. Respects explicit emergency interrupt path.
    2. Enforces cyclic rotation: lane_1 -> lane_2 -> lane_3 -> lane_4 -> lane_1.
    3. Dynamically splits green phase split per cycle:
       - Compresses light lanes (LOW / < 1.5x avg) to fast floor (8-10s) to reach heavy lanes faster.
       - Extends heavy lanes (HEAVY/VERY_HEAVY or >= 1.5x avg) up to max_green_time.
    4. Provides detailed explanation string in last_reason.
    """
    # 1. Emergency Preemption Interrupt Path
    if intersection in EMERGENCY_INTERRUPTS:
        e_lane, e_dur = EMERGENCY_INTERRUPTS.pop(intersection)
        explanation = f"EMERGENCY INTERRUPT EXECUTED: Forced {e_lane.upper()} ({e_dur}s)"
        return e_lane, e_dur, explanation

    # 2. Fixed Sequential Rotation Order
    lane_order = ["lane_1", "lane_2", "lane_3", "lane_4"]
    try:
        current_idx = lane_order.index(current_lane)
        next_idx = (current_idx + 1) % len(lane_order)
    except ValueError:
        next_idx = 0

    next_lane = lane_order[next_idx]
    next_count = lane_counts.get(next_lane, 0)
    next_level = calculate_traffic_level(next_count)

    # 3. Cycle Metrics & Heavy Lane Identification
    all_counts = [lane_counts.get(l, 0) for l in lane_order]
    avg_count = sum(all_counts) / max(1, len(all_counts))
    max_count = max(all_counts)
    
    heavy_lanes = [
        l for l in lane_order 
        if lane_counts.get(l, 0) >= 16 or (avg_count > 0 and lane_counts.get(l, 0) >= 1.5 * avg_count)
    ]
    has_heavy = len(heavy_lanes) > 0 and max_count > 5

    # 4. Green Time & Explanation Calculation
    is_next_heavy = (next_count >= 16) or (avg_count > 0 and next_count >= 1.5 * avg_count and next_count > 5)

    if has_heavy and not is_next_heavy:
        # Compression for light lane
        green_time = config.min_green_time
        target_heavy_name = heavy_lanes[0].upper()
        target_heavy_count = lane_counts.get(heavy_lanes[0], 0)
        target_heavy_level = calculate_traffic_level(target_heavy_count)
        explanation = f"{next_lane.upper()} compressed to {green_time}s ({next_level.lower()}) to reach {target_heavy_name} ({target_heavy_level}, {target_heavy_count} vehicles) faster"
    elif is_next_heavy:
        # Extension for heavy lane
        green_time = int(min(config.max_green_time, 30 + (next_count * 1.5)))
        explanation = f"{next_lane.upper()} extended to {green_time}s ({next_level}, {next_count} vehicles queue clearance)"
    elif next_level == "NORMAL":
        green_time = int(min(config.max_green_time, 15 + (next_count * 1.2)))
        explanation = f"{next_lane.upper()} served at {green_time}s (normal flow, {next_count} vehicles)"
    else: # LOW / All zero
        green_time = config.min_green_time
        explanation = f"{next_lane.upper()} served at {green_time}s (low flow, {next_count} vehicles)"

    # Safety bounds
    green_time = max(config.min_green_time, min(config.max_green_time, green_time))

    return next_lane, green_time, explanation
