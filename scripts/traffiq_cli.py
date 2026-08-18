import sys
import os
import argparse
import subprocess
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent

def run_command(cmd, cwd=None):
    """Execute a CLI command cleanly."""
    print(f"\n[TRAFFIQ CLI] Executing: {' '.join(cmd)}")
    result = subprocess.run(cmd, cwd=cwd or BASE_DIR)
    return result.returncode

def main():
    parser = argparse.ArgumentParser(
        description="TRAFFIQ — Intelligent Traffic System On-Demand Management CLI",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  python scripts/traffiq_cli.py prepare-bmd45 --limit 1000
  python scripts/traffiq_cli.py train-model --epochs 10
  python scripts/traffiq_cli.py import-metr-la --limit 500
  python scripts/traffiq_cli.py process-video --source data/traffic.mp4
  python scripts/traffiq_cli.py status
"""
    )
    subparsers = parser.add_subparsers(dest="command", help="Command to execute")

    # 1. Prepare BMD-45
    p_bmd = subparsers.add_parser("prepare-bmd45", help="Prepare & convert BMD-45 dataset annotations to YOLO format")
    p_bmd.add_argument("--download-sample", action="store_true", default=True, help="Download annotations from HuggingFace")
    p_bmd.add_argument("--limit", type=int, default=1000, help="Number of images to convert")

    # 2. Train Model
    p_train = subparsers.add_parser("train-model", help="Fine-tune YOLOv8 model on prepared BMD-45 dataset")
    p_train.add_argument("--epochs", type=int, default=10, help="Number of training epochs")
    p_train.add_argument("--batch", type=int, default=8, help="Batch size")
    p_train.add_argument("--imgsz", type=int, default=640, help="Image resolution")

    # 3. Import METR-LA
    p_metr = subparsers.add_parser("import-metr-la", help="Import METR-LA sensor time-series data")
    p_metr.add_argument("--limit", type=int, default=1000, help="Number of records to import")
    p_metr.add_argument("--split", type=str, default="val", choices=["val", "test", "train"], help="Parquet file split")

    # 4. Process Video
    p_video = subparsers.add_parser("process-video", help="Run AI detection & tracking worker on video source")
    p_video.add_argument("--source", type=str, default="data/traffic.mp4", help="Video source file or RTSP URL")

    # 5. Status
    subparsers.add_parser("status", help="Display system data telemetry & database record statistics")

    args = parser.parse_args()

    if not args.command:
        parser.print_help()
        return

    if args.command == "prepare-bmd45":
        cmd = [sys.executable, "scripts/prepare_bmd45.py", "--limit", str(args.limit)]
        if args.download_sample:
            cmd.append("--download-sample")
        sys.exit(run_command(cmd))

    elif args.command == "train-model":
        cmd = [sys.executable, "scripts/train_traffic_model.py", "--epochs", str(args.epochs), "--batch", str(args.batch), "--imgsz", str(args.imgsz)]
        sys.exit(run_command(cmd))

    elif args.command == "import-metr-la":
        cmd = [sys.executable, "scripts/import_metr_la.py", "--limit", str(args.limit), "--split", args.split]
        sys.exit(run_command(cmd))

    elif args.command == "process-video":
        cmd = [sys.executable, "ai/live_traffic.py"]
        sys.exit(run_command(cmd))

    elif args.command == "status":
        print("\n==========================================================")
        print(" TRAFFIQ - System & Telemetry Status Summary")
        print("==========================================================")
        
        # Check SQLite record counts
        try:
            sys.path.append(str(BASE_DIR / "backend"))
            from app.database import SessionLocal
            from app.models.base import VehicleDetection, VehicleTrack, VehicleCrossing, TrafficRecord, TrafficTimeSeries, TrafficViolation
            db = SessionLocal()
            
            print(f" - Vehicle Detections: {db.query(VehicleDetection).count()}")
            print(f" - Persistent Tracks:  {db.query(VehicleTrack).count()}")
            print(f" - Line Crossings:     {db.query(VehicleCrossing).count()}")
            print(f" - Traffic Records:    {db.query(TrafficRecord).count()}")
            print(f" - METR-LA Series:     {db.query(TrafficTimeSeries).count()}")
            print(f" - Violations Logged:  {db.query(TrafficViolation).count()}")
            db.close()
        except Exception as e:
            print(f" Database query note: {e}")

        # Check dataset directories
        bmd_yaml = BASE_DIR / "data" / "bmd45" / "bmd45.yaml"
        bmd_status = "Available" if bmd_yaml.exists() else "Not Prepared"
        best_model = BASE_DIR / "models" / "best_bmd45.pt"
        model_status = "Trained (best_bmd45.pt)" if best_model.exists() else "Baseline (yolov8n.pt)"

        print(f" - BMD-45 Dataset:    {bmd_status}")
        print(f" - AI Model Status:   {model_status}")
        print("==========================================================\n")

if __name__ == "__main__":
    main()
