# Backend (FastAPI)

## Prerequisites
- Python 3.10+
- MongoDB running locally on `mongodb://localhost:27017`

## Setup (PowerShell)
```powershell
cd D:\OPTO-PROFIT\backend
python -m venv venv
.\venv\Scripts\Activate.ps1
pip install fastapi uvicorn motor pymongo pydantic
pip install -r requirements.txt
```

## Run API (PowerShell)
```powershell
cd D:\OPTO-PROFIT\backend
.\venv\Scripts\Activate.ps1
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

The API reads `MONGODB_URI` (default: `mongodb://localhost:27017`).

## API Health Check
```powershell
curl http://localhost:8000/api/status
```

## Authentication Flow
1. Register or login to receive a bearer token.
2. Send `Authorization: Bearer <token>` on protected API calls.

Register:
```powershell
curl -Method POST http://localhost:8000/api/auth/register `
  -ContentType "application/json" `
  -Body '{"username":"engineer_01","password":"StrongPass123"}'
```

Login:
```powershell
curl -Method POST http://localhost:8000/api/auth/login `
  -ContentType "application/json" `
  -Body '{"username":"engineer_01","password":"StrongPass123"}'
```

Current user:
```powershell
curl -Method GET http://localhost:8000/api/auth/me `
  -Headers @{ Authorization = "Bearer <access_token>" }
```

## Run Data Migration
Default file path:
```powershell
cd D:\OPTO-PROFIT\backend
.\venv\Scripts\Activate.ps1
python .\scripts\migrate.py
```

Custom file path:
```powershell
cd D:\OPTO-PROFIT\backend
.\venv\Scripts\Activate.ps1
python .\scripts\migrate.py .\scripts\data_export.json
```
