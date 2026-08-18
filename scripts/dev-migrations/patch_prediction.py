import os

with open('app/main.py', 'r', encoding='utf-8') as f:
    main_code = f.read()

if '/api/traffic/predict' not in main_code:
    main_code += """
@app.get('/api/traffic/predict')
def get_traffic_prediction(intersection: str = "junction_1", db: Session = Depends(get_db)):
    import random
    
    records = db.query(TrafficRecord).filter(TrafficRecord.intersection == intersection).order_by(TrafficRecord.id.desc()).limit(30).all()
    records.reverse()
    
    if not records:
        return {"error": "No data available for prediction"}
        
    current = records[-1].total_vehicles
    avg_vol = sum(r.total_vehicles for r in records) / len(records)
    
    chart_data = []
    for i, r in enumerate(records):
        window = [x.total_vehicles for x in records[max(0, i-5):i]]
        pred = sum(window)/len(window) if window else r.total_vehicles
        
        chart_data.append({
            "time": r.timestamp.strftime("%H:%M:%S"),
            "Actual": r.total_vehicles,
            "Predicted": round(pred)
        })
        
    # Project future
    pred_15 = max(0, int((current * 0.4) + (avg_vol * 0.6) + random.randint(-2, 2)))
    pred_30 = max(0, int((current * 0.2) + (avg_vol * 0.8) + random.randint(-2, 2)))
    pred_60 = max(0, int(avg_vol + random.randint(-2, 2)))
    
    # Calculate simplistic Mean Absolute Error (MAE)
    errors = [abs(x["Actual"] - x["Predicted"]) for x in chart_data if x["Actual"] > 0]
    mae = sum(errors)/len(errors) if errors else 0
    accuracy = max(0, 100 - (mae / (avg_vol if avg_vol > 0 else 1) * 100))
    
    def get_cong(v):
        if v > 40: return "SEVERE"
        if v > 25: return "HIGH"
        if v > 10: return "MODERATE"
        return "LOW"
        
    return {
        "intersection": intersection,
        "current": current,
        "pred_15m": pred_15,
        "pred_30m": pred_30,
        "pred_60m": pred_60,
        "predicted_congestion": get_cong(pred_15),
        "mae": round(mae, 2),
        "accuracy": round(accuracy, 1),
        "chart_data": chart_data
    }
"""
    with open('app/main.py', 'w', encoding='utf-8') as f:
        f.write(main_code)
