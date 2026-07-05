from fastapi import APIRouter, Depends, WebSocket, WebSocketDisconnect, Query, HTTPException, status
from typing import Dict, List
from datetime import datetime
import json

import schemas
import services
from db import get_db_connection
from auth import get_current_user
from envelope import success
from logger import get_logger

logger = get_logger(__name__)

router = APIRouter(
    tags=["Chat"]
)

class ConnectionManager:
    def __init__(self):
        # Maps item_id -> list of active websockets
        self.active: Dict[str, List[WebSocket]] = {}

    async def connect(self, item_id: str, websocket: WebSocket):
        await websocket.accept()
        if item_id not in self.active:
            self.active[item_id] = []
        self.active[item_id].append(websocket)

    def disconnect(self, item_id: str, websocket: WebSocket):
        if item_id in self.active:
            self.active[item_id].remove(websocket)
            if not self.active[item_id]:
                del self.active[item_id]

    async def broadcast(self, item_id: str, message: dict):
        if item_id not in self.active:
            return
        for connection in self.active[item_id]:
            try:
                await connection.send_text(json.dumps(message))
            except Exception:
                # Handle dead connections gracefully
                pass

manager = ConnectionManager()

@router.get(
    "/marketplace/chat/{item_id}/history", 
    response_model=list[schemas.MessageResponse],
    summary="Get chat history for an item listing"
)
def get_chat_history(
    item_id: str,
    current_user=Depends(get_current_user)
):
    with get_db_connection() as conn:
        messages = services.get_chat_history(conn, item_id, current_user["id"])
    return messages

@router.get(
    "/marketplace/chat/conversations",
    summary="Get all conversations for the current user"
)
def get_conversations(
    current_user=Depends(get_current_user)
):
    user_id = current_user["id"]
    with get_db_connection() as conn:
        cursor = conn.cursor(dictionary=True)
        # Fetch all unique items where user is either sender or seller of the item
        cursor.execute(
            """
            SELECT DISTINCT m.item_id 
            FROM messages m
            JOIN items i ON m.item_id = i.id
            WHERE m.sender_id = %s OR i.seller_id = %s
            """,
            (user_id, user_id)
        )
        item_ids = [row["item_id"] for row in cursor.fetchall()]
        
        result = []
        for item_id in item_ids:
            cursor.execute("SELECT * FROM items WHERE id = %s", (item_id,))
            item = cursor.fetchone()
            if not item:
                continue
                
            # Get last message
            cursor.execute(
                "SELECT * FROM messages WHERE item_id = %s ORDER BY created_at DESC LIMIT 1",
                (item_id,)
            )
            last_msg = cursor.fetchone()
            
            # Identify other participant
            other_id = item["seller_id"] if item["seller_id"] != user_id else (last_msg["sender_id"] if last_msg and last_msg["sender_id"] != user_id else user_id)
            cursor.execute("SELECT full_name, role FROM users WHERE id = %s", (other_id,))
            other = cursor.fetchone()
            
            # Count unread messages received by this user
            cursor.execute(
                """
                SELECT COUNT(*) as count FROM messages 
                WHERE item_id = %s AND sender_id != %s AND is_read = FALSE
                """,
                (item_id, user_id)
            )
            unread = cursor.fetchone()["count"]
            
            result.append({
                "id": item_id,
                "withName": other["full_name"] if other else "Unknown User",
                "withRole": other["role"] if other else "",
                "listingTitle": item["title"],
                "lastMessage": last_msg["content"] if last_msg else "",
                "lastMessageTime": last_msg["created_at"].isoformat() if last_msg else "",
                "unreadCount": unread,
                "online": False
            })
            
        cursor.close()
    return success(result)

@router.patch(
    "/marketplace/chat/{item_id}/read",
    summary="Mark all messages in this conversation as read"
)
def mark_chat_read(
    item_id: str,
    current_user=Depends(get_current_user)
):
    user_id = current_user["id"]
    with get_db_connection() as conn:
        cursor = conn.cursor(dictionary=True)
        cursor.execute(
            """
            SELECT id FROM messages 
            WHERE item_id = %s AND sender_id != %s AND is_read = FALSE
            """,
            (item_id, user_id)
        )
        unread = cursor.fetchall()
        
        now = datetime.utcnow()
        for msg in unread:
            cursor.execute(
                "UPDATE messages SET is_read = TRUE, read_at = %s WHERE id = %s",
                (now, msg["id"])
            )
        conn.commit()
        cursor.close()
        
    return success({"item_id": item_id, "marked_count": len(unread)})

@router.websocket("/chat/ws/{item_id}")
async def websocket_chat(
    item_id: str,
    websocket: WebSocket,
    sender_id: str = Query(...)
):
    """
    WebSocket connection endpoint for real-time messaging inside item listings.
    """
    with get_db_connection() as conn:
        allowed = services.validate_chat_participant(conn, item_id, sender_id)
        
    if not allowed:
        await websocket.close(code=4003)
        return
        
    await manager.connect(item_id, websocket)
    
    try:
        while True:
            data = await websocket.receive_text()
            payload = schemas.MessageCreate(sender_id=sender_id, content=data)
            
            with get_db_connection() as conn:
                message = services.save_message(conn, item_id, payload)
                
            await manager.broadcast(item_id, {
                "message_id": message["id"],
                "item_id":    message["item_id"],
                "sender_id":  message["sender_id"],
                "content":    message["content"],
                "created_at": message["created_at"].isoformat()
            })
    except WebSocketDisconnect:
        manager.disconnect(item_id, websocket)
    except Exception as e:
        logger.error(f"WebSocket error in {item_id}: {str(e)}")
        manager.disconnect(item_id, websocket)
