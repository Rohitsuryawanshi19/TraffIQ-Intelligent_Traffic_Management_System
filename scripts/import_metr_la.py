import os
import sys
import argparse
import pandas as pd
from datetime import datetime, timezone
from pathlib import Path
from huggingface_hub import hf_hub_download

# Add backend directory to path
BASE_DIR = Path(__file__).resolve().parent.parent
sys.path.append(str(BASE_DIR / "backend"))

from app.database import SessionLocal, engine, Base
from app.models.base import TrafficTimeSeries, TrafficRecord

SENSOR_JUNCTION_MAP = {
    0: "junction_1",
    1: "junction_2",
    2: "junction_3",
    3: "junction_4",
}

def import_metr_la(limit_rows: int = 1000, file_split: str = "val"):
    print("==========================================================")
    print(" TRAFFIQ - METR-LA Traffic Flow Dataset Importer")
    print("==========================================================")
    print(f" - HuggingFace Repository: witgaw/METR-LA")
    print(f" - Selected Split File:  {file_split}.parquet")
    print(f" - Row Import Limit:     {limit_rows}")
    print("==========================================================\n")

    # 1. Download sensor locations CSV
    print("Downloading sensor locations CSV...")
    loc_path = hf_hub_download(repo_id="witgaw/METR-LA", filename="sensor_graph/sensor_locations.csv", repo_type="dataset")
    loc_df = pd.read_csv(loc_path)
    sensor_ids = loc_df["sensor_id"].astype(str).tolist()
    print(f"Loaded {len(sensor_ids)} sensor metadata entries.")

    # 2. Download parquet dataset file
    filename = f"{file_split}.parquet"
    print(f"Downloading {filename} from HuggingFace...")
    parquet_path = hf_hub_download(repo_id="witgaw/METR-LA", filename=filename, repo_type="dataset")

    df = pd.read_parquet(parquet_path)
    print(f"Loaded {len(df)} total sensor time-series records from Parquet.")

    if limit_rows and limit_rows < len(df):
        df = df.iloc[:limit_rows]
        print(f"Sample limit applied: importing top {limit_rows} records...")

    # Ensure tables exist
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()

    imported_count = 0
    skipped_duplicates = 0
    traffic_records_created = 0

    try:
        for idx, row in df.iterrows():
            node_id = int(row.get("node_id", 0))
            sensor_id = sensor_ids[node_id % len(sensor_ids)] if sensor_ids else str(node_id)
            intersection_id = SENSOR_JUNCTION_MAP.get(node_id % 4, "junction_1")

            # Parse ISO timestamp
            raw_ts = row.get("t0_timestamp")
            if isinstance(raw_ts, str):
                ts = datetime.fromisoformat(raw_ts).replace(tzinfo=timezone.utc)
            elif isinstance(raw_ts, datetime):
                ts = raw_ts.replace(tzinfo=timezone.utc)
            else:
                ts = datetime.now(timezone.utc)

            # d0 is speed (mph), d1 is occupancy ratio
            speed = float(row.get("x_t-11_d0", 0.0))
            occupancy = float(row.get("x_t-11_d1", 0.0))
            flow_estimate = max(1.0, round(speed * occupancy * 3.5, 1))

            # Deduplication check
            existing = (
                db.query(TrafficTimeSeries)
                .filter(
                    TrafficTimeSeries.source == "METR-LA",
                    TrafficTimeSeries.sensor_id == sensor_id,
                    TrafficTimeSeries.timestamp == ts
                )
                .first()
            )

            if existing:
                skipped_duplicates += 1
                continue

            ts_entry = TrafficTimeSeries(
                sensor_id=sensor_id,
                intersection_id=intersection_id,
                timestamp=ts,
                traffic_speed=round(speed, 2),
                traffic_flow=flow_estimate,
                occupancy=round(occupancy, 4),
                source="METR-LA",
                imported_at=datetime.now(timezone.utc)
            )
            db.add(ts_entry)
            imported_count += 1

            # Convert to TrafficRecord periodically for backend analytics syncing
            if idx % 10 == 0:
                l1 = int(flow_estimate * 0.4)
                l2 = int(flow_estimate * 0.3)
                l3 = int(flow_estimate * 0.2)
                l4 = int(flow_estimate * 0.1)
                total = l1 + l2 + l3 + l4
                level = "HIGH" if total > 40 else "MODERATE" if total > 20 else "LOW"

                tr = TrafficRecord(
                    intersection=intersection_id,
                    lane_1=l1,
                    lane_2=l2,
                    lane_3=l3,
                    lane_4=l4,
                    total_vehicles=total,
                    traffic_level=level,
                    timestamp=ts
                )
                db.add(tr)
                traffic_records_created += 1

            if imported_count % 200 == 0:
                db.commit()

        db.commit()

        print("\n==========================================================")
        print(" METR-LA Ingestion Summary")
        print("==========================================================")
        print(f" - Records Imported to TimeSeries: {imported_count}")
        print(f" - Duplicates Skipped:             {skipped_duplicates}")
        print(f" - Traffic Records Generated:      {traffic_records_created}")
        print(f" - Data Source Label:              'METR-LA'")
        print("==========================================================\n")

    except Exception as e:
        db.rollback()
        print(f"Error during METR-LA import: {e}")
    finally:
        db.close()

def main():
    parser = argparse.ArgumentParser(description="METR-LA Traffic Flow Dataset Importer")
    parser.add_argument("--limit", type=int, default=1000, help="Number of records to import (default: 1000)")
    parser.add_argument("--split", type=str, default="val", choices=["val", "test", "train"], help="Dataset split file")
    args = parser.parse_args()

    import_metr_la(limit_rows=args.limit, file_split=args.split)

if __name__ == "__main__":
    main()
