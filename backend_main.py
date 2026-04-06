"""
PayVault — FastAPI Backend
Run:  uvicorn backend_main:app --reload --port 8000
Deps: pip install fastapi uvicorn python-jose[cryptography] passlib[bcrypt] python-multipart
"""

from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from pydantic import BaseModel, EmailStr
from passlib.context import CryptContext
from jose import JWTError, jwt
from datetime import datetime, timedelta
from typing import Optional, List
import uuid

# ─── Config ────────────────────────────────────────────────────────────────────
SECRET_KEY = "payvault-super-secret-key-change-in-production"
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24  # 24 hours

app = FastAPI(title="PayVault API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

pwd_context = CryptContext(schemes=["pbkdf2_sha256"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login")

# ─── In-Memory DB (swap with PostgreSQL/SQLite in prod) ────────────────────────
USERS_DB: dict = {}
TRANSACTIONS_DB: dict = {}   # keyed by user_id
CONTACTS_DB: dict = {}       # keyed by user_id

# Seed demo users
_demo_id = "demo-user-001"
USERS_DB["alex@payvault.com"] = {
    "id": _demo_id,
    "name": "Alex Johnson",
    "email": "alex@payvault.com",
    "hashed_password": pwd_context.hash("demo1234"),
    "balance": 124500.00,
    "avatar": "AJ",
    "phone": "+91 98765 43210",
    "upi_id": "alex@payvault",
    "joined": "2023-08-15",
}

_priya_id = "demo-user-002"
USERS_DB["priya@payvault.com"] = {
    "id": _priya_id,
    "name": "Priya Sharma",
    "email": "priya@payvault.com",
    "hashed_password": pwd_context.hash("demo1234"),
    "balance": 75000.00,
    "avatar": "PS",
    "phone": "+91 98765 43211",
    "upi_id": "priya@payvault",
    "joined": "2023-09-20",
}

_rahul_id = "demo-user-003"
USERS_DB["rahul@payvault.com"] = {
    "id": _rahul_id,
    "name": "Rahul Mehta",
    "email": "rahul@payvault.com",
    "hashed_password": pwd_context.hash("demo1234"),
    "balance": 95000.00,
    "avatar": "RM",
    "phone": "+91 98765 43212",
    "upi_id": "rahul@payvault",
    "joined": "2023-10-05",
}

_sneha_id = "demo-user-004"
USERS_DB["sneha@payvault.com"] = {
    "id": _sneha_id,
    "name": "Sneha Kapoor",
    "email": "sneha@payvault.com",
    "hashed_password": pwd_context.hash("demo1234"),
    "balance": 60000.00,
    "avatar": "SK",
    "phone": "+91 98765 43213",
    "upi_id": "sneha@payvault",
    "joined": "2023-11-10",
}

_arjun_id = "demo-user-005"
USERS_DB["arjun@payvault.com"] = {
    "id": _arjun_id,
    "name": "Arjun Nair",
    "email": "arjun@payvault.com",
    "hashed_password": pwd_context.hash("demo1234"),
    "balance": 80000.00,
    "avatar": "AN",
    "phone": "+91 98765 43214",
    "upi_id": "arjun@payvault",
    "joined": "2023-12-15",
}
TRANSACTIONS_DB[_demo_id] = [
    {"id": "t1", "type": "credit", "category": "Income",     "description": "Salary — April",     "amount": 85000, "to_from": "Employer",     "date": "2024-04-01", "status": "completed"},
    {"id": "t2", "type": "debit",  "category": "Food",       "description": "Swiggy Order",        "amount": 320,   "to_from": "Swiggy",       "date": "2024-04-05", "status": "completed"},
    {"id": "t3", "type": "debit",  "category": "Transport",  "description": "Uber Ride",           "amount": 180,   "to_from": "Uber",         "date": "2024-04-04", "status": "completed"},
    {"id": "t4", "type": "debit",  "category": "Entertainment","description": "Netflix Premium",   "amount": 649,   "to_from": "Netflix",      "date": "2024-04-03", "status": "completed"},
    {"id": "t5", "type": "debit",  "category": "Utilities",  "description": "Electricity Bill",   "amount": 2100,  "to_from": "BESCOM",       "date": "2024-04-03", "status": "completed"},
    {"id": "t6", "type": "credit", "category": "Transfer",   "description": "Payment from Priya", "amount": 5000,  "to_from": "Priya Sharma", "date": "2024-04-02", "status": "completed"},
    {"id": "t7", "type": "debit",  "category": "Shopping",   "description": "Amazon Order",       "amount": 3200,  "to_from": "Amazon",       "date": "2024-04-04", "status": "completed"},
    {"id": "t8", "type": "debit",  "category": "Health",     "description": "Gym Membership",     "amount": 1500,  "to_from": "Cult Fit",     "date": "2024-04-02", "status": "completed"},
]
CONTACTS_DB[_demo_id] = [
    {"id": "c1", "name": "Priya Sharma",  "upi": "priya@payvault",  "avatar": "PS", "color": "#6366f1"},
    {"id": "c2", "name": "Rahul Mehta",   "upi": "rahul@payvault",  "avatar": "RM", "color": "#f59e0b"},
    {"id": "c3", "name": "Sneha Kapoor",  "upi": "sneha@payvault",  "avatar": "SK", "color": "#10b981"},
    {"id": "c4", "name": "Arjun Nair",    "upi": "arjun@payvault",  "avatar": "AN", "color": "#ef4444"},
]

# Transactions for Priya
TRANSACTIONS_DB[_priya_id] = [
    {"id": "p1", "type": "credit", "category": "Income",     "description": "Freelance Payment", "amount": 25000, "to_from": "Client",       "date": "2024-04-01", "status": "completed"},
    {"id": "p2", "type": "debit",  "category": "Food",       "description": "Restaurant Bill",   "amount": 800,   "to_from": "Dominos",      "date": "2024-04-05", "status": "completed"},
    {"id": "p3", "type": "debit",  "category": "Shopping",   "description": "Clothes Shopping",  "amount": 5000,  "to_from": "Myntra",       "date": "2024-04-04", "status": "completed"},
    {"id": "p4", "type": "debit",  "category": "Transfer",   "description": "Payment to Alex",   "amount": 5000,  "to_from": "Alex Johnson", "date": "2024-04-02", "status": "completed"},
]

CONTACTS_DB[_priya_id] = [
    {"id": "c1", "name": "Alex Johnson",  "upi": "alex@payvault",  "avatar": "AJ", "color": "#6366f1"},
    {"id": "c2", "name": "Rahul Mehta",   "upi": "rahul@payvault", "avatar": "RM", "color": "#f59e0b"},
]

# Transactions for Rahul
TRANSACTIONS_DB[_rahul_id] = [
    {"id": "r1", "type": "credit", "category": "Income",     "description": "Salary — April",     "amount": 70000, "to_from": "Company",      "date": "2024-04-01", "status": "completed"},
    {"id": "r2", "type": "debit",  "category": "Transport",  "description": "Fuel",              "amount": 2000,  "to_from": "Petrol Pump",  "date": "2024-04-05", "status": "completed"},
    {"id": "r3", "type": "debit",  "category": "Entertainment","description": "Movie Tickets",   "amount": 600,   "to_from": "PVR",          "date": "2024-04-04", "status": "completed"},
]

CONTACTS_DB[_rahul_id] = [
    {"id": "c1", "name": "Alex Johnson",  "upi": "alex@payvault",  "avatar": "AJ", "color": "#6366f1"},
    {"id": "c2", "name": "Priya Sharma",  "upi": "priya@payvault", "avatar": "PS", "color": "#10b981"},
]

# Transactions for Sneha
TRANSACTIONS_DB[_sneha_id] = [
    {"id": "s1", "type": "credit", "category": "Income",     "description": "Business Income",    "amount": 30000, "to_from": "Business",     "date": "2024-04-01", "status": "completed"},
    {"id": "s2", "type": "debit",  "category": "Utilities",  "description": "Internet Bill",     "amount": 1200,  "to_from": "Airtel",       "date": "2024-04-05", "status": "completed"},
]

CONTACTS_DB[_sneha_id] = [
    {"id": "c1", "name": "Alex Johnson",  "upi": "alex@payvault",  "avatar": "AJ", "color": "#6366f1"},
]

# Transactions for Arjun
TRANSACTIONS_DB[_arjun_id] = [
    {"id": "a1", "type": "credit", "category": "Income",     "description": "Consulting Fee",     "amount": 40000, "to_from": "Client",       "date": "2024-04-01", "status": "completed"},
    {"id": "a2", "type": "debit",  "category": "Health",     "description": "Doctor Visit",       "amount": 1500,  "to_from": "Hospital",     "date": "2024-04-05", "status": "completed"},
]

CONTACTS_DB[_arjun_id] = [
    {"id": "c1", "name": "Alex Johnson",  "upi": "alex@payvault",  "avatar": "AJ", "color": "#6366f1"},
]

# ─── Schemas ───────────────────────────────────────────────────────────────────
class UserRegister(BaseModel):
    name: str
    email: str
    password: str
    phone: Optional[str] = ""

class Token(BaseModel):
    access_token: str
    token_type: str
    user: dict

class PaymentRequest(BaseModel):
    recipient_upi: str
    recipient_name: str
    amount: float
    note: Optional[str] = ""
    category: Optional[str] = "Transfer"

class ExpenseCreate(BaseModel):
    description: str
    amount: float
    category: str
    type: str   # "debit" | "credit"
    date: Optional[str] = None

class BudgetUpdate(BaseModel):
    category: str
    limit: float

# ─── Helpers ───────────────────────────────────────────────────────────────────
def hash_password(pw: str) -> str:
    return pwd_context.hash(pw)

def verify_password(plain: str, hashed: str) -> bool:
    return pwd_context.verify(plain, hashed)

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    to_encode = data.copy()
    expire = datetime.utcnow() + (expires_delta or timedelta(minutes=15))
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)

def get_current_user(token: str = Depends(oauth2_scheme)):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        email: str = payload.get("sub")
        if email is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception
    user = USERS_DB.get(email)
    if user is None:
        raise credentials_exception
    return user

# ─── Auth Routes ───────────────────────────────────────────────────────────────
@app.post("/api/auth/register", response_model=Token)
def register(data: UserRegister):
    if data.email in USERS_DB:
        raise HTTPException(status_code=400, detail="Email already registered")
    uid = str(uuid.uuid4())
    initials = "".join(w[0].upper() for w in data.name.split()[:2])
    user = {
        "id": uid,
        "name": data.name,
        "email": data.email,
        "hashed_password": hash_password(data.password),
        "balance": 10000.00,  # welcome balance
        "avatar": initials,
        "phone": data.phone,
        "upi_id": f"{data.name.split()[0].lower()}@payvault",
        "joined": datetime.utcnow().strftime("%Y-%m-%d"),
    }
    USERS_DB[data.email] = user
    TRANSACTIONS_DB[uid] = []
    CONTACTS_DB[uid] = []
    token = create_access_token({"sub": data.email}, timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES))
    safe_user = {k: v for k, v in user.items() if k != "hashed_password"}
    return {"access_token": token, "token_type": "bearer", "user": safe_user}

@app.post("/api/auth/login", response_model=Token)
def login(form_data: OAuth2PasswordRequestForm = Depends()):
    user = USERS_DB.get(form_data.username)
    if not user or not verify_password(form_data.password, user["hashed_password"]):
        raise HTTPException(status_code=401, detail="Incorrect email or password")
    token = create_access_token({"sub": form_data.username}, timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES))
    safe_user = {k: v for k, v in user.items() if k != "hashed_password"}
    return {"access_token": token, "token_type": "bearer", "user": safe_user}

@app.get("/api/auth/me")
def get_me(current_user=Depends(get_current_user)):
    return {k: v for k, v in current_user.items() if k != "hashed_password"}

# ─── Wallet / Balance ──────────────────────────────────────────────────────────
@app.get("/api/wallet")
def get_wallet(current_user=Depends(get_current_user)):
    uid = current_user["id"]
    txns = TRANSACTIONS_DB.get(uid, [])
    total_in  = sum(t["amount"] for t in txns if t["type"] == "credit")
    total_out = sum(t["amount"] for t in txns if t["type"] == "debit")
    return {
        "balance": current_user["balance"],
        "total_in": total_in,
        "total_out": total_out,
        "upi_id": current_user["upi_id"],
    }

# ─── Payments ─────────────────────────────────────────────────────────────────
@app.post("/api/pay")
def send_payment(req: PaymentRequest, current_user=Depends(get_current_user)):
    if req.amount <= 0:
        raise HTTPException(status_code=400, detail="Amount must be positive")
    if current_user["balance"] < req.amount:
        raise HTTPException(status_code=400, detail="Insufficient balance")

    uid = current_user["id"]
    # Deduct from sender
    USERS_DB[current_user["email"]]["balance"] -= req.amount

    txn = {
        "id": f"txn-{uuid.uuid4().hex[:8]}",
        "type": "debit",
        "category": req.category,
        "description": req.note or f"Payment to {req.recipient_name}",
        "amount": req.amount,
        "to_from": req.recipient_name,
        "date": datetime.utcnow().strftime("%Y-%m-%d"),
        "status": "completed",
    }
    TRANSACTIONS_DB.setdefault(uid, []).insert(0, txn)

    # Credit recipient if they exist
    for email, user in USERS_DB.items():
        if user.get("upi_id") == req.recipient_upi:
            USERS_DB[email]["balance"] += req.amount
            credit_txn = {
                "id": f"txn-{uuid.uuid4().hex[:8]}",
                "type": "credit",
                "category": req.category,
                "description": f"Payment from {current_user['name']}",
                "amount": req.amount,
                "to_from": current_user["name"],
                "date": datetime.utcnow().strftime("%Y-%m-%d"),
                "status": "completed",
            }
            TRANSACTIONS_DB.setdefault(user["id"], []).insert(0, credit_txn)

    return {"success": True, "transaction": txn, "new_balance": USERS_DB[current_user["email"]]["balance"]}

# ─── Transactions / Expenses ───────────────────────────────────────────────────
@app.get("/api/transactions")
def get_transactions(current_user=Depends(get_current_user)):
    uid = current_user["id"]
    return TRANSACTIONS_DB.get(uid, [])

@app.post("/api/transactions")
def add_transaction(exp: ExpenseCreate, current_user=Depends(get_current_user)):
    uid = current_user["id"]
    txn = {
        "id": f"txn-{uuid.uuid4().hex[:8]}",
        "type": exp.type,
        "category": exp.category,
        "description": exp.description,
        "amount": exp.amount,
        "to_from": "Manual Entry",
        "date": exp.date or datetime.utcnow().strftime("%Y-%m-%d"),
        "status": "completed",
    }
    # Update balance
    if exp.type == "credit":
        USERS_DB[current_user["email"]]["balance"] += exp.amount
    else:
        USERS_DB[current_user["email"]]["balance"] -= exp.amount

    TRANSACTIONS_DB.setdefault(uid, []).insert(0, txn)
    return txn

@app.delete("/api/transactions/{txn_id}")
def delete_transaction(txn_id: str, current_user=Depends(get_current_user)):
    uid = current_user["id"]
    txns = TRANSACTIONS_DB.get(uid, [])
    original = next((t for t in txns if t["id"] == txn_id), None)
    if not original:
        raise HTTPException(status_code=404, detail="Transaction not found")
    # Reverse balance
    if original["type"] == "credit":
        USERS_DB[current_user["email"]]["balance"] -= original["amount"]
    else:
        USERS_DB[current_user["email"]]["balance"] += original["amount"]
    TRANSACTIONS_DB[uid] = [t for t in txns if t["id"] != txn_id]
    return {"deleted": True}

# ─── Contacts ─────────────────────────────────────────────────────────────────
@app.get("/api/contacts")
def get_contacts(current_user=Depends(get_current_user)):
    return CONTACTS_DB.get(current_user["id"], [])

# ─── Analytics ────────────────────────────────────────────────────────────────
@app.get("/api/analytics")
def get_analytics(current_user=Depends(get_current_user)):
    uid = current_user["id"]
    txns = TRANSACTIONS_DB.get(uid, [])
    by_category: dict = {}
    for t in txns:
        if t["type"] == "debit":
            cat = t["category"]
            by_category[cat] = by_category.get(cat, 0) + t["amount"]
    total_spent = sum(by_category.values())
    return {
        "by_category": by_category,
        "total_spent": total_spent,
        "total_received": sum(t["amount"] for t in txns if t["type"] == "credit"),
        "transaction_count": len(txns),
    }

# ─── Health ────────────────────────────────────────────────────────────────────
@app.get("/api/health")
def health():
    return {"status": "ok", "service": "PayVault API"}
