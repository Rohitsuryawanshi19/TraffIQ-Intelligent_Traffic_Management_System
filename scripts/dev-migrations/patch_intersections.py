import os

# 1. Patch models.py
with open('app/models.py', 'r', encoding='utf-8') as f:
    models_code = f.read()

if 'IntersectionNode' not in models_code:
    models_code += """
class IntersectionNode(Base):
    __tablename__ = "intersections"
    id = Column(Integer, primary_key=True, index=True)
    intersection_id = Column(String, unique=True, index=True)
    name = Column(String)
    location = Column(String)
    status = Column(String, default="ACTIVE")
    lanes = Column(Integer, default=4)
"""
    with open('app/models.py', 'w', encoding='utf-8') as f:
        f.write(models_code)

# 2. Patch schemas.py
with open('app/schemas.py', 'r', encoding='utf-8') as f:
    schemas_code = f.read()

if 'IntersectionResponse' not in schemas_code:
    schemas_code += """
class IntersectionResponse(BaseModel):
    id: int
    intersection_id: str
    name: str
    location: str
    status: str
    lanes: int
    cameras: int = 0
    signals: int = 0
    current_traffic: str = "UNKNOWN"
    current_phase: str = "UNKNOWN"
    class Config:
        from_attributes = True
"""
    with open('app/schemas.py', 'w', encoding='utf-8') as f:
        f.write(schemas_code)

# 3. Patch main.py API
with open('app/main.py', 'r', encoding='utf-8') as f:
    main_code = f.read()

if '/api/intersections' not in main_code:
    main_code += """
from .models import IntersectionNode

@app.get('/api/intersections', response_model=List[IntersectionResponse])
def get_intersections(db: Session = Depends(get_db)):
    if db.query(IntersectionNode).count() == 0:
        nodes = [
            IntersectionNode(intersection_id="junction_1", name="Demo Junction Alpha", location="Test Zone A"),
            IntersectionNode(intersection_id="junction_2", name="Demo Junction Beta", location="Test Zone B"),
            IntersectionNode(intersection_id="junction_3", name="Demo Junction Gamma", location="Test Zone C")
        ]
        db.add_all(nodes)
        db.commit()

    results = []
    for n in db.query(IntersectionNode).all():
        cams = db.query(TrafficCamera).filter(TrafficCamera.intersection == n.intersection_id).count()
        sig = db.query(SignalStatus).filter(SignalStatus.intersection == n.intersection_id).first()
        traf = db.query(TrafficRecord).filter(TrafficRecord.intersection == n.intersection_id).order_by(TrafficRecord.id.desc()).first()
        
        phase = f"{sig.current_lane.upper()} ({sig.state})" if sig else "OFFLINE"
        lvl = traf.traffic_level if traf else "UNKNOWN"
        
        results.append({
            "id": n.id,
            "intersection_id": n.intersection_id,
            "name": n.name,
            "location": n.location,
            "status": n.status,
            "lanes": n.lanes,
            "cameras": cams,
            "signals": n.lanes,
            "current_traffic": lvl,
            "current_phase": phase
        })
    return results
"""
    with open('app/main.py', 'w', encoding='utf-8') as f:
        f.write(main_code)
