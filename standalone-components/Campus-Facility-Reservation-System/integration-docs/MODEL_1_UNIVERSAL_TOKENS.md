# Integration Model 1: Universal Campus Token System

This document outlines the architecture, transaction logic, and system integration flow for the **Universal Campus Token Model** (Model-1). 

In this model, a single universal token (Campus Coin) is shared across all campus applications, funded by a central parent-topped account, and controlled by weekly spending limits per application.

---

## 1. System Architecture Overview

Under the Universal model, a centralized **Campus Wallet Service** manages a single database ledger for all student accounts. The three campus applications interface with this service via secure API calls to authorize and record transactions.

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
graph TD
    Parent([Parent / Guardian / Student]) -- Tops up Money --> CentralWallet[Universal Campus Wallet Service]
    CentralWallet --> DB[(Central Wallet DB<br>Universal Balances & Ledger)]
    
    subgraph Integrated Applications
        App3[Campus Facility Reservation]
        App2[Campus Equipment Rental]
        App1[Campus Marketplace]
    end
    
    App3 -- "Debit/Refund request <br>(Strict Weekly Limit check)" --> CentralWallet
    App2 -- "Debit/Refund request <br>(Medium Weekly Limit check)" --> CentralWallet
    App1 -- "Debit/Refund request <br>(No Limit check)" --> CentralWallet

    %% Styling
    style CentralWallet fill:#E8F5E9,stroke:#4CAF50,stroke-width:2px,color:#1B5E20;
    style DB fill:#E1F5FE,stroke:#039BE5,stroke-width:2px,color:#01579B;
    style App3 fill:#FFF8E1,stroke:#FFB300,stroke-width:2px,color:#B75400;
    style App2 fill:#FFF8E1,stroke:#FFB300,stroke-width:2px,color:#B75400;
    style App1 fill:#FFF8E1,stroke:#FFB300,stroke-width:2px,color:#B75400;
```

---

## 2. Universal Balance & Expenditure Rules

### Funding the Wallet
- Parents, guardians, or students can top up the **Central Wallet** with fiat currency (money) at any point in the month.
- Money is instantly converted to a single universal token balance at a fixed exchange rate (e.g., ₹100.00 Rupee = 10 Campus Coins).

### Cross-App Expenditure Limits
To prevent over-allocation of tokens to non-essential activities and ensure fair sharing of resource facilities, the system enforces **weekly expenditure limits** depending on the application context:

| Application | Limit Type | Weekly Limit Amount | Rationale |
| :--- | :--- | :---: | :--- |
| **3. Facility Reservation** | **Strict Exhaustive** | **15 Coins / week** | Prevents single students from monopolizing study rooms, gyms, or labs. |
| **2. Equipment Rental** | **Medium Exhaustive** | **50 Coins / week** | Allows students to rent necessary laptops, project kits, or cameras but caps misuse. |
| **1. Campus Marketplace** | **No Limit** | **Unlimited** | Essential for purchasing meals, textbooks, and academic supplies. |

---

## 3. Transaction Flow with Weekly Limit Verification

Whenever a student makes a purchase, the target application queries the central database. If the target application has an expenditure limit, the wallet service checks the user's spending ledger for the **current week** (defined as the start of Monday UTC to the current timestamp) to verify if the transaction is allowed.

```mermaid
flowchart TD
    Start([Student requests transaction in an App]) --> CheckBalance{Universal Balance >= Cost?}
    
    CheckBalance -- No --> ErrBalance[Reject: Insufficient Universal Funds]
    CheckBalance -- Yes --> RouteLimit{App Type?}
    
    %% Facility Reservation
    RouteLimit -- "Facility Reservation" --> CalcWeekly3[Calculate total coins spent in Facility Reservation this week]
    CalcWeekly3 --> CheckLimit3{Current Week Spent + Cost <= 15 Coins?}
    CheckLimit3 -- No --> ErrLimit3[Reject: Strict Facility Weekly Limit Exceeded]
    CheckLimit3 -- Yes --> ProcessDebit[Atomically deduct tokens from Universal Wallet]

    %% Equipment Rental
    RouteLimit -- "Equipment Rental" --> CalcWeekly2[Calculate total coins spent in Equipment Rental this week]
    CalcWeekly2 --> CheckLimit2{Current Week Spent + Cost <= 50 Coins?}
    CheckLimit2 -- No --> ErrLimit2[Reject: Equipment Rental Weekly Limit Exceeded]
    CheckLimit2 -- Yes --> ProcessDebit

    %% Marketplace
    RouteLimit -- "Marketplace" --> ProcessDebit
    
    ProcessDebit --> CreateTx[Create Transaction row <br>Type: DEPOSIT / DEDUCTION, link to booking/order]
    CreateTx --> Success[Return transaction approval to App] --> End([Transaction Finalized])

    %% Node Color Styling
    classDef startEnd fill:#ECEFF1,stroke:#607D8B,stroke-width:2px,color:#263238;
    classDef process fill:#E3F2FD,stroke:#2196F3,stroke-width:2px,color:#0D47A1;
    classDef decision fill:#FFF8E1,stroke:#FFB300,stroke-width:2px,color:#B75400;
    classDef success fill:#E8F5E9,stroke:#4CAF50,stroke-width:2px,color:#1B5E20;
    classDef error fill:#FFEBEE,stroke:#F44336,stroke-width:2px,color:#B71C1C;
    classDef action fill:#F3E5F5,stroke:#9C27B0,stroke-width:2px,color:#4A148C;

    class Start,End startEnd;
    class CalcWeekly3,CalcWeekly2,ProcessDebit process;
    class CheckBalance,RouteLimit,CheckLimit3,CheckLimit2 decision;
    class CreateTx action;
    class Success success;
    class ErrBalance,ErrLimit3,ErrLimit2 error;
```

---

## 4. API Schema Extension Requirements

To integrate our Facility Reservation database with the Central Wallet Service, the current transaction table should be adapted. 

```sql
-- Extends the existing transactions schema to support cross-app scopes
ALTER TABLE transactions ADD COLUMN app_source VARCHAR(50) DEFAULT 'facility_reservation';
ALTER TABLE transactions ADD COLUMN external_reference_id VARCHAR(100);

-- Query to calculate weekly spending for Facility Reservation
SELECT SUM(ABS(amount)) 
FROM transactions 
WHERE user_id = :user_id 
  AND type = 'DEPOSIT' 
  AND app_source = 'facility_reservation'
  AND transaction_at >= date_trunc('week', current_timestamp);
```

### Advantages of Model 1
* **Seamless User Experience**: Students manage only a single coin balance.
* **Unified Parent Portal**: Parents top up a single master wallet instead of handling multiple micro-wallets.
* **Granular Dynamic Budgets**: Focuses security controls on usage constraints (spending limits) rather than allocation constraints.
