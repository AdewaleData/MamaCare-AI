from fastapi import WebSocket
from typing import List, Dict
import json
from datetime import datetime
import logging

logger = logging.getLogger(__name__)

class ConnectionManager:
    """Manages WebSocket connections for real-time notifications."""
    
    def __init__(self):
        # active_connections: {user_id: [WebSocket, ...]}
        self.active_connections: Dict[str, List[WebSocket]] = {}
    
    async def connect(self, websocket: WebSocket, user_id: str):
        """Register a new WebSocket connection."""
        await websocket.accept()
        
        if user_id not in self.active_connections:
            self.active_connections[user_id] = []
        
        self.active_connections[user_id].append(websocket)
        logger.info(f"WebSocket connected for user {user_id}")
    
    def disconnect(self, websocket: WebSocket, user_id: str):
        """Remove a WebSocket connection."""
        if user_id in self.active_connections:
            try:
                self.active_connections[user_id].remove(websocket)
                if not self.active_connections[user_id]:
                    del self.active_connections[user_id]
                logger.info(f"WebSocket disconnected for user {user_id}")
            except ValueError:
                pass
    
    async def send_personal_json(self, user_id: str, data: dict):
        """Send JSON message to all connections for a specific user."""
        if user_id in self.active_connections:
            disconnected = []
            for connection in self.active_connections[user_id]:
                try:
                    await connection.send_json(data)
                except Exception as e:
                    logger.error(f"Error sending message: {e}")
                    disconnected.append(connection)
            
            # Clean up disconnected clients
            for conn in disconnected:
                self.disconnect(conn, user_id)
    
    async def broadcast_to_providers(self, data: dict):
        """Broadcast message to all connected providers."""
        for user_id, connections in list(self.active_connections.items()):
            disconnected = []
            for connection in connections:
                try:
                    await connection.send_json(data)
                except Exception as e:
                    logger.error(f"Error broadcasting: {e}")
                    disconnected.append(connection)
            
            for conn in disconnected:
                self.disconnect(conn, user_id)
    
    async def send_alert_notification(
        self, 
        alert_id: str, 
        patient_name: str, 
        risk_level: str, 
        user_ids_to_notify: List[str] = None
    ):
        """Send alert notification to providers or specific users."""
        notification = {
            "type": "emergency_alert",
            "timestamp": datetime.utcnow().isoformat(),
            "alert_id": alert_id,
            "patient_name": patient_name,
            "risk_level": risk_level,
            "message": f"🚨 HIGH RISK ALERT: {patient_name} - Risk Level: {risk_level}"
        }
        
        if user_ids_to_notify:
            for user_id in user_ids_to_notify:
                await self.send_personal_json(user_id, notification)
        else:
            # Broadcast to all providers
            await self.broadcast_to_providers(notification)

# Global connection manager instance
manager = ConnectionManager()

