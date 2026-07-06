# Repository File Hierarchy

This document provides a comprehensive overview of the file structure in the Campus Facility Reservation Project.

```
Campus-Facility-Reservation-Project/
├── .gitignore
├── Makefile
├── README.md
├── requirements.txt
├── git_commit.txt
├── docs/                             # Project documentation
│   ├── backend/                      # Backend service documentation
│   │   └── services.md
│   ├── frontend/                     # Frontend architecture documentation
│   │   └── architecture.md
│   ├── scripts/                      # DB seeding and script documentation
│   │   └── scripts_overview.md
│   ├── automation/                   # Test automation & CI documentation
│   │   └── testing_automation.md
│   ├── file_hierarchy.md             # This document
│   ├── architecture_details.md       # Architecture & flow diagrams
│   ├── use_cases.md                  # Use case diagrams & interactions
│   └── brd_fulfillment.md            # Mapping to BRD objectives
├── backend/                          # Backend source code (FastAPI)
│   ├── app/
│   │   ├── __init__.py
│   │   ├── main.py                   # FastAPI entrypoint
│   │   ├── api/                      # Routes and API logic
│   │   │   ├── v1/
│   │   │   │   ├── endpoints/        # Endpoints (auth, booking, facility, etc.)
│   │   │   │   └── router.py
│   │   ├── core/                     # Configuration and auth settings
│   │   ├── db/                       # Database engine, models, and CRUD
│   │   │   ├── database.py
│   │   │   ├── models.py
│   │   │   ├── crud/                 # CRUD databases functions
│   │   │   └── migrations/           # Alembic database migrations
│   │   ├── services/                 # Core business logic
│   │   │   ├── approval_service.py
│   │   │   ├── booking_service.py
│   │   │   ├── cancellation_service.py
│   │   │   └── facility_service.py
│   │   ├── utils/                    # Exception handlers and helpers
│   │   └── tests/                    # Backend pytest suite
│   ├── alembic.ini
│   └── setup.cfg
├── frontend/                         # Frontend source code (React / Vite)
│   ├── src/
│   │   ├── api/                      # API integration services
│   │   ├── components/               # Shared components
│   │   ├── contexts/                 # React Context providers (Auth, Notifications)
│   │   ├── pages/                    # Frontend page views
│   │   ├── tests/                    # Vitest spec suites
│   │   ├── App.jsx
│   │   └── main.jsx
│   ├── package.json
│   └── vite.config.js
├── scripts/                          # Seeding & configuration scripts
│   ├── import_slots.py
│   ├── seed_db.py
│   └── setup_db.sh
└── infra/                            # Infra deployment specs
    └── db/
        └── init.sql
```
