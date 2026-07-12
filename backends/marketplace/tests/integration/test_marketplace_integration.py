import pytest
import os
import sys
from decimal import Decimal

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from main import app
from main import app

class TestMarketplaceIntegration:
    """Integration tests for Marketplace endpoints using FastAPI TestClient."""

    def test_health_check(self, client):
        resp = client.get("/")
        assert resp.status_code == 200
        assert resp.json()["status"] == "ok"

    def test_create_item(self, client, test_seller, auth_headers_seller):
        payload = {
            "title": "FastAPI Book",
            "description": "Learn FastAPI",
            "price": "25.00",
            "category": "Books"
        }
        resp = client.post(f"/marketplace/items/?seller_id={test_seller['id']}", json=payload, headers=auth_headers_seller)
        assert resp.status_code == 201
        data = resp.json()
        assert data["title"] == "FastAPI Book"
        assert data["seller_id"] == test_seller["id"]
        assert data["status"] == "available"

    def test_create_item_auth_mismatch(self, client, test_seller, test_buyer, auth_headers_buyer):
        payload = {
            "title": "Hack Item",
            "price": "10.00"
        }
        # We specify seller_id = test_seller, but we are authenticated as test_buyer
        resp = client.post(f"/marketplace/items/?seller_id={test_seller['id']}", json=payload, headers=auth_headers_buyer)
        assert resp.status_code == 403

    def test_purchase_item_flow(self, client, test_seller, test_buyer, auth_headers_seller, auth_headers_buyer):
        # 1. Create an item as seller
        item_resp = client.post(f"/marketplace/items/?seller_id={test_seller['id']}", json={
            "title": "Bike",
            "price": "30.00"
        }, headers=auth_headers_seller)
        assert item_resp.status_code == 201
        item_id = item_resp.json()["id"]
        
        # 2. Purchase item as buyer
        purchase_payload = {
            "buyer_id": test_buyer["id"],
            "item_id": item_id
        }
        purchase_resp = client.post("/marketplace/transactions/purchase", json=purchase_payload, headers=auth_headers_buyer)
        assert purchase_resp.status_code == 201
        holding = purchase_resp.json()
        assert holding["status"] == "holding"
        assert holding["item_id"] == item_id
        holding_id = holding["holding_record_id"]

        # 3. Try to purchase again (should fail)
        purchase_resp2 = client.post("/marketplace/transactions/purchase", json=purchase_payload, headers=auth_headers_buyer)
        assert purchase_resp2.status_code == 409

        # 4. Confirm delivery as buyer
        confirm_resp = client.post(f"/marketplace/delivery/confirm/{holding_id}", headers=auth_headers_buyer)
        assert confirm_resp.status_code == 200
        assert float(confirm_resp.json()["amount_released"]) == 30.00

    def test_get_items(self, client, test_seller, auth_headers_seller):
        client.post(f"/marketplace/items/?seller_id={test_seller['id']}", json={
            "title": "Listing 1",
            "price": "5.00"
        }, headers=auth_headers_seller)

        resp = client.get("/marketplace/items/", headers=auth_headers_seller)
        assert resp.status_code == 200
        data = resp.json()["data"]
        assert len(data) >= 1
        assert data[0]["title"] == "Listing 1"

    def test_purchase_own_item_fails(self, client, test_seller, auth_headers_seller):
        item_resp = client.post(f"/marketplace/items/?seller_id={test_seller['id']}", json={
            "title": "My Own Book",
            "price": "10.00"
        }, headers=auth_headers_seller)
        item_id = item_resp.json()["id"]

        # Attempt to buy own item
        purchase_resp = client.post("/marketplace/transactions/purchase", json={
            "buyer_id": test_seller["id"],
            "item_id": item_id
        }, headers=auth_headers_seller)
        assert purchase_resp.status_code == 400

    def test_purchase_insufficient_balance(self, client, test_seller, test_buyer, auth_headers_seller, auth_headers_buyer):
        # item cost is 150.00, test_buyer only has 100.00
        item_resp = client.post(f"/marketplace/items/?seller_id={test_seller['id']}", json={
            "title": "Expensive Laptop",
            "price": "150.00"
        }, headers=auth_headers_seller)
        item_id = item_resp.json()["id"]

        purchase_resp = client.post("/marketplace/transactions/purchase", json={
            "buyer_id": test_buyer["id"],
            "item_id": item_id
        }, headers=auth_headers_buyer)
        assert purchase_resp.status_code == 402
