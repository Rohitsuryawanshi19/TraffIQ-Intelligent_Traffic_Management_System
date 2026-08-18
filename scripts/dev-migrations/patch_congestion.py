import os

with open('app/main.py', 'r', encoding='utf-8') as f:
    main_code = f.read()

if '/api/traffic/congestion' not in main_code:
    main_code += """
class CongestionConfigSchema(BaseModel):
    weight_density: float = 0.5
    weight_wait_time: float = 0.3
    weight_flow: float = 0.2
    max_lane_capacity: int = 30
    base_wait_time_sec_per_vehicle: int = 3

congestion_config = CongestionConfigSchema()

@app.get('/api/traffic/congestion/config')
def get_congestion_config():
    return congestion_config

@app.post('/api/traffic/congestion/config')
def update_congestion_config(cfg: CongestionConfigSchema):
    global congestion_config
    congestion_config = cfg
    return congestion_config

@app.get('/api/traffic/congestion')
def get_congestion_scores(db: Session = Depends(get_db)):
    latest_records = db.query(TrafficRecord).order_by(TrafficRecord.id.desc()).limit(20).all()
    intersections = {}
    for r in latest_records[::-1]:
        intersections[r.intersection] = r
    
    results = []
    for i_id, r in intersections.items():
        lanes = {
            "lane_1": r.lane_1,
            "lane_2": r.lane_2,
            "lane_3": r.lane_3,
            "lane_4": r.lane_4
        }
        
        node_scores = []
        for l_name, count in lanes.items():
            density = min(100, (count / congestion_config.max_lane_capacity) * 100)
            
            sig = db.query(SignalStatus).filter(SignalStatus.intersection == i_id).first()
            wait_time = 0
            flow = 0
            
            if sig:
                if sig.current_lane != l_name:
                    wait_time = min(100, (count * congestion_config.base_wait_time_sec_per_vehicle) / 60 * 100)
                else:
                    flow = max(0, 100 - density)

            # Calculation using weights
            score = (density * congestion_config.weight_density) + (wait_time * congestion_config.weight_wait_time) - (flow * congestion_config.weight_flow)
            score = max(0, min(100, score)) # Normalize
            
            if score <= 25: severity = "LOW"
            elif score <= 50: severity = "MODERATE"
            elif score <= 75: severity = "HIGH"
            else: severity = "SEVERE"
            
            node_scores.append({
                "lane": l_name,
                "count": count,
                "score": round(score, 1),
                "severity": severity,
                "metrics": {
                    "density_score": round(density, 1),
                    "wait_time_score": round(wait_time, 1),
                    "flow_score": round(flow, 1)
                }
            })
            
        overall_score = sum(x["score"] for x in node_scores) / len(node_scores)
        if overall_score <= 25: overall_sev = "LOW"
        elif overall_score <= 50: overall_sev = "MODERATE"
        elif overall_score <= 75: overall_sev = "HIGH"
        else: overall_sev = "SEVERE"
        
        results.append({
            "intersection": i_id,
            "overall_score": round(overall_score, 1),
            "severity": overall_sev,
            "lanes": node_scores
        })
        
    return results
"""
    with open('app/main.py', 'w', encoding='utf-8') as f:
        f.write(main_code)
