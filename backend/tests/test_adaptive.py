import pytest
from app.adaptive_controller import (
    select_next_lane,
    force_lane_for_emergency,
    calculate_traffic_level,
    config
)

def test_1_strict_rotation_order_never_jumps_out_of_turn():
    """Criterion 1: Rotation order (lane_1 -> lane_2 -> lane_3 -> lane_4 -> lane_1) is strictly enforced even with heavy imbalance."""
    counts = {"lane_1": 5, "lane_2": 5, "lane_3": 60, "lane_4": 5}
    
    # Starting from lane_4, next MUST be lane_1, NOT lane_3 despite lane_3 having 60 vehicles
    next_1, _, _ = select_next_lane("j1", counts, "lane_4")
    assert next_1 == "lane_1"

    # From lane_1, next MUST be lane_2
    next_2, _, _ = select_next_lane("j1", counts, "lane_1")
    assert next_2 == "lane_2"

    # From lane_2, next is lane_3
    next_3, _, _ = select_next_lane("j1", counts, "lane_2")
    assert next_3 == "lane_3"

    # From lane_3, next is lane_4
    next_4, _, _ = select_next_lane("j1", counts, "lane_3")
    assert next_4 == "lane_4"

def test_2_green_time_is_strictly_bounded():
    """Criterion 2: Green times are bounded between config.min_green_time (8s) and config.max_green_time (60s)."""
    counts_zero = {"lane_1": 0, "lane_2": 0, "lane_3": 0, "lane_4": 0}
    _, time_min, _ = select_next_lane("j2", counts_zero, "lane_1")
    assert time_min >= config.min_green_time
    assert time_min <= config.max_green_time

    counts_huge = {"lane_1": 500, "lane_2": 500, "lane_3": 500, "lane_4": 500}
    _, time_max, _ = select_next_lane("j2", counts_huge, "lane_1")
    assert time_max >= config.min_green_time
    assert time_max <= config.max_green_time

def test_3_heavy_lane_compression_and_extension():
    """Criterion 3: Light lanes compressed to 8s, heavy lane extended to max on its turn."""
    # lane_3 has 60 vehicles (VERY_HEAVY), others have 5 (LOW)
    counts = {"lane_1": 5, "lane_2": 5, "lane_3": 60, "lane_4": 5}
    
    # Light lane 1 compressed
    _, time_l1, exp_l1 = select_next_lane("j3", counts, "lane_4")
    assert time_l1 == config.min_green_time # 8s
    assert "compressed" in exp_l1.lower()

    # Light lane 2 compressed
    _, time_l2, exp_l2 = select_next_lane("j3", counts, "lane_1")
    assert time_l2 == config.min_green_time # 8s
    assert "compressed" in exp_l2.lower()

    # Heavy lane 3 extended
    _, time_l3, exp_l3 = select_next_lane("j3", counts, "lane_2")
    assert time_l3 == config.max_green_time # 60s max
    assert "extended" in exp_l3.lower()

def test_4_fresh_per_cycle_split_recomputation():
    """Criterion 4: Green time split recomputes fresh every cycle based on back-to-back live counts."""
    # Cycle 1: lane_3 is heavy
    counts_cycle_1 = {"lane_1": 5, "lane_2": 5, "lane_3": 60, "lane_4": 5}
    _, time_c1_l1, _ = select_next_lane("j4", counts_cycle_1, "lane_4")
    _, time_c1_l3, _ = select_next_lane("j4", counts_cycle_1, "lane_2")
    assert time_c1_l1 == 8
    assert time_c1_l3 == 60

    # Cycle 2: Traffic shifts! lane_1 becomes heavy (50 veh), lane_3 cleared (2 veh)
    counts_cycle_2 = {"lane_1": 50, "lane_2": 5, "lane_3": 2, "lane_4": 5}
    _, time_c2_l1, _ = select_next_lane("j4", counts_cycle_2, "lane_4")
    _, time_c2_l3, _ = select_next_lane("j4", counts_cycle_2, "lane_2")
    assert time_c2_l1 == 60 # Now lane_1 gets max extended time
    assert time_c2_l3 == 8  # Now lane_3 gets compressed floor

def test_5_anti_starvation_guarantee():
    """Criterion 5: Maximum wait time for any lane across a full cycle is bounded well below 150s."""
    # Worst case: 1 heavy lane (60s) + 3 light lanes (8s each)
    counts = {"lane_1": 60, "lane_2": 5, "lane_3": 5, "lane_4": 5}
    
    t1 = select_next_lane("j5", counts, "lane_4")[1]
    t2 = select_next_lane("j5", counts, "lane_1")[1]
    t3 = select_next_lane("j5", counts, "lane_2")[1]
    t4 = select_next_lane("j5", counts, "lane_3")[1]

    total_cycle_time = t1 + t2 + t3 + t4
    # Max possible wait time for any single lane in one cycle is total_cycle_time
    assert total_cycle_time <= 84
    assert total_cycle_time < 150

def test_6_emergency_preemption_interrupt():
    """Criterion 6: Emergency preemption interrupts normal rotation, then safely resumes rotation."""
    counts = {"lane_1": 10, "lane_2": 10, "lane_3": 10, "lane_4": 10}
    
    force_lane_for_emergency("j6", "lane_3", 60)
    e_lane, e_time, e_exp = select_next_lane("j6", counts, "lane_1")
    assert e_lane == "lane_3"
    assert e_time == 60
    assert "EMERGENCY INTERRUPT" in e_exp

    # After emergency interrupt is consumed, next rotation resumes from lane_3 -> lane_4
    res_lane, _, _ = select_next_lane("j6", counts, "lane_3")
    assert res_lane == "lane_4"
