from collections import defaultdict
from fastapi import WebSocket


class ConnectionManager:
    def __init__(self):
        # Each lot_id maps to its own list of connected WebSocket clients.
        # defaultdict(list) means accessing a new key auto-creates an empty list.
        self.active_connections: dict[str, list[WebSocket]] = defaultdict(list)

    async def connect(self, lot_id: str, websocket: WebSocket):
        await websocket.accept()
        self.active_connections[lot_id].append(websocket)
        total = len(self.active_connections[lot_id])
        print(f"[WS] Client connected to lot {lot_id}. Total for this lot: {total}")

    def disconnect(self, lot_id: str, websocket: WebSocket):
        self.active_connections[lot_id].remove(websocket)
        total = len(self.active_connections[lot_id])
        print(f"[WS] Client disconnected from lot {lot_id}. Total for this lot: {total}")

    async def broadcast_to_lot(self, lot_id: str, message: str):
        """Send a message only to clients subscribed to a specific lot."""
        for connection in self.active_connections[lot_id]:
            await connection.send_text(message)


# Single instance shared across the entire app
manager = ConnectionManager()
