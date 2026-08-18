import os
import re

with open('app/main.py', 'r', encoding='utf-8') as f:
    main_code = f.read()

# Fix get_intersections
old = """        phase = f"{sig.current_lane.upper()} ({sig.state})" if sig else "OFFLINE"
        lvl = traf.traffic_level if traf else "UNKNOWN"
        
        results.append({
            "id": n.id,
            "intersection_id": n.intersection_id,
            "name": n.name,
            "location": n.location,
            "status": n.status,
            "lanes": n.lanes,"""

new = """        phase = f"{sig.current_lane.upper()} ({sig.state})" if sig else "OFFLINE"
        lvl = traf.traffic_level if traf else "UNKNOWN"
        
        results.append({
            "id": n.id,
            "intersection_id": n.intersection_id,
            "name": n.name,
            "location": n.location,
            "status": n.status,
            "lanes": n.lanes,
            "last_reason": sig.last_reason if hasattr(sig, 'last_reason') else "N/A","""

if 'last_reason":' not in main_code:
    main_code = main_code.replace(old, new)
    with open('app/main.py', 'w', encoding='utf-8') as f:
        f.write(main_code)
