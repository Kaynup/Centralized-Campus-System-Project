import pytest
import sys
import os
from decimal import Decimal
from pydantic import ValidationError

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from schemas import ItemCreate, PurchaseRequest, MessageCreate

class TestMarketplaceSchemas:
    def test_item_create_valid(self):
        item = ItemCreate(
            title="A good book",
            description="Nice",
            price=Decimal("10.50"),
            category="Books",
            condition="New"
        )
        assert item.title == "A good book"
        assert item.price == Decimal("10.50")
        assert item.category == "Books"

    def test_item_create_invalid_price(self):
        with pytest.raises(ValidationError):
            ItemCreate(
                title="A good book",
                description="Nice",
                price=Decimal("-1.00")
            )

    def test_item_create_invalid_title(self):
        with pytest.raises(ValidationError):
            ItemCreate(
                title="A", # too short
                price=Decimal("10.00")
            )

    def test_purchase_request_valid(self):
        req = PurchaseRequest(
            buyer_id="buyer123",
            item_id="item123"
        )
        assert req.buyer_id == "buyer123"
        assert req.item_id == "item123"

    def test_message_create_valid(self):
        msg = MessageCreate(
            sender_id="user1",
            content="Hello!"
        )
        assert msg.content == "Hello!"

    def test_message_create_invalid_content(self):
        with pytest.raises(ValidationError):
            MessageCreate(
                sender_id="user1",
                content="" # too short
            )
