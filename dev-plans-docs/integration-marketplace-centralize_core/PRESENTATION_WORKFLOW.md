# Integrated System Presentation Workflow

This document details the step-by-step presentation workflow to demonstrate the integration of the Centralized Core (Port 8000), Secure Marketplace (Port 8003), and the React Frontend.

---

## 1. Prerequisites and Startup

Execute the following commands in separate terminal panes to launch the services:

### Start Database and Seed Users
```bash
cd backends/centralized_core
python init_db.py
```
*(Sets up core tables and seeds Student A and Student B with 500.00 tokens each)*

### Start Centralized Core Backend (Port 8000)
```bash
cd backends/centralized_core
uvicorn main:app --host 127.0.0.1 --port 8000 --reload
```

### Start Secure Marketplace Backend (Port 8003)
```bash
cd backends/marketplace
uvicorn main:app --host 127.0.0.1 --port 8003 --reload
```

### Start Frontend Application (Port 5173)
```bash
cd frontend
npm run dev
```

---

## 2. Step-by-Step Demonstration Workflow

### Step 1: Authentication and Profile Load (Core Service)
1. Navigate to the frontend page at `http://localhost:5173`.
2. Log in using the seeded buyer credentials:
   *   **Username:** `student1`
   *   **Password:** `password123`
3. Show the **Dashboard** and **Wallet** sections:
   *   The system loads the profile from `GET /users/me`.
   *   The wallet displays the real balance of **`₹500.00`** (pulled directly from the database wallet table, replacing previous mock state).

### Step 2: List a Product (Marketplace Service)
1. Open an incognito browser window and log in as the seller:
   *   **Username:** `student2`
   *   **Password:** `password123`
2. Navigate to the **Sell Item** section and list a textbook:
   *   **Title:** `Engineering Physics Volume I`
   *   **Price:** `₹50.00`
3. Click submit to write the listing into the `items` table via `POST /marketplace/items/`.

### Step 3: Bookmark and Purchase (Integrated Flow)
1. Return to the buyer's window (`student1`).
2. Navigate to the **Marketplace** and search for the textbook.
3. Click the bookmark icon to save the item. Refresh the page and show the **Saved Items** tab:
   *   The system queries `GET /marketplace/items/saved` and displays the bookmarked listing.
4. Click **Buy Now** to purchase the item:
   *   This triggers `POST /marketplace/transactions/purchase` on Port 8003.
   *   Funds are locked in the escrow `holding_records` table.
5. Inspect the buyer's **Wallet** page:
   *   The buyer's active balance is updated to **`₹450.00`**.
   *   The reserved balance is updated to **`₹50.00`** (escrow tokens locked).
   *   The item's listing status changes to `reserved` (preventing double-spend attempts).

### Step 4: Confirm Delivery and Release Funds
1. In the buyer's browser, navigate to the **Purchases** tab and click **Confirm Receipt**:
   *   This triggers `POST /marketplace/delivery/confirm/{id}` on Port 8003.
   *   The escrow holding is marked `released`.
2. Review the wallet balances for both users:
   *   The buyer's reserved balance drops to **`₹0.00`**.
   *   The seller's (`student2`) wallet balance increases to **`₹550.00`**.
   *   The item status changes to `sold` in the database.

### Step 5: Notifications and Ledger Verification
1. Navigate to the **Notifications** center in the top navigation bar:
   *   Verify that real-time notifications show updates for the listing registration, the locked purchase, and the token release.
2. In the buyer's **Wallet** page, scroll down to the **Transaction History** table:
   *   Show the transaction logs mapped from the backend ledger, detailing the top-ups, purchases, and releases.
