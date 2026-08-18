# TRAFFIQ — Model Training & Evaluation Guide

This guide explains how to fine-tune YOLOv8 on the **BMD-45** dataset and evaluate empirical performance metrics (Precision, Recall, mAP@50, mAP@50-95).

---

## 1. Dataset Preparation

First prepare the converted YOLO dataset structure:

```bash
python scripts/prepare_bmd45.py --download-sample --limit 2000
```

Output generated:
- Configuration: `data/bmd45/bmd45.yaml`
- Splits: `data/bmd45/images/{train,val,test}` and `data/bmd45/labels/{train,val,test}`

---

## 2. Model Fine-Tuning Script

Run `scripts/train_traffic_model.py` with custom hyperparameters:

```bash
python scripts/train_traffic_model.py --epochs 10 --batch 8 --imgsz 640
```

### CLI Arguments:
- `--data`: Path to dataset YAML (default: `data/bmd45/bmd45.yaml`).
- `--model`: Base pretrained weights (default: `yolov8n.pt`).
- `--epochs`: Number of training epochs (default: `10`).
- `--batch`: Batch size (default: `8`).
- `--imgsz`: Input image resolution (default: `640`).
- `--device`: Target compute device (`cpu` or CUDA GPU ID `0`). Auto-detected if omitted.
- `--output`: Output directory for trained weights (default: `models/`).

Upon completion, the best weights are automatically saved to:
`models/best_bmd45.pt`

---

## 3. Empirical Model Evaluation

Evaluate trained weights on the validation or test split to measure empirical performance:

```bash
python scripts/evaluate_traffic_model.py --weights models/best_bmd45.pt --split val
```

### Output Metrics:
- **Precision (P)**: Proportion of correct positive vehicle detections.
- **Recall (R)**: Proportion of actual vehicles detected.
- **mAP@50**: Mean Average Precision at IoU threshold 0.50.
- **mAP@50-95**: Mean Average Precision averaged over IoU thresholds 0.50 to 0.95.

---

## 4. Pipeline Integration

The AI detection service ([`ai/live_traffic.py`](file:///c:/Smart-Traffic-System/ai/live_traffic.py)) automatically checks for `models/best_bmd45.pt` on startup. If found, it uses fine-tuned BMD-45 weights for inference; otherwise, it falls back to baseline `yolov8n.pt`.
