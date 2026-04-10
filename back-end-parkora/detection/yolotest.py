from ultralytics import YOLO

model = YOLO("yolov8n.pt")


results = model(source= 1 , show=True, stream=True)

for result in results:
    pass  # Keep the loop running to display the video feed