lines = open('main.py', encoding='utf-8').read().splitlines()
new_lines = []
for line in lines:
    if line.startswith('def read_root'):
        new_lines.append('@app.get("/")')
    elif line.startswith('def health_check'):
        new_lines.append('@app.get("/health")')
    elif line.startswith('def analyze_traffic'):
        new_lines.append('@app.post("/api/traffic/analyze", response_model=TrafficRecordResponse)')
    elif line.startswith('def get_traffic_history'):
        new_lines.append('@app.get("/api/traffic/history", response_model=List[TrafficRecordResponse])')
    elif line.startswith('def update_signal_endpoint'):
        new_lines.append('@app.post("/api/signals/update", response_model=SignalStatusResponse)')
    elif line.startswith('def override_signal_endpoint'):
        new_lines.append('@app.post("/api/signals/override", response_model=SignalStatusResponse)')
    elif line.startswith('def get_signal_status'):
        new_lines.append('@app.get("/api/signals/status/{intersection_id}", response_model=SignalStatusResponse)')
    elif line.startswith('def get_analytics_summary'):
        new_lines.append('@app.get("/api/analytics/summary", response_model=AnalyticsSummaryResponse)')
    elif line.startswith('def get_vehicle_stats'):
        new_lines.append('@app.get("/api/vehicles/stats", response_model=VehicleStatsResponse)')
    elif line.startswith('def create_vehicle_detection'):
        new_lines.append('@app.post("/api/vehicles/history", response_model=VehicleDetectionResponse)')
    elif line.startswith('def get_violations'):
        new_lines.append('@app.get("/api/violations", response_model=List[TrafficViolationResponse])')
    elif line.startswith('def get_challans'):
        new_lines.append('@app.get("/api/challans", response_model=List[ChallanResponse])')
    new_lines.append(line)

with open('main.py', 'w', encoding='utf-8') as f:
    f.write('\n'.join(new_lines))
