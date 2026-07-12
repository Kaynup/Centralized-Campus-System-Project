# Token Economics & Cross-Module Synchronization

## 1. The Global 10:1 Rupee-to-Token Standard

The most significant structural change in v0.9.0 is the standardization of the platform's currency mechanics. The backend now universally treats "Tokens" as the foundational unit of value. However, users fund their accounts using real-world fiat (Rupees). The mathematical baseline is strictly set to **10 Rupees = 1 Token**.

### 1.1 Backend Implementation (`routers/wallet.py`)
The Centralized Core manages all token minting. The `/wallet/topup` REST endpoint was refactored to explicitly accept `amount` payloads representing Rupees, which are subsequently divided by 10 before updating the database.

**Code Change Detail:**
```python
# backends/centralized_core/routers/wallet.py
@router.post("/topup", response_model=schemas.WalletResponse)
def topup_wallet(payload: schemas.TopupRequest, current_user = Depends(get_current_user)):
    # The payload.amount represents incoming fiat (Rupees)
    # The system mints tokens at a 10:1 ratio.
    tokens_to_add = payload.amount / 10.0
    
    # Wallet balances are incremented strictly in Tokens
    wallet.token_balance += tokens_to_add
    db.commit()
```

### 1.2 Integration Test Suite Alignment
Because the backend logic fundamentally changed, the Continuous Integration (CI) tests failed due to assertion mismatches. The `integration_test.py` file was updated to mathematically validate the new token output.

**Code Change Detail (`backends/centralized_core/integration_test.py`):**
```python
def test_06_topup_wallet(self):
    payload = {"amount": 50.00} # User sends 50 Rupees
    response = self.client.post("/wallet/topup", json=payload, headers=headers)
    data = response.json()
    
    # PREVIOUS: self.assertEqual(float(data["token_amount"]), 50.0) -> FAILED
    # UPDATED: 50 Rupees / 10 = 5.0 Tokens
    self.assertEqual(float(data["token_amount"]), 5.0)
    
    # Original balance was 100.0, adding 5.0 tokens = 105.0
    self.assertEqual(float(data["token_balance_after"]), 105.0)
```

---

## 2. Frontend Wallet UX Improvements

To ensure users understand the conversion, the `TopUpModal` was heavily modified to act as a transparent fiat-to-crypto style exchange interface.

**Code Change Detail (`TopUpModal.jsx`):**
```jsx
// 1. Label explicitly requests Rupees
<label>Amount (Rupees / ₹)</label>
<input 
  value={amount} 
  onChange={(e) => setAmount(e.target.value)} 
/>

// 2. Live mathematical preview of Token yield
{amount > 0 && (
  <div className="conversion-preview">
    <p>You will receive: <strong>{Math.floor(amount / 10)} tokens</strong></p>
  </div>
)}
```

---

## 3. Module-Specific Display Logic

The platform features distinct operational modules that require different UX approaches regarding currency display.

### 3.1 The Equipment Module: Native Tokens
The Equipment module is intended to operate smoothly on internal tokens. All UI components were audited to strip hardcoded `₹` prefixes. Values like Security Deposits and Late Fees are now displayed dynamically as `{value} tokens`.

### 3.2 The Marketplace Module: Abstracted Fiat (Rupees)
Marketplace transactions feel more natural when dealing in fiat currency. Therefore, the UI employs a "Presentation Abstraction Layer". The backend exclusively uses Tokens, but the React components dynamically multiply values by 10 before rendering them to the screen.

**A. Abstracting Displays (`ItemDetail.jsx`, `ItemCard.jsx`, `Dashboard.jsx`)**
Every instance of price rendering was intercepted and multiplied by 10.
```jsx
// PREVIOUS (Incorrectly rendering raw tokens with a Rupee symbol)
<p className="item-price">₹{Number(item.price).toLocaleString()}</p>

// UPDATED (Multiplying the backend token integer by 10 to recreate the Rupee value)
<p className="item-price">₹{(Number(item.price) * 10).toLocaleString()}</p>
```

**B. Handling User Input (`ListItem.jsx`)**
Conversely, when a user lists an item for sale, they input a Rupee value. The component must execute `value / 10` before submitting the payload, otherwise the seller will overcharge the buyer by an order of magnitude.
```jsx
const handlePublish = async () => {
  const listingData = await createItem({
    title: form.title.trim(),
    // User inputted 500 Rupees. We submit Math.floor(500 / 10) -> 50 Tokens
    price: Math.floor(parseInt(form.price, 10) / 10), 
    category: form.category,
  });
};
```

---

## 4. Hard Cap Re-Evaluations
Due to the new token valuations, the system-wide limits for reservations and rentals were reduced to align with reality:
- **Facility Token Limit**: Reduced to 10 tokens (Previously 500).
- **Equipment Token Limit**: Reduced to 50 tokens (Previously 1000).
