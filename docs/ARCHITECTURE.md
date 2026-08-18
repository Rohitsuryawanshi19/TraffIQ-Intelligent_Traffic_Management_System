# Smart Traffic Light System - Architecture & Technical Documentation

## 1. System Architecture
```
Traffic Video / Camera Feed
            │
            ▼
   YOLOv8 + OpenCV Tracking
 (Vehicle Detection & 4-Lane Counting)
            │
            ▼ (HTTP POST every 5s)
   FastAPI Backend Service
 (Adaptive Priority & Green Timer Engine)
            │
    ┌───────┴───────┐
    ▼               ▼
SQLite / Postgres  React + Vite Dashboard
(History & Logs)  (Live Monitoring & Timer)
```

## 2. Adaptive Signal Algorithm
- **Density Green Time Calculation**:
  - `≤ 5` vehicles: 15 seconds
  - `≤ 15` vehicles: 30 seconds
  - `≤ 30` vehicles: 45 seconds
  - `≤ 50` vehicles: 60 seconds
  - `> 50` vehicles: 90 seconds

- **Fairness & Anti-Starvation Mechanism**:
  `Priority Score = vehicle_count + (waiting_time_seconds * 0.5)`
  Prevents low-traffic lanes from waiting indefinitely while high-traffic lanes retain priority.

## 3. Tech Stack Breakdown
- **Vision Pipeline**: Ultralytics YOLOv8n, OpenCV, NumPy
- **Backend API**: FastAPI, Uvicorn, SQLAlchemy, Pydantic, Python-dotenv
- **Frontend**: React 18, Vite, Axios, Recharts, Lucide React
- **Database**: SQLite (local dev), PostgreSQL (production/Render ready)
