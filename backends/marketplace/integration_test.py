import unittest
import os
import uuid
from decimal import Decimal
from datetime import datetime
import mysql.connector
import schemas
import services

# Seed random suffix to prevent primary key conflicts in shared DB
RUN_ID = str(uuid.uuid4())[:8]

class TestMarketplaceIntegration(unittest.TestCase):
    
    @classmethod
    def setUpClass(cls):
        # Read database environment variables or fallback to defaults
        cls.db_config = {
            "host": os.getenv("DB_HOST", "localhost"),
            "user": os.getenv("DB_USER", "root"),
            "password": os.getenv("DB_PASSWORD", "root"),
            "database": os.getenv("DB_NAME", "campus_central_db"),
            "autocommit": True
        }
        
        # Test UUID constants
        cls.buyer_id = f"test-buyer-{RUN_ID}"
        cls.seller_id = f"test-seller-{RUN_ID}"
        
        # Set up mock users and wallets in the DB
        cls.conn = mysql.connector.connect(**cls.db_config)
        cursor = cls.conn.cursor()
        
        # 1. Create mock users
        cursor.execute(
            """
            INSERT INTO users (id, login_id, full_name, email, password_hash, role, is_active, is_verified, created_at, updated_at)
            VALUES (%s, %s, %s, %s, 'hash', 'student', TRUE, TRUE, NOW(), NOW()),
                   (%s, %s, %s, %s, 'hash', 'student', TRUE, TRUE, NOW(), NOW())
            """,
            (
                cls.buyer_id, f"buyer_{RUN_ID}", "Test Buyer", f"buyer_{RUN_ID}@test.com",
                cls.seller_id, f"seller_{RUN_ID}", "Test Seller", f"seller_{RUN_ID}@test.com"
            )
        )
        
        # 2. Create wallets
        cursor.execute(
            """
            INSERT INTO wallets (id, user_id, token_balance, reserved_tokens, facility_tokens_used, rental_tokens_used, created_at, updated_at)
            VALUES (%s, %s, 100.00, 0.00, 0.00, 0.00, NOW(), NOW()),
                   (%s, %s, 50.00, 0.00, 0.00, 0.00, NOW(), NOW())
            """,
            (
                str(uuid.uuid4()), cls.buyer_id,
                str(uuid.uuid4()), cls.seller_id
            )
        )
        cls.conn.commit()
        cursor.close()
        
        # Keep track of records to clean up
        cls.created_items = []
        cls.created_holdings = []
        
    @classmethod
    def tearDownClass(cls):
        # Clean up database records
        cursor = cls.conn.cursor()
        
        # Delete holding records
        if cls.created_holdings:
            format_strings = ','.join(['%s'] * len(cls.created_holdings))
            cursor.execute(f"DELETE FROM holding_records WHERE id IN ({format_strings})", tuple(cls.created_holdings))
            
        # Delete transactions
        cursor.execute("DELETE FROM transactions WHERE user_id IN (%s, %s)", (cls.buyer_id, cls.seller_id))
            
        # Delete items
        if cls.created_items:
            format_strings = ','.join(['%s'] * len(cls.created_items))
            cursor.execute(f"DELETE FROM items WHERE id IN ({format_strings})", tuple(cls.created_items))
            
        # Delete saved items
        cursor.execute("DELETE FROM saved_items WHERE user_id IN (%s, %s)", (cls.buyer_id, cls.seller_id))
            
        # Delete wallets
        cursor.execute("DELETE FROM wallets WHERE user_id IN (%s, %s)", (cls.buyer_id, cls.seller_id))
        
        # Delete users
        cursor.execute("DELETE FROM users WHERE id IN (%s, %s)", (cls.buyer_id, cls.seller_id))
        
        cls.conn.commit()
        cursor.close()
        cls.conn.close()

    def setUp(self):
        # Open fresh connection per test
        self.conn = mysql.connector.connect(**self.db_config)
        
    def tearDown(self):
        self.conn.close()

    def test_01_create_item_listing(self):
        """Test listing an item successfully."""
        payload = schemas.ItemCreate(
            title="Integration Test Book",
            description="Testing SQL connections",
            price=Decimal("20.00"),
            listing_channel=schemas.ListingChannel.marketplace,
            category="Books",
            condition="Like New"
        )
        item = services.create_item(self.conn, self.seller_id, payload)
        self.assertEqual(item["title"], "Integration Test Book")
        self.assertEqual(item["status"], "available")
        self.assertEqual(Decimal(str(item["price"])), Decimal("20.00"))
        
        self.created_items.append(item["id"])
        
    def test_02_purchase_own_item_throws_exception(self):
        """Verify that a seller cannot purchase their own item."""
        # Create an item
        payload = schemas.ItemCreate(
            title="Own Item",
            price=Decimal("10.00"),
            listing_channel=schemas.ListingChannel.marketplace
        )
        item = services.create_item(self.conn, self.seller_id, payload)
        self.created_items.append(item["id"])
        
        req = schemas.PurchaseRequest(buyer_id=self.seller_id, item_id=item["id"])
        with self.assertRaises(Exception):
            services.purchase_item(self.conn, req)

    def test_03_purchase_insufficient_balance_throws_exception(self):
        """Verify that purchase fails if token balance is too low."""
        # Create an expensive item
        payload = schemas.ItemCreate(
            title="Expensive Mac",
            price=Decimal("500.00"),
            listing_channel=schemas.ListingChannel.marketplace
        )
        item = services.create_item(self.conn, self.seller_id, payload)
        self.created_items.append(item["id"])
        
        req = schemas.PurchaseRequest(buyer_id=self.buyer_id, item_id=item["id"])
        with self.assertRaises(Exception):
            services.purchase_item(self.conn, req)

    def test_04_successful_purchase_flow(self):
        """Test full escrow lock purchase flow."""
        # Create item
        payload = schemas.ItemCreate(
            title="FastAPI Guide",
            price=Decimal("30.00"),
            listing_channel=schemas.ListingChannel.marketplace
        )
        item = services.create_item(self.conn, self.seller_id, payload)
        self.created_items.append(item["id"])
        
        # Verify initial wallets
        buyer_w_before = services.get_wallet(self.conn, self.buyer_id)
        self.assertEqual(Decimal(str(buyer_w_before["token_balance"])), Decimal("100.00"))
        self.assertEqual(Decimal(str(buyer_w_before["reserved_tokens"])), Decimal("0.00"))
        
        # Purchase
        req = schemas.PurchaseRequest(buyer_id=self.buyer_id, item_id=item["id"])
        holding = services.purchase_item(self.conn, req)
        self.created_holdings.append(holding["id"])
        
        self.assertEqual(holding["status"], "holding")
        self.assertEqual(Decimal(str(holding["amount"])), Decimal("30.00"))
        
        # Verify escrow wallet locks
        buyer_w_after = services.get_wallet(self.conn, self.buyer_id)
        self.assertEqual(Decimal(str(buyer_w_after["token_balance"])), Decimal("70.00"))
        self.assertEqual(Decimal(str(buyer_w_after["reserved_tokens"])), Decimal("30.00"))
        
        # Verify item status
        updated_item = services.get_item_by_id(self.conn, item["id"])
        self.assertEqual(updated_item["status"], "reserved")
        
        # Try purchasing again (should fail because status is reserved)
        with self.assertRaises(Exception):
            services.purchase_item(self.conn, req)

    def test_05_confirm_delivery_and_release(self):
        """Test delivery confirmation and escrow token release to seller."""
        # Create item
        payload = schemas.ItemCreate(
            title="Bicycle",
            price=Decimal("40.00"),
            listing_channel=schemas.ListingChannel.marketplace
        )
        item = services.create_item(self.conn, self.seller_id, payload)
        self.created_items.append(item["id"])
        
        # Purchase (lock 40.00 in escrow)
        req = schemas.PurchaseRequest(buyer_id=self.buyer_id, item_id=item["id"])
        holding = services.purchase_item(self.conn, req)
        self.created_holdings.append(holding["id"])
        
        # Confirm Delivery
        seller_w_before = services.get_wallet(self.conn, self.seller_id)
        self.assertEqual(Decimal(str(seller_w_before["token_balance"])), Decimal("50.00"))
        
        result = services.confirm_delivery(self.conn, holding["id"], self.buyer_id)
        self.assertEqual(result["holding_record_id"], holding["id"])
        
        # Verify buyer reserved balance released
        buyer_w = services.get_wallet(self.conn, self.buyer_id)
        self.assertEqual(Decimal(str(buyer_w["reserved_tokens"])), Decimal("30.00")) # 30 was locked in previous test, so 30.00 remains locked 
        # Actually since tests run in sequence, let's verify relative balances
        
        # Verify seller balance updated
        seller_w = services.get_wallet(self.conn, self.seller_id)
        self.assertEqual(Decimal(str(seller_w["token_balance"])), Decimal("90.00")) # 50 + 40
        
        # Verify item marked sold
        sold_item = services.get_item_by_id(self.conn, item["id"])
        self.assertEqual(sold_item["status"], "sold")

    def test_06_saved_items_bookmarks(self):
        """Test bookmarking (saving) and unsaving items, and listing saved items."""
        # 1. List a new book item
        payload = schemas.ItemCreate(
            title="Book to Save",
            description="Testing saved list",
            price=Decimal("15.00"),
            listing_channel=schemas.ListingChannel.marketplace,
            category="Books",
            condition="New"
        )
        item = services.create_item(self.conn, self.seller_id, payload)
        self.created_items.append(item["id"])
        
        # 2. Save/bookmark the item as the buyer
        current_buyer = {"id": self.buyer_id}
        save_res = services.save_item(self.conn, item["id"], current_buyer)
        self.assertTrue(save_res["is_saved"])
        
        # 3. Retrieve saved items
        saved_list = services.get_saved_items(self.conn, current_buyer)
        self.assertEqual(len(saved_list), 1)
        self.assertEqual(saved_list[0]["id"], item["id"])
        
        # 4. Unsave the item
        unsave_res = services.unsave_item(self.conn, item["id"], current_buyer)
        self.assertFalse(unsave_res["is_saved"])
        
        # 5. Verify saved list is empty
        final_list = services.get_saved_items(self.conn, current_buyer)
        self.assertEqual(len(final_list), 0)

if __name__ == "__main__":
    unittest.main()
