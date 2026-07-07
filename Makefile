# Database Initialization
init-db:
	@echo "Initializing database..."
	bash -c "cd backends && source centralized_core/venv/bin/activate && python init_db.py"

# Backend Services
start-backend-core:
	bash -c "cd backends/centralized_core && source venv/bin/activate && uvicorn main:app --port 8000 --reload"

start-backend-equipment:
	bash -c "cd backends/equipment && source venv/bin/activate && uvicorn main:app --port 8001 --reload"

start-backend-facility:
	bash -c "cd backends/facility && source venv/bin/activate && uvicorn app.main:app --port 8002 --reload"

start-backend-marketplace:
	bash -c "cd backends/marketplace && source venv/bin/activate && uvicorn main:app --port 8003 --reload"

# Frontend Service
start-frontend:
	bash -c "cd frontend && npm run dev"

# Testing Services
test-all: test-backend-core test-backend-equipment test-backend-facility test-backend-marketplace

test-backend-core:
	@echo "Running tests for Centralized Core..."
	bash -c "cd backends/centralized_core && source venv/bin/activate && pytest"

test-backend-equipment:
	@echo "Running tests for Equipment Backend..."
	bash -c "cd backends/equipment && source venv/bin/activate && pytest"

test-backend-facility:
	@echo "Running tests for Facility Backend..."
	bash -c "cd backends/facility && source venv/bin/activate && pytest"

test-backend-marketplace:
	@echo "Running tests for Marketplace Backend..."
	bash -c "cd backends/marketplace && source venv/bin/activate && pytest"

# Installation Utilities
install-all:
	@echo "Installing Centralized Core dependencies..."
	bash -c "cd backends/centralized_core && python3 -m venv venv && source venv/bin/activate && pip install -r requirements.txt"
	@echo "Installing Equipment dependencies..."
	bash -c "cd backends/equipment && python3 -m venv venv && source venv/bin/activate && pip install -r requirements.txt"
	@echo "Installing Facility dependencies..."
	bash -c "cd backends/facility && python3 -m venv venv && source venv/bin/activate && pip install -r requirements.txt"
	@echo "Installing Marketplace dependencies..."
	bash -c "cd backends/marketplace && python3 -m venv venv && source venv/bin/activate && pip install -r requirements.txt"
	@echo "Installing Frontend dependencies..."
	bash -c "cd frontend && npm install"
	@echo "All installations complete!"