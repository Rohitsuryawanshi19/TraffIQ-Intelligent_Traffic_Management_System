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
DEFAULT_MODEL = BASE_DIR / "models" / "best_bmd45.pt"

def main():
    parser = argparse.ArgumentParser(description="TRAFFIQ - Model Evaluation Script")
    parser.add_argument("--weights", type=str, default=str(DEFAULT_MODEL), help="Path to model weights file")
    parser.add_argument("--data", type=str, default=str(DEFAULT_DATA_YAML), help="Path to dataset YAML config")
    parser.add_argument("--split", type=str, default="val", choices=["val", "test"], help="Dataset split to evaluate")
    parser.add_argument("--imgsz", type=int, default=640, help="Image resolution size (default: 640)")
    parser.add_argument("--device", type=str, default=None, help="Device ('cpu', '0', etc.)")
    args = parser.parse_args()

    if not YOLO_AVAILABLE:
        print("Error: 'ultralytics' library is not installed.")
        return

    weights_path = Path(args.weights)
    if not weights_path.exists():
        print(f"Weights file '{weights_path}' not found. Falling back to default 'yolov8n.pt'")
        weights_path = "yolov8n.pt"

    data_path = Path(args.data)
    if not data_path.exists():
        print(f"Error: Dataset YAML config '{data_path}' not found.")
        return

    device = args.device or ("0" if torch.cuda.is_available() else "cpu")

    print("==========================================================")
    print(" TRAFFIQ - Model Evaluation & Performance Metrics")
    print("==========================================================")
    print(f" - Model Weights:  {weights_path}")
    print(f" - Dataset Config: {data_path}")
    print(f" - Evaluation Split: {args.split}")
    print(f" - Selected Device: {device}")
    print("==========================================================")

    model = YOLO(str(weights_path))

    metrics = model.val(
        data=str(data_path),
        split=args.split,
        imgsz=args.imgsz,
        device=device,
        verbose=True
    )

    print("\n----------------------------------------------------------")
    print(" Empirical Performance Results")
    print("----------------------------------------------------------")
    try:
        print(f" Precision (P):    {metrics.box.mp:.4f}")
        print(f" Recall (R):       {metrics.box.mr:.4f}")
        print(f" mAP@50:           {metrics.box.map50:.4f}")
        print(f" mAP@50-95:        {metrics.box.map:.4f}")
    except Exception as e:
        print(f" Overall Metrics Summary: {metrics}")
    print("----------------------------------------------------------")

if __name__ == "__main__":
    main()
