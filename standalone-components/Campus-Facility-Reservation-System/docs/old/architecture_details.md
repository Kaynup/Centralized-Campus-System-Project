# Architectural Details & Flow Diagrams

This document details the software architecture, the request-response cycle, and integration flows between the React frontend client and the FastAPI backend server.

## Architectural Diagram

The application adheres to a Clean Layered Architecture:

```mermaid
graph TD
    subgraph Client Layer [Frontend Client - React]
        UI[User Interface Components]
        State[React Context / Auth / Notification Context]
        APIClient[Axios Client - api_spec modules]
    end

    subgraph API Routing & Auth Layer [Backend - FastAPI]
        Router[APIRouter endpoints/v1]
        Middleware[CORS & Auth Middleware]
        Dependency[DB Session Dependency Injection]
    end

    subgraph Service Layer [Business Logic]
        BookingSvc[Booking Service]
        CancelSvc[Cancellation Service]
        ApprovalSvc[Approval Service]
        UserSvc[User/Auth Service]
    end

    subgraph Data Access Layer
        CRUD[CRUD Helpers]
        ORM[SQLAlchemy Models]
        DB[(SQLite / MySQL Database)]
    end

    UI --> State
    State --> APIClient
    APIClient -->|HTTP Request / JWT| Middleware
    Middleware --> Router
    Router --> Dependency
    Dependency --> BookingSvc
    Dependency --> CancelSvc
    Dependency --> ApprovalSvc
    Dependency --> UserSvc
    
    BookingSvc --> CRUD
    CancelSvc --> CRUD
    ApprovalSvc --> CRUD
    UserSvc --> CRUD
    
    CRUD --> ORM
    ORM --> DB
```

---

## Architectural Flow Diagram: Creating a Booking

This flow diagram illustrates the end-to-end request-response cycle when a student attempts to reserve a facility slot:

```mermaid
sequenceDiagram
    autonumber
    actor Student
    participant UI as React UI
    participant API as FastAPI Router
    participant Service as Booking Service
    participant DB as Database (SQLAlchemy)
    participant Notification as Notification System

    Student->>UI: Click "Book Slot"
    UI->>API: POST /api/v1/bookings (JWT + slot_id)
    API->>API: Authenticate User & Validate Session
    API->>Service: create_booking(db, user_id, facility_id, start_time, end_time)
    
    rect rgb(240, 248, 255)
        Note over Service, DB: Transaction Begins
        Service->>DB: Check user eligibility & token balance
        DB-->>Service: Tokens & Roles OK
        Service->>DB: Check for overlapping reservation (double-booking check)
        DB-->>Service: No Overlap Found
        Service->>DB: Deduct Token Deposit
        Service->>DB: Update Slot Status to Reserved
        Service->>DB: Create Booking & Audit Log entries
        Service->>DB: Commit Transaction
    end

    Service-->>API: Return Booking Details
    critical Notify Student
        Service->>Notification: Trigger Async Email & In-App Notification
    end
    API-->>UI: 201 Created (JSON Response)
    UI->>Student: Show confirmation message & updated token balance
```

---

## Cancellation Processing Flow

This diagram outlines how cancellation refunds and penalties are computed and processed when a student cancels a booking:

```mermaid
sequenceDiagram
    autonumber
    actor Student
    participant UI as React UI
    participant API as FastAPI Router
    participant Service as Cancellation Service
    participant DB as Database (SQLAlchemy)

    Student->>UI: Click "Cancel Booking"
    UI->>API: POST /api/v1/bookings/{id}/cancel
    API->>Service: execute_cancellation(db, booking_id, user_id)
    
    rect rgb(255, 240, 240)
        Note over Service: Compute hours remaining until Slot Start
        alt Hours > 24
            Note over Service: 100% Refund, 0% Penalty
        else Hours between 12 and 24
            Note over Service: 50% Refund, 50% Penalty
        else Hours < 12
            Note over Service: 0% Refund, 100% Penalty
        end
    end

    rect rgb(240, 248, 255)
        Note over Service, DB: Transaction Begins
        Service->>DB: Update Booking Status -> CANCELLED
        Service->>DB: Free up Slot (is_available = True)
        Service->>DB: Refund calculated tokens to User Balance
        Service->>DB: Insert REFUND / PENALTY transactions
        Service->>DB: Write Log (INFO if fully refunded, WARNING if penalty applied)
        Service->>DB: Commit Transaction
    end

    Service-->>API: Return Cancellation Summary
    API-->>UI: 200 OK
    UI->>Student: Update UI dashboard showing refund amount
```
