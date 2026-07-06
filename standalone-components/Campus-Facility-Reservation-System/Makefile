# Frontend
start-frontend-dev:
	bash -c "cd frontend && npm run dev -- --port 5173"

start-frontend-prod:
	bash -c "cd frontend && npm run build && npm run preview -- --port 4173"

test-frontend:
	bash -c "cd frontend && npm run test"

# Backend
start-backend:
	bash -c "source venv/bin/activate && pip install -r requirements.txt && cd backend && uvicorn app.main:app --reload"

test-backend:
	bash -c "source venv/bin/activate && cd backend && PYTHONPATH=. pytest -v"

# Database
open-db:
	bash -c "sudo mysql -u root -p"

start-db:
	bash -c "sudo systemctl start mysql || sudo service mysql start"

stop-db:
	bash -c "sudo systemctl stop mysql || sudo service mysql stop"

status-db:
	bash -c "sudo systemctl status mysql || sudo service mysql status"

# One time runs
create-schema:
	bash -c "source venv/bin/activate && cd backend && python -c 'from app.db.base import Base; from app.db.session import engine; Base.metadata.create_all(bind=engine); print(\"Database schema created\")'"

seed-db-punyak:
	bash -c "source venv/bin/activate && python scripts/seed_data_punyak.py --reset"

# Common tests
test-all: test-backend test-frontend
