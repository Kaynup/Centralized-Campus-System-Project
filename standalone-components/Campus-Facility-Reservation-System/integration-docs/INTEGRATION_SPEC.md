# Centralized Campus Portal: Model-1 Integration Specification

This document details the complete integration architecture of the four campus applications using the **Universal Token System (Model 1)**.

## 1. System Architecture Overview

The system transitions to a Hub-and-Spoke model. A new **Central Campus Portal** acts as the central hub managing user identity, profiles, and the universal coin wallet. The three existing projects operate as independent sub-applications that rely on the central hub for authentication and token balances, while enforcing their own domain-specific business rules.

```mermaid
%%{init: {
  'theme': 'base',
  'themeVariables': {
    'primaryColor': '#E3F2FD',
    'primaryTextColor': '#0D47A1',
    'primaryBorderColor': '#1565C0',
    'lineColor': '#1976D2',
    'secondaryColor': '#E8F5E9',
    'tertiaryColor': '#FFF3E0'
  }
}}%%
graph TD
    Parent(["Parents / Students"]) -- "Top up Wallet (Rupees)" --> CentralPortal
    
    subgraph Central Hub
        CentralPortal["Central Campus Portal<br>(Identity & Wallet Hub)"]
        CentralDB[("Central User & Wallet DB")]
    end
    
    CentralPortal <-->|Read/Write Profile & Balance| CentralDB
    
    subgraph Sub-Applications
        App3["Facility Reservation App<br>- Strict Token Limits<br>- Approval Hierarchies"]
        App2["Equipment Rental App<br>- Medium Token Limits<br>- Deposit Policies"]
        App1["Campus Marketplace App<br>- No Token Limits<br>- Open Commerce"]
    end
    
    CentralPortal -- "SSO Login & Redirection" --> App3
    CentralPortal -- "SSO Login & Redirection" --> App2
    CentralPortal -- "SSO Login & Redirection" --> App1
    
    App3 -- "Debit Request (Limit Check)" --> CentralPortal
    App2 -- "Debit Request (Limit Check)" --> CentralPortal
    App1 -- "Debit Request (No Limit)" --> CentralPortal

    %% Styling
    style CentralPortal fill:#E8F5E9,stroke:#2E7D32,stroke-width:2px,color:#1B5E20;
    style CentralDB fill:#C8E6C9,stroke:#2E7D32,stroke-width:2px,color:#1B5E20;
    style App3 fill:#FFF8E1,stroke:#F57F17,stroke-width:2px,color:#E65100;
    style App2 fill:#FFF8E1,stroke:#F57F17,stroke-width:2px,color:#E65100;
    style App1 fill:#FFF8E1,stroke:#F57F17,stroke-width:2px,color:#E65100;
```

---

## 2. User Journey & Redirection Flow

Users (Students, Professors, Admins) log into the Central Campus Portal. Upon successful authentication, they access a dashboard displaying their universal token balance and links to the sub-applications. 

When a user navigates to a sub-application, they are seamlessly authenticated via Single Sign-On (SSO). The sub-application fetches their profile and role to apply its specific policies.

```mermaid
sequenceDiagram
    autonumber
    actor User as Student
    participant Hub as Central Campus Portal
    participant SubApp as Sub-Application (e.g., Facility)
    
    User->>Hub: Logs in with credentials
    activate Hub
    Hub-->>User: Renders Central Dashboard (Balance & Apps)
    User->>Hub: Clicks "Go to Facility Reservation"
    
    Hub->>SubApp: Redirects with SSO Auth Token (JWT/Session)
    activate SubApp
    SubApp->>Hub: Validates SSO Token
    Hub-->>SubApp: Returns User Profile & Role Info
    
    Note over SubApp: SubApp applies its own domain policies<br>(e.g., Is student allowed to book this lab?)
    
    SubApp-->>User: Renders Facility Dashboard
    deactivate Hub
    deactivate SubApp
```

---

## 3. Wallet & Top-up Flow

The top-up system allows parents, guardians, or students to deposit Rupees into their central account. These are instantly converted into Universal Campus Coins.

```mermaid
flowchart TD
    Start(["Initiate Top-Up"]) --> Role{"Who is topping up?"}
    
    Role -- "Student" --> PaymentGateway["Payment Gateway (UPI/Card)"]
    Role -- "Parent/Guardian" --> ParentPortal["Parent Access Portal"] --> PaymentGateway
    
    PaymentGateway --> TopUpService["Central Top-Up Service"]
    TopUpService --> Validate{"Payment Successful?"}
    
    Validate -- No --> Fail["Log failure & notify user"]
    Validate -- Yes --> Convert["Convert Rupees to Campus Coins <br>e.g., ₹100 = 10 Coins"]
    
    Convert --> UpdateLedger["Update Universal Wallet Balance & Transaction DB"]
    UpdateLedger --> Notify["Send Confirmation Notification"]
    Notify --> End(["Top-Up Complete"])

    %% Styling
    classDef process fill:#E3F2FD,stroke:#1565C0,stroke-width:2px,color:#0D47A1;
    classDef decision fill:#FFF3E0,stroke:#E65100,stroke-width:2px,color:#BF360C;
    classDef success fill:#E8F5E9,stroke:#2E7D32,stroke-width:2px,color:#1B5E20;
    classDef error fill:#FFEBEE,stroke:#C62828,stroke-width:2px,color:#B71C1C;
    
    class PaymentGateway,ParentPortal,TopUpService,Convert process;
    class Role,Validate decision;
    class UpdateLedger,Notify,End success;
    class Fail error;
```

---

## 4. Sub-Application Policies & Token Exhaustion Limits

While the tokens are universally available in the user's central wallet, expenditure limits are enforced by the Central Hub based on the requesting sub-application. Additionally, each sub-application enforces its own behavioral policies.

### A. Central Token Limits (Model 1 Rules)
- **Campus Facility Reservation**: Strict Weekly Limit (e.g., Max 15 coins/week).
- **Campus Equipment Rental**: Medium Weekly Limit (e.g., Max 50 coins/week).
- **Campus Marketplace**: No Limit (Exhaustive up to full wallet balance).

### B. Application-Specific Policies
- **Profile Portability**: The central profile carries the user's `Role` (Student, Professor, Admin).
- **Facility Reservation Policies**: Enforces hierarchical approval workflows (Students need approval, Professors bypass). Enforces overlapping booking auto-cancellations.
- **Equipment Rental Policies**: Enforces deposit holding, late-return penalties, and condition-based refund policies.

```mermaid
flowchart TD
    Start(["User initiates action in Sub-App"]) --> AppPolicy{"Sub-App Rules"}
    
    AppPolicy -- "Fails App Policy" --> RejectApp["Reject Action Locally <br>e.g., Student trying to book a faculty-only room"]
    
    AppPolicy -- "Passes App Policy" --> RequestDebit["Sub-App requests debit from Central Wallet"]
    
    RequestDebit --> CheckBalance{"Wallet Balance Sufficient?"}
    
    CheckBalance -- No --> RejectBal["Reject: Insufficient Total Balance"]
    
    CheckBalance -- Yes --> AppType{"Which Sub-App?"}
    
    AppType -- "Facility (Strict)" --> CheckLimitF{"Weekly Facility Spend + Cost <= 15?"}
    AppType -- "Rental (Medium)" --> CheckLimitR{"Weekly Rental Spend + Cost <= 50?"}
    AppType -- "Marketplace (None)" --> ApproveDebit
    
    CheckLimitF -- No --> RejectLimit["Reject: Weekly App Limit Exceeded"]
    CheckLimitR -- No --> RejectLimit
    
    CheckLimitF -- Yes --> ApproveDebit
    CheckLimitR -- Yes --> ApproveDebit
    
    ApproveDebit["Approve & Deduct Tokens Atomically"] --> ProcessApp["Sub-App finalizes transaction <br>e.g., Confirms Booking"]
    
    ProcessApp --> End(["Transaction Complete"])

    %% Styling
    classDef process fill:#E3F2FD,stroke:#1565C0,stroke-width:2px,color:#0D47A1;
    classDef decision fill:#FFF3E0,stroke:#E65100,stroke-width:2px,color:#BF360C;
    classDef success fill:#E8F5E9,stroke:#2E7D32,stroke-width:2px,color:#1B5E20;
    classDef error fill:#FFEBEE,stroke:#C62828,stroke-width:2px,color:#B71C1C;
    
    class RequestDebit,ProcessApp process;
    class AppPolicy,CheckBalance,AppType,CheckLimitF,CheckLimitR decision;
    class ApproveDebit,End success;
    class RejectApp,RejectBal,RejectLimit error;
```
