import json
import logging
from typing import List, Dict, Any
from fastapi import WebSocket

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("websocket_manager")

class ConnectionManager:
    def __init__(self):
        self.active_connections: List[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)
        logger.info(f"WebSocket client connected. Active connections: {len(self.active_connections)}")

    def disconnect(self, websocket: WebSocket):
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)
            logger.info(f"WebSocket client disconnected. Active connections: {len(self.active_connections)}")

    async def broadcast(self, event_type: str, data: Dict[str, Any]):
        """Broadcast real-time telemetry event to all connected dashboard WebSocket clients."""
        if not self.active_connections:
            return

        payload = json.dumps({
            "event": event_type,
            "data": data
        })

        disconnected = []
        for connection in self.active_connections:
            try:
                await connection.send_text(payload)
            except Exception as e:
                logger.warning(f"Error sending WebSocket message: {e}")
                disconnected.append(connection)

        for dead_conn in disconnected:
            self.disconnect(dead_conn)

ws_manager = ConnectionManager()
