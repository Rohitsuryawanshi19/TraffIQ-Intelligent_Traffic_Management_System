# Recommended Final-Year & BTech Interview Explanation

## 30-Second Elevator Pitch
> "I developed an adaptive traffic management system using computer vision to detect and track vehicles, calculate lane-level traffic density, and dynamically prioritize traffic signals using vehicle count and waiting time. The system exposes data through FastAPI, stores historical measurements in SQLite/PostgreSQL, and visualizes the current traffic and signal state through a React dashboard."

## Key Interview Talking Points
1. **Computer Vision & Object Detection**: Used YOLOv8 to detect vehicle classes (cars, motorcycles, buses, trucks). Logical 4-quadrant polygon tracking assigns vehicles to specific lanes in real time.
2. **Adaptive Signal Control**: Dynamically adjusts green light timing between 15s and 90s based on real-time vehicle density instead of fixed timers.
3. **Fairness Algorithm**: Integrated a waiting time decay factor into priority scoring so low-volume lanes are never starved indefinitely.
4. **Decoupled Architecture**: AI worker, REST API backend, and React dashboard operate independently, allowing scaling of heavy YOLO GPU processing separate from the public web server.
