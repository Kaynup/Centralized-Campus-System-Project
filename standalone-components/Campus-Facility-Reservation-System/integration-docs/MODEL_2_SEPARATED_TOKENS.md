# Integration Model 2: Separated Token System with Conversion Limits

This document outlines the architecture, conversion rules, and integration flows for the **Separated Application Token Model** (Model-2). 

In this model, each campus application manages its own independent coin database. Rather than restricting weekly expenditures, spending is regulated at the entry point: by enforcing strict **conversion limits** when exchanging topped-up money into application-specific coins.

---

## 1. System Architecture Overview

Under the Separated model, there is a central **Campus Money Vault** (retaining fiat currency loaded by parents/guardians) and three isolated application wallets. Coins are non-transferable between applications.

```mermaid
%%{init: {
  'theme': 'base',
  'themeVariables': {
    'primaryColor': '#F5F5F5',
    'primaryTextColor': '#333333',
    'primaryBorderColor': '#CCCCCC',
    'lineColor': '#888888',
    'secondaryColor': '#E8F5E9',
    'tertiaryColor': '#FFFDE7'
  }
}}%%
graph TD
    Parent([Parent / Guardian / Student]) -- Tops up Fiat Money --> MoneyVault[Central Campus Money Vault]
    MoneyVault --> MoneyDB[(Money Vault DB<br>Rupee Balances per Student)]
    
    subgraph Isolated Application Wallets
        App3[Facility Reservation App] --> DB3[(Facility Coin DB)]
        App1[Equipment Rental App] --> DB1[(Equipment Coin DB)]
        App2[Marketplace App] --> DB2[(Marketplace Coin DB)]
    end
    
    MoneyVault -- "1. Verify conversion limit<br>2. Convert Rupee to Facility Coins" --> DB3
    MoneyVault -- "1. Verify conversion limit<br>2. Convert Rupee to Equipment Coins" --> DB1
    MoneyVault -- "1. Check Rupee balance<br>2. Convert Rupee to Marketplace Coins" --> DB2

    %% Styling
    style MoneyVault fill:#E2F0D9,stroke:#385723,stroke-width:2px,color:#385723;
    style MoneyDB fill:#E2F0D9,stroke:#385723,stroke-width:2px,color:#385723;
    style DB3 fill:#FCE4D6,stroke:#C65911,stroke-width:2px,color:#C65911;
    style DB1 fill:#FCE4D6,stroke:#C65911,stroke-width:2px,color:#C65911;
    style DB2 fill:#FCE4D6,stroke:#C65911,stroke-width:2px,color:#C65911;
```

---

## 2. Independent Wallets & Conversion Limits

Students request conversions from their Central Money Vault into the respective application coins. To prevent excessive allocation of funds to specific services, conversion caps are strictly enforced:

| Target Application | Coin Name | Conversion Limit Tier | Monthly Conversion Limit | Conversion Rate |
| :--- | :--- | :---: | :---: | :---: |
| **3. Facility Reservation** | **Facility Coins** | **Strict Limit** | **Max ₹1,000.00 / month** | ₹10.00 = 10 Facility Coins |
| **1. Equipment Rental** | **Equipment Coins** | **Moderate Limit** | **Max ₹5,000.00 / month** | ₹10.00 = 10 Equipment Coins |
| **2. Campus Marketplace** | **Marketplace Coins** | **No Limit** | **Unlimited** (Up to money exhaustion) | ₹10.00 = 10 Marketplace Coins |

### Key Rule Constraints
- **Unused coins are locked**: Once Rupee is converted into Facility Coins or Equipment Coins, they **cannot** be converted back to Rupee or transferred to another application.
- **Conversion Limits Reset**: The monthly conversion counters reset to ₹0.00 spent on the first day of each calendar month.

---

## 3. Atomic Conversion & Limit Verification Flow

To prevent database desynchronization, the exchange of fiat money for application-specific coins must be processed as a **two-phase commit** across both databases:

```mermaid
flowchart TD
    Start([Student requests conversion of ₹X to App Coins]) --> FetchRupee[Retrieve current Rupee balance in Central Vault]
    FetchRupee --> CheckFiat{Rupee balance >= ₹X?}
    
    CheckFiat -- No --> ErrFiat[Reject: Insufficient parent-topped funds]
    CheckFiat -- Yes --> CheckDest{Target App?}
    
    %% Facility Reservation
    CheckDest -- "Facility Reservation" --> GetConverted3[Calculate Rupee converted to Facility Coins this month]
    GetConverted3 --> ValidateLimit3{Current Month Converted + ₹X <= ₹1,000.00?}
    ValidateLimit3 -- No --> ErrLimit3[Reject: Strict Monthly Limit of ₹1,000.00 Exceeded]
    ValidateLimit3 -- Yes --> HoldRupee[Hold ₹X in Central Vault]

    %% Equipment Rental
    CheckDest -- "Equipment Rental" --> GetConverted1[Calculate Rupee converted to Equipment Coins this month]
    GetConverted1 --> ValidateLimit1{Current Month Converted + ₹X <= ₹5,000.00?}
    ValidateLimit1 -- No --> ErrLimit1[Reject: Moderate Monthly Limit of ₹5,000.00 Exceeded]
    ValidateLimit1 -- Yes --> HoldRupee

    %% Marketplace
    CheckDest -- "Marketplace" --> HoldRupee
    
    HoldRupee --> CreditApp[Call App Ledger API to credit +Y Coins to User]
    CreditApp --> VerifyCredit{Did App credit succeed?}
    
    VerifyCredit -- Yes --> FinalizeConversion[Deduct ₹X from Rupee Balance <br>Release Hold and log transaction]
    FinalizeConversion --> NotifySuccess[Notify Student of successful top-up] --> End([Conversion Complete])
    
    VerifyCredit -- No --> ReleaseHold[Release hold on Rupee balance]
    ReleaseHold --> ErrApp[Reject: Application database unreachable]

    %% Node Color Styling
    classDef startEnd fill:#ECEFF1,stroke:#607D8B,stroke-width:2px,color:#263238;
    classDef process fill:#E3F2FD,stroke:#2196F3,stroke-width:2px,color:#0D47A1;
    classDef decision fill:#FFF8E1,stroke:#FFB300,stroke-width:2px,color:#B75400;
    classDef success fill:#E8F5E9,stroke:#4CAF50,stroke-width:2px,color:#1B5E20;
    classDef error fill:#FFEBEE,stroke:#F44336,stroke-width:2px,color:#B71C1C;
    classDef action fill:#F3E5F5,stroke:#9C27B0,stroke-width:2px,color:#4A148C;

    class Start,End startEnd;
    class FetchRupee,GetConverted3,GetConverted1,HoldRupee,CreditApp process;
    class CheckFiat,CheckDest,ValidateLimit3,ValidateLimit1,VerifyCredit decision;
    class FinalizeConversion,ReleaseHold action;
    class NotifySuccess success;
    class ErrFiat,ErrLimit3,ErrLimit1,ErrApp error;
```

---

## 4. Integration Database Extensions

To manage conversion limits, the **Central Campus Money Vault** must maintain a log table of monthly conversion quotas per user:

```sql
CREATE TABLE user_monthly_conversion_quotas (
    id SERIAL PRIMARY KEY,
    user_id INT NOT NULL,
    month_year DATE NOT NULL, -- e.g., '2026-06-01'
    facility_converted_rupee NUMERIC(10, 2) DEFAULT 0.00,
    equipment_converted_rupee NUMERIC(10, 2) DEFAULT 0.00,
    UNIQUE(user_id, month_year)
);
```

### Advantages of Model 2
* **Database Isolation**: If the Facility Reservation database goes offline, students can still buy food at the Marketplace without system lockouts.
* **Tight Financial Control**: Parents can rest assured that money topped up cannot be accidentally fully blown on booking facility rooms, restricting waste at the source.
* **Simpler Reconciliation**: Account ledgers are kept clean and specific to each application team's domain.
