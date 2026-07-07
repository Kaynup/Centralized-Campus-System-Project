# .PHONY:

# Backend
start-backend-core:
	bash -c "cd backends/centralized_core && source venv/bin/activate && uvicorn main:app --port 8000 --reload"

# Frontend
start-frontend:
	bash -c "cd frontend && npm run dev"