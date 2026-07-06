# File Hierarchy

This document defines the complete recommended file and folder hierarchy for the Campus Facility Reservation System.

## Root

- `README.md` — project overview, setup, and high level notes
- `.gitignore` — files and folders excluded from source control
- `P&A_Campus_Facility_Reservation_BRD.pdf` — business requirements and sponsor document

## `dev_space/`

This folder contains planning and documentation artifacts for development.

- `README.md` — overview of the development space
- `FILE_HIERARCHY.md` — this file
- `DESIGN.md` — architecture and system design documentation
- `FUNCTIONAL_OBJECTIVES.md` — functional requirements, user stories, and acceptance criteria
- `CORE_IDEA.md` — core concept, business and engineering objectives
- `database_ideas.md` — database modeling ideas and notes
- `ui_ideas.md` — frontend UI/UX ideas and wireframe concepts

## Recommended Project Structure

```
CampusFacilityReservation/
├── README.md
├── backend/
│   ├── app/
│   │   ├── main.py
│   │   ├── api/
│   │   │   ├── v1/
│   │   │   │   ├── auth.py
│   │   │   │   ├── facilities.py
│   │   │   │   ├── bookings.py
│   │   │   │   ├── approvals.py
│   │   │   │   ├── tokens.py
│   │   │   │   └── health.py
│   │   │   └── __init__.py
│   │   ├── core/
│   │   │   ├── config.py
│   │   │   ├── logging.py
│   │   │   └── security.py
│   │   ├── db/
│   │   │   ├── base.py
│   │   │   ├── models.py
│   │   │   ├── schemas.py
│   │   │   ├── crud.py
│   │   │   ├── session.py
│   │   │   └── migrations/
│   │   │       ├── env.py
│   │   │       ├── script.py.mako
│   │   │       └── versions/
│   │   ├── services/
│   │   │   ├── booking_service.py
│   │   │   ├── cancellation_service.py
│   │   │   ├── approval_service.py
│   │   │   ├── facility_service.py
│   │   │   └── user_service.py
│   │   ├── utils/
│   │   │   ├── time_utils.py
│   │   │   ├── email_notifications.py
│   │   │   ├── exceptions.py
│   │   │   └── role_helpers.py
│   │   └── tests/
│   │       ├── conftest.py
│   │       ├── test_auth.py
│   │       ├── test_bookings.py
│   │       ├── test_approvals.py
│   │       ├── test_slots.py
│   │       └── test_cancellation_rules.py
│   ├── requirements.txt
│   ├── pyproject.toml
│   ├── Dockerfile
│   └── docker-compose.yml
├── frontend/
│   ├── public/
│   │   ├── index.html
│   │   ├── favicon.ico
│   │   └── manifest.json
│   ├── src/
│   │   ├── App.jsx
│   │   ├── index.jsx
│   │   ├── api/
│   │   │   ├── apiClient.js
│   │   │   ├── facilityApi.js
│   │   │   └── bookingApi.js
│   │   ├── components/
│   │   │   ├── layout/
│   │   │   │   ├── Sidebar.jsx
│   │   │   │   └── TopBar.jsx
│   │   │   ├── calendar/
│   │   │   │   ├── CalendarGrid.jsx
│   │   │   │   ├── TimeAxis.jsx
│   │   │   │   ├── FacilityHeaderRow.jsx
│   │   │   │   ├── FacilityColumn.jsx
│   │   │   │   ├── BookingBlock.jsx
│   │   │   │   ├── ReservationDrawer.jsx
│   │   │   │   ├── CalendarLegend.jsx
│   │   │   │   └── CalendarFilters.jsx
│   │   │   ├── common/
│   │   │   │   ├── Button.jsx
│   │   │   │   ├── Drawer.jsx
│   │   │   │   ├── Card.jsx
│   │   │   │   └── StatusBadge.jsx
│   │   ├── contexts/
│   │   │   ├── AuthContext.jsx
│   │   │   ├── BookingContext.jsx
│   │   │   └── FacilityContext.jsx
│   │   ├── pages/
│   │   │   ├── FacilityCalendarPage.jsx
│   │   │   └── NotFoundPage.jsx
│   │   ├── styles/
│   │   │   ├── globals.css
│   │   │   ├── layout.css
│   │   │   ├── calendar.css
│   │   │   └── theme.css
│   │   ├── utils/
│   │   │   ├── dateHelpers.js
│   │   │   ├── bookingHelpers.js
│   │   │   └── roleHelpers.js
│   │   └── tests/
│   │       ├── CalendarGrid.test.jsx
│   │       ├── BookingBlock.test.jsx
│   │       └── ReservationDrawer.test.jsx
│   ├── package.json
│   ├── vite.config.js
│   ├── .env.example
│   └── tsconfig.json
├── docs/
│   ├── architecture.md
│   ├── api_spec.md
│   ├── user_flows.md
│   ├── ui_wireframes.md
│   └── sprint_plan.md
├── scripts/
│   ├── seed_db.py
│   ├── run_tests.sh
│   ├── import_slots.py
│   └── cleanup_logs.sh
├── infra/
│   ├── nginx/
│   │   └── nginx.conf
│   ├── db/
│   │   └── init.sql
│   └── README.md
└── .gitignore
```

## Notes

- `backend/` should contain all API logic, data models, services, and tests.
- `frontend/` should focus on the Calendar module with facility-oriented reservation UX.
- `docs/` stores architecture, API, and sprint planning documentation.
- `scripts/` supports development automation, database seeding, and test execution.
- `infra/` contains deployment and database initialization artifacts.
