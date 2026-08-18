import pytest
from app.adaptive_controller import (
    select_next_lane,
    force_lane_for_emergency,
    calculate_traffic_level,
    config
)

def test_normal_rotation_order_is_respected():
    counts = {"lane_1": 10, "lane_2": 10, "lane_3": 10, "lane_4": 10}
    
    lane_a, time_a, _ = select_next_lane("j1", counts, "lane_1")
    assert lane_a == "lane_2"

    lane_b, time_b, _ = select_next_lane("j1", counts, "lane_2")
    assert lane_b == "lane_3"

    lane_c, time_c, _ = select_next_lane("j1", counts, "lane_3")
    assert lane_c == "lane_4"

    lane_d, time_d, _ = select_next_lane("j1", counts, "lane_4")
    assert lane_d == "lane_1"

def test_heavy_lane_gets_extended_time_on_its_turn():
    counts = {"lane_1": 2, "lane_2": 3, "lane_3": 47, "lane_4": 1}
    
    lane, green_time, explanation = select_next_lane("j2", counts, "lane_2")
    
    assert lane == "lane_3"
    assert green_time >= 45
    assert "extended" in explanation.lower() or "heavy" in explanation.lower()

def test_light_lanes_get_compressed_when_one_lane_is_heavy():
    counts = {"lane_1": 2, "lane_2": 3, "lane_3": 45, "lane_4": 1}
    
    lane_1, time_1, exp_1 = select_next_lane("j3", counts, "lane_4")
    assert lane_1 == "lane_1"
    assert time_1 == config.min_green_time
    assert "compressed" in exp_1.lower()

def test_all_zero_counts_rotate_safely():
    counts = {"lane_1": 0, "lane_2": 0, "lane_3": 0, "lane_4": 0}
    
    l2, t2, _ = select_next_lane("j4", counts, "lane_1")
    assert l2 == "lane_2"
    assert t2 == config.min_green_time

    l3, t3, _ = select_next_lane("j4", counts, "lane_2")
    assert l3 == "lane_3"
    assert t3 == config.min_green_time

def test_anti_starvation_floor():
    counts = {"lane_1": 100, "lane_2": 0, "lane_3": 100, "lane_4": 100}
    
    l2, t2, _ = select_next_lane("j5", counts, "lane_1")
    assert l2 == "lane_2"
    assert t2 >= config.min_green_time

def test_emergency_vehicle_interrupt():
    counts = {"lane_1": 10, "lane_2": 10, "lane_3": 10, "lane_4": 10}
    
    force_lane_for_emergency("j6", "lane_3", 60)
    
    e_lane, e_time, e_exp = select_next_lane("j6", counts, "lane_1")
    assert e_lane == "lane_3"
    assert e_time == 60
    assert "EMERGENCY INTERRUPT" in e_exp
