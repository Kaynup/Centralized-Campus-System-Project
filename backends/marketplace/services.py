import uuid
from decimal import Decimal
from datetime import datetime
from fastapi import HTTPException, status
import schemas
from logger import get_logger

logger = get_logger(__name__)

def generate_uuid():
    return str(uuid.uuid4())

# USER SERVICES
def get_user_by_id(conn, user_id: str) -> dict:
    cursor = conn.cursor(dictionary=True)
    cursor.execute(
        "SELECT id, login_id, full_name, email, role, is_active, is_verified FROM users WHERE id = %s",
        (user_id,)
    )
    user = cursor.fetchone()
    cursor.close()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"User {user_id} not found."
        )
    return user

# WALLET SERVICES
def get_wallet(conn, user_id: str) -> dict:
    cursor = conn.cursor(dictionary=True)
    cursor.execute(
        "SELECT id, user_id, token_balance, reserved_tokens, facility_tokens_used, rental_tokens_used FROM wallets WHERE user_id = %s",
        (user_id,)
    )
    wallet = cursor.fetchone()
    cursor.close()
    if not wallet:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Wallet not found for user {user_id}."
        )
    return wallet

# ITEM SERVICES
def create_item(conn, seller_id: str, payload: schemas.ItemCreate) -> dict:
    get_user_by_id(conn, seller_id) # Validates seller exists
    item_id = generate_uuid()
    condition = payload.condition or payload.condition_grade or "New"
    now = datetime.utcnow()
    
    cursor = conn.cursor()
    cursor.execute(
        """
        INSERT INTO items 
        (id, seller_id, title, description, price, status, listing_channel, category, condition_grade, view_count, image_url, created_at, updated_at)
        VALUES (%s, %s, %s, %s, %s, 'available', %s, %s, %s, 0, NULL, %s, %s)
        """,
        (
            item_id,
            seller_id,
            payload.title,
            payload.description,
            payload.price,
            payload.listing_channel.value,
            payload.category,
            condition,
            now,
            now
        )
    )
    conn.commit()
    cursor.close()
    
    logger.info(f"Item listed: id={item_id} title='{payload.title}' seller_id={seller_id}")
    return get_item_by_id(conn, item_id)

def get_items(conn, channel: str = None, category: str = None, search: str = None) -> list:
    cursor = conn.cursor(dictionary=True)
    query = "SELECT i.*, u.full_name as seller_name, u.role as seller_role FROM items i JOIN users u ON i.seller_id = u.id WHERE i.status = 'available'"
    params = []
    
    if channel:
        query += " AND i.listing_channel = %s"
        params.append(channel)
    if category:
        query += " AND i.category = %s"
        params.append(category)
    if search:
        query += " AND (i.title LIKE %s OR i.description LIKE %s)"
        search_param = f"%{search}%"
        params.append(search_param)
        params.append(search_param)
        
    query += " ORDER BY i.created_at DESC"
    
    cursor.execute(query, tuple(params))
    items = cursor.fetchall()
    cursor.close()
    return items

def get_item_by_id(conn, item_id: str) -> dict:
    cursor = conn.cursor(dictionary=True)
    cursor.execute(
        """
        SELECT i.*, u.full_name as seller_name, u.role as seller_role 
        FROM items i 
        JOIN users u ON i.seller_id = u.id 
        WHERE i.id = %s
        """,
        (item_id,)
    )
    item = cursor.fetchone()
    cursor.close()
    if not item:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Item {item_id} not found."
        )
    return item

# ESCROW TRANSACTION SERVICE WITH STRICT CONCURRENCY LOCKS
def purchase_item(conn, payload: schemas.PurchaseRequest) -> dict:
    """
    Purchase an item and lock tokens inside the buyer's wallet (escrow).
    Utilizes row-level locks on both the wallets and items tables to prevent race conditions.
    """
    conn.start_transaction()
    cursor = conn.cursor(dictionary=True)
    
    try:
        # Step 1: Fetch and Lock the Buyer Wallet row
        cursor.execute(
            "SELECT user_id, token_balance, reserved_tokens FROM wallets WHERE user_id = %s FOR UPDATE",
            (payload.buyer_id,)
        )
        buyer_wallet = cursor.fetchone()
        if not buyer_wallet:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Wallet not found for buyer {payload.buyer_id}."
            )
            
        # Step 2: Fetch and Lock the Item row
        cursor.execute(
            "SELECT id, seller_id, title, price, status FROM items WHERE id = %s FOR UPDATE",
            (payload.item_id,)
        )
        item = cursor.fetchone()
        if not item:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Item {payload.item_id} not found."
            )
            
        # Step 3: Prevent self-purchase
        if item["seller_id"] == payload.buyer_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="You cannot purchase your own item."
            )
            
        # Step 4: Verify item availability
        if item["status"] != "available":
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"Item is no longer available. Status: {item['status']}"
            )
            
        # Step 5: Check buyer balance
        item_price = Decimal(str(item["price"]))
        buyer_balance = Decimal(str(buyer_wallet["token_balance"]))
        if buyer_balance < item_price:
            raise HTTPException(
                status_code=status.HTTP_402_PAYMENT_REQUIRED,
                detail=f"Insufficient balance. Required: {item_price}, Available: {buyer_balance}"
            )
            
        # Step 6: Deduct from spendable and lock in reserved pool
        new_balance = buyer_balance - item_price
        new_reserved = Decimal(str(buyer_wallet["reserved_tokens"])) + item_price
        
        cursor.execute(
            "UPDATE wallets SET token_balance = %s, reserved_tokens = %s WHERE user_id = %s",
            (new_balance, new_reserved, payload.buyer_id)
        )
        
        # Step 7: Mark item as reserved
        cursor.execute(
            "UPDATE items SET status = 'reserved' WHERE id = %s",
            (item["id"],)
        )
        
        # Step 8: Create holding record (escrow lock)
        holding_id = generate_uuid()
        cursor.execute(
            """
            INSERT INTO holding_records 
            (id, item_id, buyer_id, seller_id, amount, status, confirmed_at, released_at, refunded_at, created_at, updated_at)
            VALUES (%s, %s, %s, %s, %s, 'holding', NULL, NULL, NULL, %s, %s)
            """,
            (holding_id, item["id"], payload.buyer_id, item["seller_id"], item_price, datetime.utcnow(), datetime.utcnow())
        )
        
        # Step 9: Write transaction to shared ledger
        txn_id = generate_uuid()
        cursor.execute(
            """
            INSERT INTO transactions
            (id, user_id, reference_type, reference_id, transaction_type, token_amount, token_balance_after, description, created_at)
            VALUES (%s, %s, 'holding_record', %s, 'purchase', %s, %s, %s, %s)
            """,
            (
                txn_id,
                payload.buyer_id,
                holding_id,
                -item_price,
                new_balance,
                f"Purchase of '{item['title']}' (locked in escrow)",
                datetime.utcnow()
            )
        )
        
        conn.commit()
        logger.info(f"Escrow purchase complete: holding_id={holding_id} buyer_id={payload.buyer_id}")
        
        # Return the created holding record
        cursor.execute("SELECT * FROM holding_records WHERE id = %s", (holding_id,))
        holding = cursor.fetchone()
        return holding
        
    except Exception as e:
        conn.rollback()
        logger.error(f"Error during purchase: {str(e)}")
        raise e
    finally:
        cursor.close()

def confirm_delivery(conn, holding_record_id: str, buyer_id: str) -> dict:
    """
    Confirm delivery, release tokens in escrow to the seller's wallet.
    Utilizes row-level locks on holding record and wallets to prevent race conditions.
    """
    conn.start_transaction()
    cursor = conn.cursor(dictionary=True)
    
    try:
        # Step 1: Fetch and lock holding record
        cursor.execute(
            "SELECT * FROM holding_records WHERE id = %s FOR UPDATE",
            (holding_record_id,)
        )
        holding = cursor.fetchone()
        if not holding:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Holding record not found."
            )
            
        if holding["buyer_id"] != buyer_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Only the buyer can confirm delivery."
            )
            
        if holding["status"] != "holding":
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"Cannot confirm delivery. Status is '{holding['status']}'."
            )
            
        # Step 2: Fetch and lock wallets for buyer and seller
        cursor.execute(
            "SELECT user_id, token_balance, reserved_tokens FROM wallets WHERE user_id = %s FOR UPDATE",
            (holding["buyer_id"],)
        )
        buyer_wallet = cursor.fetchone()
        
        cursor.execute(
            "SELECT user_id, token_balance, reserved_tokens FROM wallets WHERE user_id = %s FOR UPDATE",
            (holding["seller_id"],)
        )
        seller_wallet = cursor.fetchone()
        
        if not buyer_wallet or not seller_wallet:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Buyer or seller wallet not found."
            )
            
        amount = Decimal(str(holding["amount"]))
        
        # Step 3: Deduct from buyer's reserved pool
        new_buyer_reserved = Decimal(str(buyer_wallet["reserved_tokens"])) - amount
        cursor.execute(
            "UPDATE wallets SET reserved_tokens = %s WHERE user_id = %s",
            (new_buyer_reserved, holding["buyer_id"])
        )
        
        # Step 4: Add to seller's spendable pool
        new_seller_balance = Decimal(str(seller_wallet["token_balance"])) + amount
        cursor.execute(
            "UPDATE wallets SET token_balance = %s WHERE user_id = %s",
            (new_seller_balance, holding["seller_id"])
        )
        
        # Step 5: Mark item as sold
        cursor.execute(
            "UPDATE items SET status = 'sold' WHERE id = %s",
            (holding["item_id"],)
        )
        
        # Step 6: Mark holding record as released
        now = datetime.utcnow()
        cursor.execute(
            "UPDATE holding_records SET status = 'released', released_at = %s, updated_at = %s WHERE id = %s",
            (now, now, holding_record_id)
        )
        
        # Step 7: Write release transaction to central ledger for the seller
        txn_id = generate_uuid()
        cursor.execute(
            """
            INSERT INTO transactions
            (id, user_id, reference_type, reference_id, transaction_type, token_amount, token_balance_after, description, created_at)
            VALUES (%s, %s, 'holding_record', %s, 'release', %s, %s, %s, %s)
            """,
            (
                txn_id,
                holding["seller_id"],
                holding_record_id,
                amount,
                new_seller_balance,
                "Payment received from item sale",
                now
            )
        )
        
        conn.commit()
        logger.info(f"Escrow released: holding_id={holding_record_id} amount={amount}")
        
        return {
            "message": "Delivery confirmed. Tokens released to seller.",
            "holding_record_id": holding_record_id,
            "transaction_id": txn_id,
            "amount_released": amount
        }
        
    except Exception as e:
        conn.rollback()
        logger.error(f"Error during confirm delivery: {str(e)}")
        raise e
    finally:
        cursor.close()

# HOLDING RECORD SERVICES
def get_holding_records(conn, user_id: str) -> list:
    cursor = conn.cursor(dictionary=True)
    cursor.execute(
        """
        SELECT * FROM holding_records 
        WHERE buyer_id = %s OR seller_id = %s 
        ORDER BY created_at DESC
        """,
        (user_id, user_id)
    )
    records = cursor.fetchall()
    cursor.close()
    return records

# CHAT SERVICES
def validate_chat_participant(conn, item_id: str, sender_id: str) -> bool:
    cursor = conn.cursor()
    cursor.execute("SELECT seller_id FROM items WHERE id = %s", (item_id,))
    item = cursor.fetchone()
    cursor.close()
    if not item:
        return False
    seller_id = item[0]
    
    # Allowed if sender is the seller, OR if the sender has had any interaction (messages) in this item chat
    if seller_id == sender_id:
        return True
        
    # Or if they are a buyer who wants to chat (they can start a thread)
    return True

def save_message(conn, item_id: str, payload: schemas.MessageCreate) -> dict:
    msg_id = generate_uuid()
    now = datetime.utcnow()
    cursor = conn.cursor()
    cursor.execute(
        """
        INSERT INTO messages (id, item_id, sender_id, content, is_read, read_at, created_at)
        VALUES (%s, %s, %s, %s, FALSE, NULL, %s)
        """,
        (msg_id, item_id, payload.sender_id, payload.content, now)
    )
    conn.commit()
    cursor.close()
    
    # Return saved message
    cursor = conn.cursor(dictionary=True)
    cursor.execute("SELECT * FROM messages WHERE id = %s", (msg_id,))
    message = cursor.fetchone()
    cursor.close()
    return message

def get_chat_history(conn, item_id: str, user_id: str) -> list:
    cursor = conn.cursor(dictionary=True)
    # Get conversation history between seller and this user (or if user is seller, history is loaded for a specific buyer, handled by room)
    # Simple strategy: load all messages on this item since the chat room is bounded by the item_id.
    # To keep it private between the seller and a specific buyer, we filter messages where sender is seller or buyer.
    cursor.execute("SELECT seller_id FROM items WHERE id = %s", (item_id,))
    item = cursor.fetchone()
    if not item:
        cursor.close()
        return []
    seller_id = item["seller_id"]
    
    if user_id == seller_id:
        # If user is the seller, we need to load messages for the active conversation.
        # Note: the endpoint GET /chat/{item_id}/history expects to load messages for a specific conversation thread.
        # We fetch all messages for this item.
        cursor.execute(
            "SELECT * FROM messages WHERE item_id = %s ORDER BY created_at ASC",
            (item_id,)
        )
    else:
        # If user is a buyer, load messages where sender is user_id or recipient is user_id (sent by seller)
        cursor.execute(
            """
            SELECT * FROM messages 
            WHERE item_id = %s AND (sender_id = %s OR sender_id = %s)
            ORDER BY created_at ASC
            """,
            (item_id, user_id, seller_id)
        )
        
    messages = cursor.fetchall()
    cursor.close()
    return messages

# DASHBOARD SERVICE
def get_dashboard(conn, current_user: dict) -> dict:
    user_id = current_user["id"]
    cursor = conn.cursor(dictionary=True)
    
    # Available balance & held balance
    cursor.execute(
        "SELECT token_balance, reserved_tokens FROM wallets WHERE user_id = %s",
        (user_id,)
    )
    wallet = cursor.fetchone()
    available_balance = float(wallet["token_balance"]) if wallet else 0.0
    held_balance = float(wallet["reserved_tokens"]) if wallet else 0.0
    
    # Active listings
    cursor.execute(
        "SELECT COUNT(*) as count FROM items WHERE seller_id = %s AND status = 'available'",
        (user_id,)
    )
    active_listings = cursor.fetchone()["count"]
    
    # Saved items count
    cursor.execute(
        "SELECT COUNT(*) as count FROM saved_items WHERE user_id = %s",
        (user_id,)
    )
    saved_count = cursor.fetchone()["count"]
    
    # Unread messages
    cursor.execute(
        """
        SELECT COUNT(*) as count FROM messages m
        JOIN items i ON m.item_id = i.id
        WHERE m.sender_id != %s AND m.is_read = FALSE AND (i.seller_id = %s OR m.sender_id = %s)
        """,
        (user_id, user_id, user_id)
    )
    unread_messages = cursor.fetchone()["count"]
    
    # Completed sales
    cursor.execute(
        "SELECT COUNT(*) as count FROM holding_records WHERE seller_id = %s AND status = 'released'",
        (user_id,)
    )
    completed_sales = cursor.fetchone()["count"]
    
    # Total purchases
    cursor.execute(
        "SELECT COUNT(*) as count FROM holding_records WHERE buyer_id = %s",
        (user_id,)
    )
    total_purchases = cursor.fetchone()["count"]
    
    # Active purchase
    cursor.execute(
        """
        SELECT h.id as purchase_id, h.item_id, h.amount, h.status as payment_status, h.created_at, 
               i.title, u.full_name as seller_name, u.role as seller_role
        FROM holding_records h
        JOIN items i ON h.item_id = i.id
        JOIN users u ON h.seller_id = u.id
        WHERE h.buyer_id = %s AND h.status = 'holding'
        ORDER BY h.created_at DESC LIMIT 1
        """,
        (user_id,)
    )
    holding = cursor.fetchone()
    activePurchase = None
    if holding:
        activePurchase = {
            "purchase_id": holding["purchase_id"],
            "item_id": holding["item_id"],
            "title": holding["title"],
            "price": float(holding["amount"]),
            "payment_status": holding["payment_status"],
            "seller_name": holding["seller_name"],
            "seller_role": holding["seller_role"],
            "purchased_at": holding["created_at"].isoformat()
        }
        
    # Recent listings (exclude own)
    cursor.execute(
        """
        SELECT i.*, u.full_name as seller_name, u.is_verified
        FROM items i
        JOIN users u ON i.seller_id = u.id
        WHERE i.status = 'available' AND i.seller_id != %s
        ORDER BY i.created_at DESC LIMIT 4
        """,
        (user_id,)
    )
    recent_items = cursor.fetchall()
    
    recent_listings = []
    for item in recent_items:
        cursor.execute("SELECT COUNT(*) as count FROM saved_items WHERE item_id = %s", (item["id"],))
        saved = cursor.fetchone()["count"]
        recent_listings.append({
            "id": item["id"],
            "title": item["title"],
            "price": float(item["price"]),
            "condition": item["condition_grade"],
            "category": item["category"],
            "channel": item["listing_channel"],
            "status": item["status"],
            "image_url": item["image_url"],
            "seller_name": item["seller_name"],
            "seller_verified": bool(item["is_verified"]),
            "saved_count": saved,
            "view_count": item["view_count"]
        })
        
    cursor.close()
    
    name_parts = current_user["full_name"].strip().split()
    initials = (name_parts[0][0] + name_parts[-1][0]).upper() if len(name_parts) >= 2 else name_parts[0][0].upper()
    
    return {
        "user": {
            "id": user_id,
            "name": current_user["full_name"],
            "role": current_user["role"],
            "avatar_initials": initials
        },
        "wallet": {
            "available_balance": available_balance,
            "held_balance": held_balance
        },
        "stats": {
            "active_listings": active_listings,
            "saved_items": saved_count,
            "unread_messages": unread_messages,
            "completed_sales": completed_sales,
            "total_purchases": total_purchases
        },
        "activePurchase": activePurchase,
        "recent_listings": recent_listings
    }

# BOOKMARK SERVICES
def save_item(conn, item_id: str, current_user: dict) -> dict:
    item = get_item_by_id(conn, item_id)
    user_id = current_user["id"]
    if item["seller_id"] == user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You cannot save your own listing."
        )
        
    cursor = conn.cursor()
    cursor.execute(
        "SELECT id FROM saved_items WHERE user_id = %s AND item_id = %s",
        (user_id, item_id)
    )
    existing = cursor.fetchone()
    
    if not existing:
        saved_id = generate_uuid()
        cursor.execute(
            "INSERT INTO saved_items (id, user_id, item_id, saved_at) VALUES (%s, %s, %s, %s)",
            (saved_id, user_id, item_id, datetime.utcnow())
        )
        conn.commit()
        
    cursor.execute("SELECT COUNT(*) FROM saved_items WHERE item_id = %s", (item_id,))
    saved_count = cursor.fetchone()[0]
    cursor.close()
    
    return {"item_id": item_id, "is_saved": True, "saved_count": saved_count}

def unsave_item(conn, item_id: str, current_user: dict) -> dict:
    get_item_by_id(conn, item_id)
    user_id = current_user["id"]
    
    cursor = conn.cursor()
    cursor.execute(
        "DELETE FROM saved_items WHERE user_id = %s AND item_id = %s",
        (user_id, item_id)
    )
    conn.commit()
    
    cursor.execute("SELECT COUNT(*) FROM saved_items WHERE item_id = %s", (item_id,))
    saved_count = cursor.fetchone()[0]
    cursor.close()
    
    return {"item_id": item_id, "is_saved": False, "saved_count": saved_count}

def get_saved_items(conn, current_user: dict) -> list:
    user_id = current_user["id"]
    cursor = conn.cursor(dictionary=True)
    cursor.execute(
        """
        SELECT s.id, s.item_id, s.saved_at, i.title, i.price, i.condition_grade, i.category, i.listing_channel, i.status, i.image_url, u.full_name as seller_name
        FROM saved_items s
        JOIN items i ON s.item_id = i.id
        JOIN users u ON i.seller_id = u.id
        WHERE s.user_id = %s
        ORDER BY s.saved_at DESC
        """,
        (user_id,)
    )
    rows = cursor.fetchall()
    cursor.close()
    
    result = []
    for r in rows:
        result.append({
            "id": r["id"],
            "item_id": r["item_id"],
            "title": r["title"],
            "price": float(r["price"]),
            "condition": r["condition_grade"],
            "category": r["category"],
            "channel": r["listing_channel"],
            "status": r["status"],
            "image_url": r["image_url"],
            "seller_name": r["seller_name"],
            "saved_at": r["saved_at"].isoformat()
        })
    return result

def get_my_listings(conn, current_user: dict) -> list:
    user_id = current_user["id"]
    cursor = conn.cursor(dictionary=True)
    cursor.execute(
        "SELECT * FROM items WHERE seller_id = %s ORDER BY created_at DESC",
        (user_id,)
    )
    listings = cursor.fetchall()
    cursor.close()
    return listings

def get_my_purchases(conn, current_user: dict) -> list:
    user_id = current_user["id"]
    cursor = conn.cursor(dictionary=True)
    cursor.execute(
        """
        SELECT h.id, h.item_id, h.amount, h.status, h.created_at, h.updated_at, i.title, i.image_url, u.full_name as seller_name
        FROM holding_records h
        JOIN items i ON h.item_id = i.id
        JOIN users u ON h.seller_id = u.id
        WHERE h.buyer_id = %s
        ORDER BY h.created_at DESC
        """,
        (user_id,)
    )
    rows = cursor.fetchall()
    cursor.close()
    
    result = []
    for r in rows:
        result.append({
            "id": r["id"],
            "item_id": r["item_id"],
            "buyer_id": user_id,
            "seller_id": "", # optional
            "amount": float(r["amount"]),
            "status": r["status"],
            "title": r["title"],
            "image_url": r["image_url"],
            "seller_name": r["seller_name"],
            "created_at": r["created_at"].isoformat(),
            "updated_at": r["updated_at"].isoformat()
        })
    return result

def increment_view(conn, item_id: str):
    cursor = conn.cursor()
    cursor.execute("UPDATE items SET view_count = view_count + 1 WHERE id = %s", (item_id,))
    conn.commit()
    cursor.close()

def update_item_status(conn, item_id: str, new_status: str) -> dict:
    cursor = conn.cursor()
    cursor.execute("UPDATE items SET status = %s WHERE id = %s", (new_status, item_id))
    conn.commit()
    cursor.close()
    return {"id": item_id, "status": new_status}
