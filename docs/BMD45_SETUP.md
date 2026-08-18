# BMD-45 (Bengaluru Mobility Dataset) Setup & Preparation Guide

This guide describes how to prepare and convert the **BMD-45 (Bengaluru Mobility Dataset)** from IISc AIM into the standard YOLO format required by the **TRAFFIQ** vehicle detection and classification pipeline.

---

## 1. Dataset Overview

- **Source**: [iisc-aim/BMD-45 on HuggingFace](https://huggingface.co/datasets/iisc-aim/BMD-45)
- **Annotations**: COCO JSON format (`_annotations.coco.json`) with **35,792 images** and **373,132 bounding box annotations**.
- **13 Vehicle Classes**:
  0. `Hatchback`
  1. `Sedan`
  2. `SUV`
  3. `MUV`
  4. `Bus`
  5. `Truck`
  6. `Three-wheeler` (Auto-rickshaw / Auto)
  7. `Two-wheeler` (Motorcycle / Scooter)
  8. `LCV` (Light Commercial Vehicle)
  9. `Mini-bus`
  10. `Tractor`
  11. `E-rickshaw`
  12. `Emergency Vehicle`

---

## 2. Directory Structure

Converted dataset files are saved locally under `data/bmd45/` (automatically excluded from Git via `.gitignore`):

```
data/
└── bmd45/
    ├── bmd45.yaml           # YOLOv8 dataset configuration file
    ├── images/
    │   ├── train/
    │   ├── val/
    │   └── test/
    ├── labels/
    │   ├── train/
    │   ├── val/
    │   └── test/
    └── metadata/
```

---

## 3. Preparation & Conversion Steps

### Option A: Automatic HuggingFace Download & Preparation (Recommended)

Run the reusable converter script with `--download-sample`:

```bash
python scripts/prepare_bmd45.py --download-sample --limit 2000
```

### Option B: Local COCO JSON Conversion

If you have downloaded the BMD-45 dataset locally:

```bash
python scripts/prepare_bmd45.py --json path/to/_annotations.coco.json --limit 5000
```

---

## 4. Output Verification

The script automatically generates:
1. `data/bmd45/bmd45.yaml`: Class mapping and split paths for YOLOv8.
2. `data/bmd45/labels/{train,val,test}/*.txt`: Normalized YOLO bounding boxes:
   `<class_id> <x_center> <y_center> <width> <height>`

---

## 5. Next Steps

Use `data/bmd45/bmd45.yaml` directly with Ultralytics YOLOv8 for fine-tuning or inference in the TRAFFIQ pipeline:

```python
from ultralytics import YOLO

model = YOLO("yolov8n.pt")
model.train(data="data/bmd45/bmd45.yaml", epochs=10, imgsz=640)
```
