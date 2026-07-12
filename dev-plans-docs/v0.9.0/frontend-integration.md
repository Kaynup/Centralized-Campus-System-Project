# Frontend Integration & React State Management

## 1. Establishing the Source of Truth

The most glaring bug discovered during integration testing was a visual discrepancy across the application header and the internal facility reservation logic. The top-level `Navbar` displayed a healthy balance of `₹500.00`, but navigating into the Facility Reservation module presented the user with `0 Tokens` available, preventing them from interacting with the system.

### 1.1 Context Decoupling & Stale Data
The root cause was determined to be a fragmented source of truth. 
The authentication flow (`useAuth()`) provides a static `user` object upon login containing a snapshot of their data (e.g., `user.token_balance`). The `ReservationDrawer` component was pulling its values from this static object. Since JWT payloads do not dynamically update when a user adds funds, the drawer's state was perpetually stuck at whatever balance the user had at the moment they clicked 'Login'.

**The Fix:**
The `ReservationDrawer` and associated contexts were refactored to decouple from `useAuth()` and specifically hook into the global `useWallet()` provider. The `useWallet()` context establishes an active subscription to the Centralized Core's wallet endpoints, instantly syncing data.

### 1.2 Fixing React `useMemo` Caching Cycles
Even after migrating to the global wallet context, components like `ProfilePage.jsx` and `FacilityCalendarPage.jsx` failed to render the incoming data.

**The Diagnostic:**
The components were augmenting the user profile object using a `useMemo` hook to avoid unnecessary recalculations. However, the dependency arrays lacked the essential references required to trigger re-renders when async wallet data finally arrived over the network.

**Code Change Detail (`ProfilePage.jsx` & `FacilityCalendarPage.jsx`):**
```jsx
// PREVIOUS IMPLEMENTATION (Bugged)
// The balance arrives asynchronously 50ms after the component mounts.
// Because 'balance' is missing from the dependency array, React never re-executes this block.
const user = useMemo(() => {
  return authUser ? { ...authUser, tokenBalance: balance } : null;
}, [authUser]); // <-- Missing 'balance' dependency

// UPDATED IMPLEMENTATION (Fixed)
const user = useMemo(() => {
  return authUser ? { ...authUser, tokenBalance: balance } : null;
}, [authUser, balance]); // <-- Explicitly added 'balance'
```
By appending `balance` to the dependency array, React forces a synchronous re-render the exact millisecond the Wallet Context successfully fetches the token amount from the Centralized Core API.

---

## 2. Hardcoded UI Standardization

Several frontend components contained hardcoded assumptions about the currency schema that conflicted with the backend's token economy.

### 2.1 TopBar Refactoring
The primary navigation element (`TopBar.jsx` / `Navbar`) explicitly forced a Rupee symbol onto the balance display:
```jsx
// PREVIOUS
<span className="balance-display">₹{balance.toFixed(2)}</span>
```
This was visually misleading, as the balance integer represented internal tokens, not fiat value. To standardize the UI according to the system rules established in `token-economics.md`, this was surgically replaced across the UI components:

```jsx
// UPDATED
<span className="balance-display">{balance.toFixed(2)} tokens</span>
```
This ensures the user natively understands their internal purchasing power, distinct from real-world currency conversions.
