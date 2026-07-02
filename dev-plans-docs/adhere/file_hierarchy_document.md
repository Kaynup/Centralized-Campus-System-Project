# Centralized System File Hierarchy - Detailed Master Document

This is the fully detailed and comprehensive directory structure for the unified `Main-Centralized-Application`. It maps every expected file and folder across the 4 backend microservices and the unified React SPA frontend.

## 1. Root Directory Structure

```text
/ (Project Root)
├── backends/                         # Contains all 4 backend microservices for the centralized system
│   ├── centralized_core/             # The core service for Auth, Users, and Wallets (Port 8000)
│   ├── equipment/                    # The domain service for Equipment Rental (Port 8001)
│   ├── facility/                     # The domain service for Facility Reservation (Port 8002)
│   └── marketplace/                  # The domain service for Secure Marketplace (Port 8003)
├── frontend/                         # Contains the Single React SPA connecting to all 4 backends
│   ├── src/                          # The main source code directory for React
│   ├── public/                       # Static public assets (Favicon, logos)
│   ├── index.html                    # The HTML template for the React App
│   ├── vite.config.js                # Build configuration for Vite bundler
│   ├── package-lock.json             # Locked dependency tree for npm
│   └── package.json                  # Frontend dependencies and npm scripts
├── .env                              # Global environment variables (DB URLs, Ports, Shared Secrets)
├── README.md                         # Central documentation and setup instructions for developers
└── docker-compose.yml                # Docker orchestration file to spin up all 4 services and the DB
```

---

## 2. Frontend SPA Detailed Hierarchy (`frontend/`)
*Technology: React 19, Vite, Tailwind v4, React Router v7*

```text
frontend/
├── public/
│   ├── vite.svg                      # Default Vite logo asset
│   └── favicon.ico                   # Application favicon
├── src/
│   ├── components/                   # Global components used across the app shell
│   │   └── layout/                   # Layout wrappers and navigation components
│   │       ├── AppShell.jsx          # Main application wrapper handling layout states
│   │       ├── AppShell.css          # Styling specific to the App Shell
│   │       ├── Navbar.jsx            # Top navigation bar for user profile and notifications
│   │       ├── Sidebar.jsx           # Side navigation for routing between modules
│   │       ├── BottomNav.jsx         # Mobile-friendly bottom navigation bar
│   │       └── PageHeader.jsx        # Reusable header component for page titles
│   ├── modules/                      # Isolated business domains (strictly segregated)
│   │   ├── equipment-rental/         # Equipment Rental specific code
│   │   │   ├── pages/                # Views specific to equipment
│   │   │   │   ├── EquipmentList.jsx # Page displaying all available equipment
│   │   │   │   └── EquipmentDetail.jsx # Detailed view of a single equipment item
│   │   │   ├── components/           # Components unique to equipment
│   │   │   │   └── EquipmentCard.jsx # Card component showing equipment summary
│   │   │   └── api/                  # API calls for equipment domain
│   │   │       └── equipmentService.js # Axios calls to Port 8001
│   │   ├── facility-reservation/     # Facility Reservation specific code
│   │   │   ├── pages/                # Views specific to facilities
│   │   │   │   ├── FacilityList.jsx  # Page displaying bookable facilities
│   │   │   │   ├── FacilityDetail.jsx# Detailed view of a facility
│   │   │   │   └── BookingCalendar.jsx # Interactive calendar for reservations
│   │   │   ├── components/           # Components unique to facility
│   │   │   │   └── RoomCard.jsx      # Card component showing room details
│   │   │   └── api/                  # API calls for facility domain
│   │   │       └── facilityService.js# Axios calls to Port 8002
│   │   └── secure-marketplace/       # Secure Marketplace specific code
│   │       ├── pages/                # Views specific to marketplace
│   │       │   ├── Marketplace.jsx   # Main marketplace storefront
│   │       │   ├── ItemDetail.jsx    # View for a specific listed item
│   │       │   ├── ListItem.jsx      # Form page to create a new listing
│   │       │   ├── MyListings.jsx    # Dashboard for user's own items
│   │       │   └── Purchases.jsx     # History of items bought
│   │       ├── components/           # Components unique to marketplace
│   │       │   ├── ItemCard.jsx      # Card component for marketplace items
│   │       │   └── CategoryChips.jsx # Filter chips for item categories
│   │       ├── admin/                # Admin specific views for moderation
│   │       │   ├── AdminDashboard.jsx# Main admin overview
│   │       │   ├── AdminListings.jsx # Table for moderating listings
│   │       │   └── AdminReports.jsx  # View for flagged items/users
│   │       └── api/                  # API calls for marketplace domain
│   │           └── marketplaceService.js # Axios calls to Port 8003
│   ├── shared/                       # Cross-module resources and utilities
│   │   ├── context/                  # React Context providers for global state
│   │   │   ├── AuthContext.jsx       # Manages JWT tokens and user login state
│   │   │   ├── WalletContext.jsx     # Manages user balance and transactions globally
│   │   │   └── ThemeContext.jsx      # Manages Light/Dark mode toggling
│   │   ├── hooks/                    # Custom React hooks
│   │   │   ├── useAuth.js            # Hook to easily access AuthContext
│   │   │   └── useWallet.js          # Hook to easily access WalletContext
│   │   ├── api/                      # Global API configuration
│   │   │   ├── axiosClient.js        # Axios instance configured with interceptors for multi-ports
│   │   │   └── endpoints.js          # Centralized dictionary of all API routes
│   │   └── ui/                       # Reusable pure UI Elements (Design System)
│   │       ├── Button.jsx            # Standardized button component
│   │       ├── Modal.jsx             # Standardized modal/dialog component
│   │       ├── Toast.jsx             # Notification popup component
│   │       ├── Loader.jsx            # Loading spinner component
│   │       ├── EmptyState.jsx        # Fallback UI for empty lists
│   │       ├── BalanceCard.jsx       # Component showing wallet balance
│   │       └── StatusBadge.jsx       # Colored badge for status (Active/Pending)
│   ├── pages/                        # Top-level shared pages (not module specific)
│   │   ├── Login.jsx                 # Centralized login page
│   │   ├── Dashboard.jsx             # Landing page after successful login
│   │   ├── Profile.jsx               # User profile management page
│   │   ├── Wallet.jsx                # Wallet dashboard and top-up page
│   │   ├── Messages.jsx              # Global messaging inbox
│   │   └── Notifications.jsx         # Global notifications view
│   ├── routes/                       # Routing logic and guards
│   │   └── ProtectedRoute.jsx        # Wrapper to enforce authentication on private routes
│   ├── styles/                       # CSS architecture
│   │   ├── globals.css               # Base CSS resets and global rules
│   │   ├── variables.css             # CSS variables for colors, spacing, etc.
│   │   └── components.css            # Styles for specific legacy components
│   ├── App.jsx                       # Core router configuration tying all modules together
│   ├── main.jsx                      # React application mount point
│   └── index.css                     # Main stylesheet importing Tailwind utilities
├── vite.config.js                    # Vite server and plugin configuration
├── eslint.config.js                  # Linter rules for code quality
└── package.json                      # Dependency list and npm scripts
```

---

## 3. Detailed Backend Microservice Hierarchies

### A. Centralized Core Service (`backends/centralized_core/`)
*Port: 8000 | Responsibilities: Users, Auth, Wallets, Global Sessions*

```text
backends/centralized_core/
├── main.py                           # Application entry point for Core API
├── database.py                       # DB connection setup pointing to shared users/wallets tables
├── models.py                         # SQLAlchemy models for User, Wallet, Transaction
├── schemas.py                        # Pydantic validation schemas for input/output data
├── routers/                          # API endpoint groupings
│   ├── auth_routes.py                # Endpoints for Login, Signup, and Token Refresh
│   ├── user_routes.py                # Endpoints for fetching and updating user profiles
│   └── wallet_routes.py              # Endpoints for adding funds and checking balance
├── services/                         # Business logic layer
│   ├── auth_service.py               # Logic for JWT generation, password hashing, validation
│   └── wallet_service.py             # Logic for atomic balance deductions and credits
├── .env                              # Local environment variables (JWT Secret, Port 8000)
└── requirements.txt                  # Python dependencies (FastAPI, PyJWT, passlib)
```

### B. Equipment Service (`backends/equipment/`)
*Port: 8001 | Tech: FastAPI, mysql-connector-python*

```text
backends/equipment/
├── main.py                           # Application entry point for Equipment API
├── database.py                       # DB connection logic using raw mysql-connector-python
├── models.py                         # Pydantic schemas representing Equipment data structures
├── routes/                           # API endpoint groupings
│   └── equipment_routes.py           # Endpoints for renting and returning equipment
├── scheduler.py                      # Background jobs to track overdue equipment rentals
├── logging_config.py                 # Custom logging formatter for debugging
├── .env                              # Local environment variables (Port 8001)
└── requirements.txt                  # Python dependencies (FastAPI, mysql-connector)
```

### C. Facility Service (`backends/facility/`)
*Port: 8002 | Tech: FastAPI, SQLAlchemy, Alembic*

```text
backends/facility/
├── app/
│   ├── main.py                       # Application entry point for Facility API
│   ├── db.py                         # SQLAlchemy SessionLocal and engine setup
│   ├── models.py                     # SQLAlchemy ORM models (Facilities, Bookings, TimeSlots)
│   ├── schemas.py                    # Pydantic validation schemas for facility data
│   ├── routers/                      # API endpoint groupings
│   │   ├── facilities.py             # Endpoints for browsing facilities
│   │   └── reservations.py           # Endpoints for creating and managing bookings
│   ├── services.py                   # Business logic for double-booking prevention
│   ├── envelope.py                   # Helper functions for standardizing JSON responses
│   └── logger.py                     # Custom logger configuration
├── alembic/                          # Folder containing database migration logic
│   ├── versions/                     # Generated SQL migration scripts
│   └── env.py                        # Alembic environment setup for SQLAlchemy
├── alembic.ini                       # Alembic configuration file (DB URL mapping)
├── .env                              # Local environment variables (Port 8002)
└── pyproject.toml                    # Poetry/Pip tool configuration and dependency list
```

### D. Marketplace Service (`backends/marketplace/`)
*Port: 8003 | Tech: FastAPI, mysql-connector-python*

```text
backends/marketplace/
├── main.py                           # Application entry point for Marketplace API
├── db.py                             # DB connection logic using raw mysql-connector-python
├── models.py                         # Data models representing Items, Orders, and Reviews
├── schemas.py                        # Pydantic validation schemas for marketplace payloads
├── routers/                          # API endpoint groupings
│   ├── items.py                      # Endpoints for listing and browsing marketplace items
│   ├── orders.py                     # Endpoints for placing and viewing orders
│   └── reviews.py                    # Endpoints for rating sellers and items
├── services.py                       # Business logic for order fulfillment and escrow
├── admin/                            # Administrative operations
│   └── admin_routes.py               # Endpoints for moderation and banning
├── static/                           # Directory storing uploaded item images locally
├── scripts/                          # Utility scripts for database management
│   ├── create_admin.py               # CLI tool to create an admin user
│   ├── seed_items.py                 # Script to populate database with mock marketplace items
│   └── seed_users.py                 # Script to populate database with mock users
├── envelope.py                       # Helper functions for standardizing JSON responses
├── logger.py                         # Custom logger configuration
├── .env                              # Local environment variables (Port 8003)
└── requirements.txt                  # Python dependencies (FastAPI, mysql-connector)
```
