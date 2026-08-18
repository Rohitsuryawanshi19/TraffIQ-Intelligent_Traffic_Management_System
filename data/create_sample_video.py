import cv2
import numpy as np
import os
import random

def generate_sample_traffic_video(output_path="data/traffic.mp4"):
    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    width, height = 640, 480
    fps = 30
    duration_sec = 10
    total_frames = fps * duration_sec

    fourcc = cv2.VideoWriter_fourcc(*'mp4v')
    out = cv2.VideoWriter(output_path, fourcc, fps, (width, height))

    # Generate synthetic vehicle rectangles moving across 4 quadrants
    vehicles = [
        {"x": random.randint(50, 250), "y": random.randint(50, 200), "dx": random.choice([1, 2]), "dy": random.choice([1, 0])}
        for _ in range(15)
    ]

    for frame_idx in range(total_frames):
        # Create dark road junction background
        img = np.zeros((height, width, 3), dtype=np.uint8)
        img[:] = (40, 40, 40)

        # Draw intersection lines
        cv2.line(img, (width // 2, 0), (width // 2, height), (255, 255, 255), 2)
        cv2.line(img, (0, height // 2), (width, height // 2), (255, 255, 255), 2)

        # Draw lane labels
        cv2.putText(img, "Lane 1 (NW)", (20, 30), cv2.FONT_HERSHEY_SIMPLEX, 0.6, (200, 200, 200), 1)
        cv2.putText(img, "Lane 2 (NE)", (width // 2 + 20, 30), cv2.FONT_HERSHEY_SIMPLEX, 0.6, (200, 200, 200), 1)
        cv2.putText(img, "Lane 3 (SW)", (20, height // 2 + 30), cv2.FONT_HERSHEY_SIMPLEX, 0.6, (200, 200, 200), 1)
        cv2.putText(img, "Lane 4 (SE)", (width // 2 + 20, height // 2 + 30), cv2.FONT_HERSHEY_SIMPLEX, 0.6, (200, 200, 200), 1)

        # Update and draw vehicles
        for v in vehicles:
            v["x"] = (v["x"] + v["dx"]) % width
            v["y"] = (v["y"] + v["dy"]) % height
            # Draw vehicle box
            cv2.rectangle(img, (v["x"], v["y"]), (v["x"] + 30, v["y"] + 20), (0, 255, 120), -1)

        out.write(img)

    out.release()
    print(f"Sample traffic video created at {output_path}")

if __name__ == "__main__":
    generate_sample_traffic_video()
