# Token System Architecture: Facility Reservations

This document details the architecture, data flows, and transaction lifecycle of the token-based reservation system used to book campus facilities. 

> [!NOTE]
> This system is a **virtual currency ledger** used to allocate facility hours, manage demand, and enforce cancellation policies. It is entirely separate from authentication tokens (e.g., JWT).

---

## 1. Core Data Models & Token Fields

The token architecture is supported by four primary database models in [models.py](file:///home/remitpe/MAIN/InternshipProject_2/backend/app/db/models.py). The integrity of the system is maintained by ensuring that any change to a user's token balance is mirrored by an immutable record in the transaction ledger.

```mermaid
%%{init: {
  'theme': 'base',
  'themeVariables': {
    'primaryColor': '#E1F5FE',
    'primaryTextColor': '#01579B',
    'primaryBorderColor': '#039BE5',
    'lineColor': '#0288D1',
    'secondaryColor': '#E8F5E9',
    'tertiaryColor': '#FFFDE7'
  }
}}%%
classDiagram
    direction LR
    class User {
        +int id
        +string full_name
        +string email
        +UserRole role
        +float token_balance
        +datetime created_at
    }

    class Facility {
        +int id
        +string name
        +FacilityGroup facility_group
        +int capacity
        +int requires_approval
        +float token_cost_per_hour
    }

    class Booking {
        +int id
        +int user_id
        +int facility_id
        +Date booking_date
        +int start_slot_id
        +int end_slot_id
        +BookingStatus status
        +float deposit_paid
    }

    class Transaction {
        +int id
        +int user_id
        +int booking_id
        +TransactionType type
        +float amount
        +float balance_after
        +string description
        +datetime transaction_at
    }

    User "1" --> "0..*" Booking : makes
    User "1" --> "0..*" Transaction : owns
    Facility "1" --> "0..*" Booking : is booked for
    Booking "1" --> "0..*" Transaction : generates
```

### Key Components

1. **User Balance (`User.token_balance`)**: Tracks the current spendable virtual tokens. Initial grants are based on the user's role:
   - **Student**: 5 tokens
   - **Professor**: 20 tokens
   - **Admin**: 999 tokens
2. **Facility Cost Rate (`Facility.token_cost_per_hour`)**: Defines the hourly rate of the space. Every 10-minute slot consumed is valued at $\frac{1}{6}$ of this rate.
3. **Booking Deposit (`Booking.deposit_paid`)**: The total tokens held in escrow at the time the booking is requested.
4. **Ledger Record (`Transaction`)**: An immutable record tracking every token movement. 
   - **Types**: `GRANT`, `DEPOSIT`, `REFUND`, `PENALTY`, `DEDUCTION`.
   - Contains a snapshot of the user's balance (`balance_after`) immediately following the transaction.

---

## 2. Ledger Consistency Pattern (Atomic Transactions)

To guarantee that the user's current token balance always matches the ledger history, all token modifications are wrapped in database transactions using SQLAlchemy's atomic updates. 

```mermaid
sequenceDiagram
    autonumber
    participant Client as API Client / Caller
    participant Service as Booking / User Service
    participant DB as PostgreSQL DB
    participant Ledger as Transaction Ledger

    Client->>Service: Trigger Token-modifying Action
    activate Service
    Note over Service: E.g., Book, Cancel, Approve, or Grant
    Service->>DB: Begin Database Transaction / Nested Block
    
    Service->>DB: Fetch & lock User record (FOR UPDATE)
    DB-->>Service: User Details & current token_balance
    
    Service->>DB: Update User.token_balance (delta)
    Note over Service: Atomic balance increment or decrement
    
    Service->>Ledger: Insert Transaction Row (type, amount, balance_after)
    Note over Ledger: Immutable log mapping exact delta & resulting snapshot
    
    Service->>DB: Create/Update Booking or Approval record
    
    Service->>DB: Commit Transaction / Nested Block
    DB-->>Service: Success
    Service-->>Client: Action Confirmed with updated balance
    deactivate Service
```

---

## 3. Booking Creation & Token Deduction Flow

When a user attempts to book a facility, the system performs a sequence of verification steps before deducting tokens. 

The deposit calculation is:
$$\text{Deposit} = \text{Facility Cost Per Hour} \times \left( \text{Number of Slots} \times \frac{10}{60} \right)$$

This value is rounded to **2 decimal places** to prevent floating-point discrepancies.

```mermaid
flowchart TD
    Start([User requests Booking]) --> GetUser[Retrieve User and Facility details]
    GetUser --> ValidRole{Is role authorized to book?}
    
    ValidRole -- No --> ErrAuth[Raise UnauthorizedFacilityAccessError]
    ValidRole -- Yes --> CheckQuota{Does user exceed active quota?}
    
    CheckQuota -- Yes --> ErrQuota[Raise QuotaExceededError]
    
    CheckQuota -- No --> CheckOverlap{Are requested slots already reserved?}
    CheckOverlap -- Yes --> ErrSlot[Raise SlotUnavailableError]
    
    CheckOverlap -- No --> CalcCost[Calculate Booking Duration & Deposit Cost]
    
    CalcCost --> CheckTokens{User token_balance >= Deposit?}
    CheckTokens -- No --> ErrTokens[Raise InsufficientTokensError]
    
    CheckTokens -- Yes --> DeductTokens[Deduct Deposit from User token_balance]
    DeductTokens --> CreateTx[Create Transaction row <br>Type: DEPOSIT, Amount: -Deposit, booking_id: Null]
    
    CreateTx --> CheckApproval{Does booking need Admin/Professor approval?}

    CheckApproval -- Yes --> StatusPending[Set Booking Status: PENDING <br>Create Approval Request record]
    CheckApproval -- No --> StatusReserved[Set Booking Status: RESERVED <br>Run Overlap Resolution for other PENDING requests]
    
    StatusPending --> FlushDB[Flush & link Transaction.booking_id = Booking.id]
    StatusReserved --> FlushDB
    
    FlushDB --> NotifyUser[Send Email & In-App Notifications]
    NotifyUser --> Commit[Commit Transaction] --> End([Booking Process Complete])

    %% Node Color Styling
    classDef startEnd fill:#ECEFF1,stroke:#607D8B,stroke-width:2px,color:#263238;
    classDef process fill:#E3F2FD,stroke:#2196F3,stroke-width:2px,color:#0D47A1;
    classDef decision fill:#FFF8E1,stroke:#FFB300,stroke-width:2px,color:#B75400;
    classDef success fill:#E8F5E9,stroke:#4CAF50,stroke-width:2px,color:#1B5E20;
    classDef error fill:#FFEBEE,stroke:#F44336,stroke-width:2px,color:#B71C1C;
    classDef action fill:#F3E5F5,stroke:#9C27B0,stroke-width:2px,color:#4A148C;

    class Start,End startEnd;
    class GetUser,CalcCost,StatusPending,FlushDB,NotifyUser process;
    class ValidRole,CheckQuota,CheckOverlap,CheckTokens,CheckApproval decision;
    class DeductTokens,CreateTx action;
    class StatusReserved,Commit success;
    class ErrAuth,ErrQuota,ErrSlot,ErrTokens error;
```

---

## 4. Approval, Rejection & Overlap Conflict Workflow

For bookings that enter the `PENDING` state, an administrator or professor must action the approval request. If a slot is booked by an automatically confirmed reservation before the pending request is processed, the system triggers an automatic refund conflict sequence.

```mermaid
flowchart TD
    Start([Admin actions Approval Request]) --> GetApproval[Retrieve Approval & Booking details]
    GetApproval --> IsPending{Approval Status == PENDING?}
    
    IsPending -- No --> ErrActioned[Raise ValueError: Already Actioned]
    IsPending -- Yes --> Decided{Action: Approve or Reject?}
    
    Decided -- Reject --> RejectFlow[Set Approval & Booking Status: REJECTED]
    RejectFlow --> HasDeposit{Booking.deposit_paid > 0?}
    
    HasDeposit -- Yes --> RefundFull[Refund Booking.deposit_paid to User token_balance]
    RefundFull --> CreateRefundTx[Create Transaction row <br>Type: REFUND, Amount: +Deposit]
    RefundFull --> NotifyRejected[Send rejection notification]
    
    HasDeposit -- No --> NotifyRejected
    
    Decided -- Approve --> CheckOverlap{Has slot been taken by another booking?}
    
    CheckOverlap -- Yes --> OverlapConflict[Set Approval & Booking Status: REJECTED <br>Reason: Conflict]
    OverlapConflict --> RefundFull
    
    CheckOverlap -- No --> ApproveFlow[Set Approval: APPROVED <br>Set Booking: RESERVED]
    ApproveFlow --> ResolveOverlaps[Run Overlap Resolution on remaining PENDING requests]
    ResolveOverlaps --> NotifyApproved[Send approval notification]

    NotifyRejected --> Commit[Commit Transaction]
    NotifyApproved --> Commit
    Commit --> End([Approval Flow Complete])

    %% Node Color Styling
    classDef startEnd fill:#ECEFF1,stroke:#607D8B,stroke-width:2px,color:#263238;
    classDef process fill:#E3F2FD,stroke:#2196F3,stroke-width:2px,color:#0D47A1;
    classDef decision fill:#FFF8E1,stroke:#FFB300,stroke-width:2px,color:#B75400;
    classDef success fill:#E8F5E9,stroke:#4CAF50,stroke-width:2px,color:#1B5E20;
    classDef error fill:#FFEBEE,stroke:#F44336,stroke-width:2px,color:#B71C1C;
    classDef action fill:#F3E5F5,stroke:#9C27B0,stroke-width:2px,color:#4A148C;

    class Start,End startEnd;
    class GetApproval,ResolveOverlaps,NotifyApproved,NotifyRejected process;
    class IsPending,Decided,HasDeposit,CheckOverlap decision;
    class RejectFlow,CreateRefundTx,OverlapConflict action;
    class ApproveFlow,RefundFull,Commit success;
    class ErrActioned error;
```

---

## 5. Geometric Overlap Resolution & Partial Refunds

When a booking transitions to the `RESERVED` status, it resolves conflicts with any overlapping `PENDING` bookings for the same facility and date. The pending bookings are either completely rejected or dynamically truncated.

Let $R$ represent the newly reserved booking interval, and $P$ represent the pending booking interval.

```mermaid
flowchart TD
    Start([Booking RESERVED]) --> ScanPending[Find all overlapping PENDING bookings P on same Facility & Date]
    ScanPending --> ForEach{For each overlapping P}
    
    ForEach -- No more --> End([Overlap Resolution Complete])
    ForEach -- Next P --> DetermineOverlap{Determine overlap geometry}
    
    %% Case 1: Split
    DetermineOverlap -- "R inside P (Split)" --> RejectFullSplit[Reject booking P fully <br>Reason: Slot split by reservation]
    RejectFullSplit --> RefundPFull[Refund P.deposit_paid to user balance <br>Create REFUND transaction]
    RefundPFull --> NotifyPRejected[Send BOOKING_REJECTED Notification]
    
    %% Case 2: Swallow
    DetermineOverlap -- "P inside R (Swallowed)" --> RejectFullSwallow[Reject booking P fully <br>Reason: Slot claimed by reservation]
    RejectFullSwallow --> RefundPFull
    
    %% Case 3: End overlap
    DetermineOverlap -- "R overlaps End of P" --> ReducePEnd[Reduce P End: <br>P.end_slot_id = R.start_slot_id - 1]
    ReducePEnd --> CalcPartialRefund[Calculate partial refund for slots deducted: <br>refund = slots_lost * hourly_cost / 6]
    CalcPartialRefund --> DeductDepositP[Update P.deposit_paid = P.deposit_paid - refund]
    DeductDepositP --> RefundUserP[Refund 'refund' amount to user balance <br>Create REFUND transaction]
    RefundUserP --> NotifyPReduced[Send BOOKING_REDUCED Notification]
    
    %% Case 4: Start overlap
    DetermineOverlap -- "R overlaps Start of P" --> ReducePStart[Reduce P Start: <br>P.start_slot_id = R.end_slot_id + 1]
    ReducePStart --> CalcPartialRefund
    
    NotifyPRejected --> ForEach
    NotifyPReduced --> ForEach

    %% Node Color Styling
    classDef startEnd fill:#ECEFF1,stroke:#607D8B,stroke-width:2px,color:#263238;
    classDef process fill:#E3F2FD,stroke:#2196F3,stroke-width:2px,color:#0D47A1;
    classDef decision fill:#FFF8E1,stroke:#FFB300,stroke-width:2px,color:#B75400;
    classDef success fill:#E8F5E9,stroke:#4CAF50,stroke-width:2px,color:#1B5E20;
    classDef error fill:#FFEBEE,stroke:#F44336,stroke-width:2px,color:#B71C1C;
    classDef action fill:#F3E5F5,stroke:#9C27B0,stroke-width:2px,color:#4A148C;

    class Start,End startEnd;
    class ScanPending,CalcPartialRefund,NotifyPRejected,NotifyPReduced process;
    class ForEach,DetermineOverlap decision;
    class ReducePEnd,ReducePStart,DeductDepositP action;
    class RefundPFull,RefundUserP success;
    class RejectFullSplit,RejectFullSwallow error;
```

---

## 6. Booking Cancellation: Refunds & Penalties

Cancellations handle token refunds and penalties based on the time remaining before the booking starts.

### Refund & Penalty Percentages
- **Cancellation requested > 24 hours prior**: 100% refund, 0% penalty.
- **Cancellation requested between 12 and 24 hours prior**: 50% refund, 50% penalty.
- **Cancellation requested < 12 hours prior**: 0% refund, 100% penalty.

```mermaid
flowchart TD
    Start([Cancellation requested]) --> AdminOrUser{Requested by Admin or Booking User?}
    
    %% Admin Force Cancel
    AdminOrUser -- Admin --> AdminCancel[Set Booking Status: CANCELLED]
    AdminCancel --> RefundAdmin[Refund 100% of Booking.deposit_paid to User token_balance]
    RefundAdmin --> AdminRefundTx[Create Transaction row <br>Type: REFUND, Amount: +Deposit]
    AdminRefundTx --> NotifyAdminCancel[Send Admin Cancel Notification]
    
    %% User Cancel
    AdminOrUser -- User --> ValidateState{Booking status PENDING or RESERVED?}
    ValidateState -- No --> ErrState[Raise CancellationNotAllowedError]
    ValidateState -- Yes --> CheckTime{Has booking already started?}
    
    CheckTime -- Yes --> ErrStarted[Raise CancellationNotAllowedError]
    CheckTime -- No --> CalcHours[Calculate hours until booking start]
    
    CalcHours --> TimeTier{Hours until start?}
    
    TimeTier -- "> 24 Hours" --> Tier100[Refund: 100% <br>Penalty: 0%]
    TimeTier -- "12 to 24 Hours" --> Tier50[Refund: 50% <br>Penalty: 50%]
    TimeTier -- "< 12 Hours" --> Tier0[Refund: 0% <br>Penalty: 100%]
    
    Tier100 --> CalcAmounts[Calculate refund and penalty token values]
    Tier50 --> CalcAmounts
    Tier0 --> CalcAmounts
    
    CalcAmounts --> SetCancelled[Set Booking Status: CANCELLED]
    SetCancelled --> IsRefund{Refund Amount > 0?}
    
    IsRefund -- Yes --> RefundUser[Refund refund_amount to User token_balance]
    RefundUser --> RefundTx[Create Transaction row <br>Type: REFUND, Amount: +RefundAmount]
    RefundUser --> IsPenalty{Penalty Amount > 0?}
    
    IsRefund -- No --> IsPenalty
    
    IsPenalty -- Yes --> PenaltyTx[Create Transaction row <br>Type: PENALTY, Amount: -PenaltyAmount]
    IsPenalty -- No --> NotifyCancel
    
    PenaltyTx --> NotifyCancel[Send User Cancellation Notification]
    NotifyAdminCancel --> Commit[Commit Transaction]
    NotifyCancel --> Commit
    Commit --> End([Cancellation Complete])

    %% Node Color Styling
    classDef startEnd fill:#ECEFF1,stroke:#607D8B,stroke-width:2px,color:#263238;
    classDef process fill:#E3F2FD,stroke:#2196F3,stroke-width:2px,color:#0D47A1;
    classDef decision fill:#FFF8E1,stroke:#FFB300,stroke-width:2px,color:#B75400;
    classDef success fill:#E8F5E9,stroke:#4CAF50,stroke-width:2px,color:#1B5E20;
    classDef error fill:#FFEBEE,stroke:#F44336,stroke-width:2px,color:#B71C1C;
    classDef action fill:#F3E5F5,stroke:#9C27B0,stroke-width:2px,color:#4A148C;

    class Start,End startEnd;
    class CalcHours,Tier100,Tier50,Tier0,CalcAmounts,NotifyAdminCancel,NotifyCancel process;
    class AdminOrUser,ValidateState,CheckTime,TimeTier,IsRefund,IsPenalty decision;
    class AdminCancel,AdminRefundTx,SetCancelled,RefundTx,PenaltyTx action;
    class RefundAdmin,RefundUser,Commit success;
    class ErrState,ErrStarted error;
```

---

## 7. Token Administration & Reset Flows

Admins have the authority to grant tokens manually. In addition, the system runs a **Monthly Token Reset** scheduler to replenish user balances according to their roles.

```mermaid
flowchart TD
    Start([System Maintenance Action]) --> MainType{Action Type?}
    
    %% Admin Grant
    MainType -- "Admin Grant" --> VerifyAdmin{Is actioner an Admin?}
    VerifyAdmin -- No --> ErrPermission[Raise PermissionError]
    VerifyAdmin -- Yes --> UpdateUserGrant[Credit amount to target User.token_balance]
    UpdateUserGrant --> GrantTx[Create Transaction row <br>Type: GRANT, Amount: +Amount]
    
    %% User Registration
    MainType -- "User Registration" --> GetRoleTokens[Determine initial tokens based on UserRole]
    GetRoleTokens --> RegisterUser[Create User with initial token_balance]
    RegisterUser --> RegTx[Create Transaction row <br>Type: GRANT, Amount: +InitialTokens]
    
    %% Monthly Reset
    MainType -- "Monthly Reset" --> ScanUsers[Retrieve all active Users]
    ScanUsers --> LoopUsers{For each active User}
    
    LoopUsers -- No more --> EndReset([Reset Complete])
    LoopUsers -- Next User --> GetRoleInitial[Determine role's initial token amount]
    
    GetRoleInitial --> CalcDelta[Calculate delta = initial_tokens - user.token_balance]
    CalcDelta --> DeltaCheck{Is delta > 0?}
    
    DeltaCheck -- No --> LoopUsers
    DeltaCheck -- Yes --> ReplenishTokens[Credit delta to User.token_balance]
    ReplenishTokens --> MonthlyResetTx[Create Transaction row <br>Type: GRANT, Amount: +Delta]
    MonthlyResetTx --> LoopUsers
    
    RegTx --> Commit[Commit Transaction]
    GrantTx --> Commit
    Commit --> End([Maintenance Flow Complete])

    %% Node Color Styling
    classDef startEnd fill:#ECEFF1,stroke:#607D8B,stroke-width:2px,color:#263238;
    classDef process fill:#E3F2FD,stroke:#2196F3,stroke-width:2px,color:#0D47A1;
    classDef decision fill:#FFF8E1,stroke:#FFB300,stroke-width:2px,color:#B75400;
    classDef success fill:#E8F5E9,stroke:#4CAF50,stroke-width:2px,color:#1B5E20;
    classDef error fill:#FFEBEE,stroke:#F44336,stroke-width:2px,color:#B71C1C;
    classDef action fill:#F3E5F5,stroke:#9C27B0,stroke-width:2px,color:#4A148C;

    class Start,End,EndReset startEnd;
    class GetRoleTokens,ScanUsers,GetRoleInitial,CalcDelta process;
    class MainType,VerifyAdmin,LoopUsers,DeltaCheck decision;
    class GrantTx,RegTx,MonthlyResetTx action;
    class UpdateUserGrant,RegisterUser,ReplenishTokens,Commit success;
    class ErrPermission error;
```

---

## 8. Completion & No-Show Lifecycles

After a reserved booking slot passes, the status changes to either `COMPLETED` or `NO_SHOW`. No tokens are refunded in either of these cases:

- **COMPLETED**: The user successfully attended the reservation. The deducted tokens represent the paid usage fee.
- **NO_SHOW**: The user failed to attend the reservation. The deducted tokens are kept in full as a penalty.

```mermaid
stateDiagram-v2
    [*] --> PENDING : Booking requested (Deposit Deduct)
    [*] --> RESERVED : Booking requested (Deposit Deduct, bypass approval)

    PENDING --> RESERVED : Admin approves request
    PENDING --> REJECTED : Admin rejects request (100% Refund)
    PENDING --> REJECTED : Auto-rejected by overlap (100% Refund)
    PENDING --> CANCELLED : User cancels before start (Time-based Refund/Penalty)
    
    RESERVED --> CANCELLED : User cancels before start (Time-based Refund/Penalty)
    RESERVED --> CANCELLED : Admin force cancels (100% Refund)
    RESERVED --> COMPLETED : Booking end time passes (No refund)
    RESERVED --> NO_SHOW : Booking end time passes (No refund)
```
