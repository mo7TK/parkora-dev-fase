import cv2
import json
import time
import numpy as np
import requests
from ultralytics import YOLO

# ── Configuration ────────────────────────────────────────────────────────────
VIDEO_PATH      = 1
SPOTS_FILE      = "spots.json"
BACKEND_URL     = "http://127.0.0.1:8000/update-spots"
SEND_EVERY      = 1.0    # seconds between each POST to the backend
CONFIDENCE      = 0.35   # YOLO confidence threshold (0 to 1)

# ── Parking lot identity ──────────────────────────────────────────────────────
# Paste the MongoDB id printed by seed.py here.
PARKING_LOT_ID  = "69d66286fb20ec39630cff9b"

# ── Internal secret key ───────────────────────────────────────────────────────
# Must match INTERNAL_SECRET in your backend .env file.
INTERNAL_SECRET = "dev-secret-change-me"
# ─────────────────────────────────────────────────────────────────────────────

# ── Performance tuning ───────────────────────────────────────────────────────
INFER_EVERY = 5     # run YOLO only on every Nth frame
INFER_WIDTH = 640   # resize frame to this width before inference (None = original)

# ── COCO class IDs ───────────────────────────────────────────────────────────
VEHICLE_CLASSES = {2, 3, 5, 7}
# ─────────────────────────────────────────────────────────────────────────────


def load_spots(path):
    with open(path, "r") as f:
        raw = json.load(f)
    return [np.array(polygon, dtype=np.int32) for polygon in raw]


def is_vehicle_in_spot(spot_polygon, detection_box):
    x1, y1, x2, y2 = detection_box
    center_x      = int((x1 + x2) / 2)
    center_y      = int((y1 + y2) / 2)
    bottom_center = (center_x, int(y2))
    center        = (center_x, center_y)
    inside_bottom = cv2.pointPolygonTest(spot_polygon, bottom_center, False) >= 0
    inside_center = cv2.pointPolygonTest(spot_polygon, center,        False) >= 0
    return inside_bottom or inside_center


def compute_statuses(spots, vehicle_boxes):
    statuses = []
    for spot in spots:
        occupied = any(is_vehicle_in_spot(spot, box) for box in vehicle_boxes)
        statuses.append("occupied" if occupied else "free")
    return statuses


def draw_frame(frame, spots, statuses):
    for i, (spot, status) in enumerate(zip(spots, statuses)):
        color = (0, 200, 0) if status == "free" else (0, 0, 220)
        overlay = frame.copy()
        cv2.fillPoly(overlay, [spot], color)
        cv2.addWeighted(overlay, 0.35, frame, 0.65, 0, frame)
        cv2.polylines(frame, [spot], isClosed=True, color=color, thickness=2)
        cx = int(spot[:, 0].mean())
        cy = int(spot[:, 1].mean())
        cv2.putText(frame, str(i + 1), (cx - 8, cy + 6),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.6, (255, 255, 255), 2)
    free_count     = statuses.count("free")
    occupied_count = statuses.count("occupied")
    cv2.rectangle(frame, (0, 0), (320, 40), (0, 0, 0), -1)
    cv2.putText(frame,
                f"Free: {free_count}   Occupied: {occupied_count}",
                (10, 27), cv2.FONT_HERSHEY_SIMPLEX, 0.75, (255, 255, 255), 2)


def send_to_backend(statuses):
    """
    POST current spot statuses to the backend.
    Now includes:
      - lot_id in the body  → tells the backend which parking lot this is
      - X-Secret-Key header → proves this request comes from detect.py
    """
    payload = {
        "lot_id": PARKING_LOT_ID,
        "spots": [
            {"id": i + 1, "status": status}
            for i, status in enumerate(statuses)
        ],
    }
    headers = {
        "X-Secret-Key": INTERNAL_SECRET,
    }
    try:
        response = requests.post(BACKEND_URL, json=payload, headers=headers, timeout=1)
        print(f"[{time.strftime('%H:%M:%S')}] Sent → {response.status_code} | "
              f"Free: {statuses.count('free')}  Occupied: {statuses.count('occupied')}")
    except requests.exceptions.ConnectionError:
        print(f"[{time.strftime('%H:%M:%S')}] Backend not reachable, skipping send.")
    except Exception as e:
        print(f"[{time.strftime('%H:%M:%S')}] Send error: {e}")


# ── Main ─────────────────────────────────────────────────────────────────────

print("Loading spots...")
spots = load_spots(SPOTS_FILE)
print(f"  {len(spots)} spots loaded from {SPOTS_FILE}")

print("Loading YOLO model...")
model = YOLO("yolov8n.pt")
print("  YOLO ready.")

cap = cv2.VideoCapture(VIDEO_PATH)
if not cap.isOpened():
    print(f"ERROR: Could not open '{VIDEO_PATH}'")
    exit(1)

last_send_time = 0
frame_count    = 0
statuses       = ["free"] * len(spots)

print("\nDetection running. Press Q in the window to stop.\n")

while True:
    ret, frame = cap.read()
    if not ret:
        print("Stream read failed.")
        break

    frame_count += 1

    if frame_count % INFER_EVERY == 0:
        if INFER_WIDTH:
            h, w  = frame.shape[:2]
            scale = INFER_WIDTH / w
            infer_frame = cv2.resize(frame, (INFER_WIDTH, int(h * scale)))
        else:
            infer_frame = frame
            scale       = 1.0

        results = model(infer_frame, verbose=False)[0]

        vehicle_boxes = []
        for box in results.boxes:
            cls_id     = int(box.cls[0])
            confidence = float(box.conf[0])
            if cls_id in VEHICLE_CLASSES and confidence >= CONFIDENCE:
                x1, y1, x2, y2 = map(int, box.xyxy[0])
                if scale != 1.0:
                    x1, y1, x2, y2 = (int(x1 / scale), int(y1 / scale),
                                       int(x2 / scale), int(y2 / scale))
                vehicle_boxes.append((x1, y1, x2, y2))

        statuses = compute_statuses(spots, vehicle_boxes)

    draw_frame(frame, spots, statuses)
    cv2.imshow("Parking Detection", frame)

    now = time.time()
    if now - last_send_time >= SEND_EVERY:
        send_to_backend(statuses)
        last_send_time = now

    if cv2.waitKey(1) & 0xFF == ord('q'):
        break

cap.release()
cv2.destroyAllWindows()
print("Detection stopped.")
