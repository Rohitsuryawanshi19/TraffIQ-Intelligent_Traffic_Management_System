import os
import shutil
import argparse
import torch
from pathlib import Path

try:
    from ultralytics import YOLO
    YOLO_AVAILABLE = True
except ImportError:
    YOLO_AVAILABLE = False

BASE_DIR = Path(__file__).resolve().parent.parent
DEFAULT_DATA_YAML = BASE_DIR / "data" / "bmd45" / "bmd45.yaml"
DEFAULT_OUTPUT_DIR = BASE_DIR / "models"

def main():
    parser = argparse.ArgumentParser(description="TRAFFIQ - BMD-45 YOLOv8 Model Training Script")
    parser.add_argument("--data", type=str, default=str(DEFAULT_DATA_YAML), help="Path to dataset YAML config")
    parser.add_argument("--model", type=str, default="yolov8n.pt", help="Pretrained model weights (e.g. yolov8n.pt, yolov8s.pt)")
    parser.add_argument("--epochs", type=int, default=10, help="Number of training epochs (default: 10)")
    parser.add_argument("--imgsz", type=int, default=640, help="Image resolution size (default: 640)")
    parser.add_argument("--batch", type=int, default=8, help="Batch size (default: 8)")
    parser.add_argument("--device", type=str, default=None, help="Device ('cpu', '0', '0,1', etc.). Auto-detects CUDA if None")
    parser.add_argument("--output", type=str, default=str(DEFAULT_OUTPUT_DIR), help="Output directory to save trained model weights")
    args = parser.parse_args()

    if not YOLO_AVAILABLE:
        print("Error: 'ultralytics' library is not installed. Run 'pip install ultralytics'.")
        return

    data_path = Path(args.data)
    if not data_path.exists():
        print(f"Error: Dataset YAML not found at '{data_path}'. Run 'python scripts/prepare_bmd45.py' first.")
        return

    # Auto-select device
    if args.device is None:
        device = "0" if torch.cuda.is_available() else "cpu"
    else:
        device = args.device

    print("==========================================================")
    print(" TRAFFIQ - Fine-Tuning YOLOv8 on BMD-45 Dataset")
    print("==========================================================")
    print(f" - Pretrained Model: {args.model}")
    print(f" - Dataset Config:   {data_path}")
    print(f" - Epochs:           {args.epochs}")
    print(f" - Image Size:       {args.imgsz}")
    print(f" - Batch Size:       {args.batch}")
    print(f" - Selected Device:  {device} (CUDA Available: {torch.cuda.is_available()})")
    print(f" - Target Output:    {args.output}")
    print("==========================================================")

    model = YOLO(args.model)

    # Train model
    results = model.train(
        data=str(data_path),
        epochs=args.epochs,
        imgsz=args.imgsz,
        batch=args.batch,
        device=device,
        project=args.output,
        name="bmd45_run",
        exist_ok=True,
        verbose=True
    )

    # Copy best weights to models/best_bmd45.pt
    best_weights = Path(args.output) / "bmd45_run" / "weights" / "best.pt"
    target_weights = Path(args.output) / "best_bmd45.pt"

    if best_weights.exists():
        shutil.copy(best_weights, target_weights)
        print(f"\nTraining Complete! Best model saved to: {target_weights}")
    else:
        print("\nTraining completed. Weights saved in project run directory.")

if __name__ == "__main__":
    main()
