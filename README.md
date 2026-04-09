# PayVault — Setup Guide

A payment interface + expense management SaaS built with **FastAPI (Python)** + **React**.

---

## Project Structure

```
payvault/
├── backend_main.py      ← FastAPI backend
├── payvault-ui/         ← React frontend (Create React App)
│   └── src/
│       └── App.jsx      ← React component
└── README.md
```

---

## 1. Backend — FastAPI (Python)

### Install dependencies
```bash
pip install fastapi uvicorn "python-jose[cryptography]" "passlib[bcrypt]" python-multipart
```

### Run the server
```bash
uvicorn backend_main:app --reload --port 8000
```

API will be live at **http://localhost:8000**  
Swagger docs at **http://localhost:8000/docs**

---

## 2. Frontend — React

### Option A: Create React App
```bash
npx create-react-app payvault-ui
cd payvault-ui
npm install
```

Copy the App.jsx code into `src/App.jsx` (it's already there).

Run the app:
```bash
npm start
```
```

Then:
```bash
npm run dev
```

Frontend at **http://localhost:5173**

### Option B: Create React App
```bash
npx create-react-app payvault-ui
cd payvault-ui
npm start
```

Copy `PayVault.jsx` → `src/App.jsx` (replace existing content).

---

## Demo Login

| Field    | Value               |
|----------|---------------------|
| Email    | rohit@payvault.com   |
| Password | demo1234            |

Other demo accounts available:
- priya@payvault.com
- teena@payvault.com
- sneha@payvault.com
- akankshya@payvault.com
(All with password: demo1234)

---

## API Endpoints

| Method | Endpoint                  | Description              |
|--------|---------------------------|--------------------------|
| POST   | /api/auth/register        | Create new account       |
| POST   | /api/auth/login           | Login (returns JWT)      |
| GET    | /api/auth/me              | Get current user         |
| GET    | /api/wallet               | Wallet balance & stats   |
| POST   | /api/pay                  | Send payment via UPI     |
| GET    | /api/transactions         | List all transactions    |
| POST   | /api/transactions         | Add manual transaction   |
| DELETE | /api/transactions/{id}    | Delete a transaction     |
| GET    | /api/contacts             | Get frequent contacts    |
| GET    | /api/analytics            | Spending analytics       |

---

## Production Notes

- Replace the in-memory `USERS_DB` / `TRANSACTIONS_DB` with **PostgreSQL** via SQLAlchemy or **SQLite** via Tortoise ORM
- Replace `SECRET_KEY` with an environment variable (`os.getenv("SECRET_KEY")`)
- Add HTTPS and set `CORS` origins to your actual domain
- For real UPI integration, connect to **Razorpay**, **PayU**, or the NPCI sandbox
