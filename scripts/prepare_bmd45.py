import os
import json
import random
import argparse
from pathlib import Path
from huggingface_hub import hf_hub_download

# Default target directory structure
BASE_DIR = Path(__file__).resolve().parent.parent
DATA_DIR = BASE_DIR / "data" / "bmd45"

# BMD-45 Standard Category Mapping (IISc AIM)
BMD45_CLASSES = {
    0: 'Hatchback',
    1: 'Sedan',
    2: 'SUV',
    3: 'MUV',
    4: 'Bus',
    5: 'Truck',
    6: 'Three-wheeler',
    7: 'Two-wheeler',
    8: 'LCV',
    9: 'Mini-bus',
    10: 'Tractor',
    11: 'E-rickshaw',
    12: 'Emergency Vehicle'
}

def create_directory_structure():
    """Create data/bmd45 YOLO directory tree."""
    dirs = [
        DATA_DIR / "images" / "train",
        DATA_DIR / "images" / "val",
        DATA_DIR / "images" / "test",
        DATA_DIR / "labels" / "train",
        DATA_DIR / "labels" / "val",
        DATA_DIR / "labels" / "test",
        DATA_DIR / "metadata"
    ]
    for d in dirs:
        d.mkdir(parents=True, exist_ok=True)
    print(f"Created dataset directory structure in {DATA_DIR}")

def convert_coco_bbox_to_yolo(bbox, img_w, img_h):
    """Convert COCO bbox [x, y, w, h] to YOLO normalized [x_center, y_center, w_norm, h_norm]."""
    x, y, w, h = bbox
    if img_w <= 0 or img_h <= 0:
        return 0, 0, 0, 0
    x_center = (x + w / 2.0) / img_w
    y_center = (y + h / 2.0) / img_h
    norm_w = w / img_w
    norm_h = h / img_h
    # Clamp to [0, 1]
    x_center = min(max(x_center, 0.0), 1.0)
    y_center = min(max(y_center, 0.0), 1.0)
    norm_w = min(max(norm_w, 0.0), 1.0)
    norm_h = min(max(norm_h, 0.0), 1.0)
    return x_center, y_center, norm_w, norm_h

def generate_yaml():
    """Generate YOLOv8 dataset configuration bmd45.yaml."""
    yaml_path = DATA_DIR / "bmd45.yaml"
    names_str = "\n".join([f"  {k}: '{v}'" for k, v in BMD45_CLASSES.items()])
    content = f"""path: {DATA_DIR.as_posix()}
train: images/train
val: images/val
test: images/test

names:
{names_str}
"""
    with open(yaml_path, "w", encoding="utf-8") as f:
        f.write(content)
    print(f"Generated YOLO config: {yaml_path}")

def process_coco_json(coco_path, sample_limit=None, split_ratios=(0.7, 0.2, 0.1)):
    """Parse COCO json annotations, split into train/val/test, and convert to YOLO labels."""
    print(f"Loading COCO annotations from {coco_path}...")
    with open(coco_path, "r", encoding="utf-8") as f:
        coco_data = json.load(f)

    images = {img["id"]: img for img in coco_data.get("images", [])}
    categories = {cat["id"]: cat["name"] for cat in coco_data.get("categories", [])}

    # Group annotations by image_id
    img_annotations = {}
    for ann in coco_data.get("annotations", []):
        img_id = ann["image_id"]
        if img_id not in img_annotations:
            img_annotations[img_id] = []
        img_annotations[img_id].append(ann)

    all_img_ids = list(images.keys())
    random.seed(42)
    random.shuffle(all_img_ids)

    if sample_limit and sample_limit < len(all_img_ids):
        all_img_ids = all_img_ids[:sample_limit]
        print(f"Sample limit applied: processing {sample_limit} images")

    total = len(all_img_ids)
    n_train = int(total * split_ratios[0])
    n_val = int(total * split_ratios[1])

    train_ids = set(all_img_ids[:n_train])
    val_ids = set(all_img_ids[n_train:n_train + n_val])
    test_ids = set(all_img_ids[n_train + n_val:])

    processed_count = 0
    total_labels = 0

    for img_id in all_img_ids:
        img_info = images[img_id]
        filename = Path(img_info["file_name"]).name
        stem = Path(filename).stem

        if img_id in train_ids:
            split = "train"
        elif img_id in val_ids:
            split = "val"
        else:
            split = "test"

        label_path = DATA_DIR / "labels" / split / f"{stem}.txt"
        img_w = img_info.get("width", 1920)
        img_h = img_info.get("height", 1080)

        anns = img_annotations.get(img_id, [])
        label_lines = []

        for ann in anns:
            category_id = ann.get("category_id", 0)
            bbox = ann.get("bbox", [])
            if len(bbox) == 4:
                cx, cy, nw, nh = convert_coco_bbox_to_yolo(bbox, img_w, img_h)
                label_lines.append(f"{category_id} {cx:.6f} {cy:.6f} {nw:.6f} {nh:.6f}")
                total_labels += 1

        with open(label_path, "w", encoding="utf-8") as f:
            f.write("\n".join(label_lines) + ("\n" if label_lines else ""))

        processed_count += 1

    print(f"\nCompleted BMD-45 Preparation:")
    print(f" - Processed Images: {processed_count}")
    print(f" - Total YOLO Label Entries: {total_labels}")
    print(f" - Train Split: {len(train_ids)} images")
    print(f" - Val Split: {len(val_ids)} images")
    print(f" - Test Split: {len(test_ids)} images")

def main():
    parser = argparse.ArgumentParser(description="BMD-45 Dataset Preparation & YOLO Converter")
    parser.add_argument("--json", type=str, help="Path to local _annotations.coco.json")
    parser.add_argument("--download-sample", action="store_true", help="Download BMD-45 COCO JSON metadata from HuggingFace")
    parser.add_argument("--limit", type=int, default=1000, help="Limit number of images to convert (default: 1000)")
    args = parser.parse_args()

    create_directory_structure()
    generate_yaml()

    json_path = args.json
    if not json_path and args.download_sample:
        print("Downloading BMD-45 COCO JSON metadata from HuggingFace (iisc-aim/BMD-45)...")
        json_path = hf_hub_download(repo_id="iisc-aim/BMD-45", filename="BMD-45-Train/_annotations.coco.json", repo_type="dataset")

    if json_path and os.path.exists(json_path):
        process_coco_json(json_path, sample_limit=args.limit)
    else:
        print("\nNote: No COCO JSON file provided. Generated YAML and directory structure.")
        print("Usage:")
        print("  python scripts/prepare_bmd45.py --download-sample --limit 2000")
        print("  python scripts/prepare_bmd45.py --json path/to/_annotations.coco.json")

if __name__ == "__main__":
    main()
