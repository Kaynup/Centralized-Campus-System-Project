Progress update — implemented service & API wiring

Completed in codebase:

- Implemented utility modules:
  - `backend/app/utils/time_utils.py` (hours/refund/slot gen)
  - `backend/app/utils/role_helpers.py`
  - `backend/app/utils/exceptions.py` (already present)

- Implemented service layer:
  - `backend/app/services/user_service.py`
  - `backend/app/services/facility_service.py`
  - `backend/app/services/booking_service.py`
  - `backend/app/services/approval_service.py`
  - `backend/app/services/cancellation_service.py`

- Implemented API routers (basic wiring):
  - `backend/app/api/v1/bookings.py`
  - `backend/app/api/v1/approvals.py`
  - `backend/app/api/v1/facilities.py`
  - `backend/app/api/v1/tokens.py`

Notes:
- I attempted to run tests but the environment in this session does not have pytest available. To run tests locally:

```bash
cd backend
python -m venv venv
# Windows
venv\Scripts\activate
pip install -r requirements.txt
pytest -q
```

Next steps:
- Run tests locally and share failures; I'll fix them iteratively.
- Add more robust error handling and response models where needed.
- Update `dev_space/final_tasks/TASKS_1.md` to mark these items as completed once you confirm tests pass.
