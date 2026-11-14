"""
PayVault — FastAPI Backend with SQLite
Run:  uvicorn backend_main:app --reload --port 8000
Deps: pip install fastapi uvicorn python-jose[cryptography] passlib[bcrypt] python-multipart sqlalchemy
"""

from fastapi import FastAPI, Depends, HTTPException, status, Header
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from pydantic import BaseModel
from passlib.context import CryptContext
from jose import JWTError, jwt
from datetime import datetime, timedelta
from typing import Optional
import uuid, os

from sqlalchemy import create_engine, Column, String, Float, Boolean, Text, ForeignKey
from sqlalchemy.engine import make_url
from sqlalchemy.orm import declarative_base, sessionmaker, Session

try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    pass

# ─── Config ────────────────────────────────────────────────────────────────────
SECRET_KEY = os.getenv("SECRET_KEY", "payvault-super-secret-key-change-in-production")
ADMIN_KEY  = os.getenv("ADMIN_KEY", "payvault-super-admin-key-change-in-production")
ALGORITHM  = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24

# ─── Database ──────────────────────────────────────────────────────────────────
DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./payvault.db")
if DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql+pg8000://", 1)
elif DATABASE_URL.startswith("postgresql://") and "+" not in DATABASE_URL:
    DATABASE_URL = DATABASE_URL.replace("postgresql://", "postgresql+pg8000://", 1)

connect_args = {"check_same_thread": False} if DATABASE_URL.startswith("sqlite") else {}

# Log only non-secret connection metadata to diagnose hosted database reachability.
# Never print DATABASE_URL, username, password, or query-string credentials.
db_url = make_url(DATABASE_URL)
if db_url.drivername.startswith("postgresql"):
    print(
        "[PayVault DB diagnostics] "
        f"driver={db_url.drivername} host={db_url.host!r} "
        f"port={db_url.port or 5432} "
        f"sslmode={db_url.query.get('sslmode', 'not specified')!r}",
        flush=True,
    )

engine = create_engine(DATABASE_URL, connect_args=connect_args)
SessionLocal = sessionmaker(bind=engine)
Base = declarative_base()

# ─── Models ────────────────────────────────────────────────────────────────────
class UserModel(Base):
    __tablename__ = "users"
    id              = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    name            = Column(String, nullable=False)
    email           = Column(String, unique=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    balance         = Column(Float, default=0.0)
    avatar          = Column(String, default="")
    phone           = Column(String, default="")
    upi_id          = Column(String, default="")
    joined          = Column(String, default="")

class TransactionModel(Base):
    __tablename__ = "transactions"
    id          = Column(String, primary_key=True, default=lambda: f"txn-{uuid.uuid4().hex[:8]}")
    user_id     = Column(String, ForeignKey("users.id"), nullable=False)
    type        = Column(String, nullable=False)
    category    = Column(String, default="Other")
    description = Column(String, nullable=False)
    amount      = Column(Float, nullable=False)
    to_from     = Column(String, default="")
    date        = Column(String, default="")
    status      = Column(String, default="completed")
    recurring   = Column(Boolean, default=False)

class ContactModel(Base):
    __tablename__ = "contacts"
    id      = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String, ForeignKey("users.id"), nullable=False)
    name    = Column(String, nullable=False)
    upi     = Column(String, default="")
    avatar  = Column(String, default="")
    color   = Column(String, default="#6366f1")

Base.metadata.create_all(bind=engine)

# ─── App ───────────────────────────────────────────────────────────────────────
app = FastAPI(title="PayVault API", version="2.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:5173", "https://payvault1.vercel.app"],
    # Allow this PayVault project's Vercel preview deployments as well as production.
    allow_origin_regex=r"https://payvault-[a-z0-9-]+-pharswanmohit07-cells-projects\.vercel\.app",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

pwd_context = CryptContext(schemes=["pbkdf2_sha256"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login")

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# ─── Helpers ───────────────────────────────────────────────────────────────────
def hash_password(pw): return pwd_context.hash(pw)
def verify_password(plain, hashed): return pwd_context.verify(plain, hashed)

# These accounts contain synthetic balances and transaction history for classroom demos.
# They are created only when ENABLE_DEMO_ACCOUNTS=true is set in the hosting environment.
DEMO_USERS = [
    {"key": "xyz", "name": "XYZ Demo", "email": "xyz@payvault.com", "password": "XYZ1234"},
    {"key": "alex", "name": "Alex Demo", "email": "alex@payvault.com", "password": "ALEX1234"},
    {"key": "sam", "name": "Sam Demo", "email": "sam@payvault.com", "password": "SAM1234"},
    {"key": "maya", "name": "Maya Demo", "email": "maya@payvault.com", "password": "MAYA1234"},
]

def seed_demo_accounts():
    enabled = os.getenv("ENABLE_DEMO_ACCOUNTS", "false").strip().lower() in {"1", "true", "yes", "on"}
    if not enabled:
        return

    db = SessionLocal()
    try:
        users = {}
        for item in DEMO_USERS:
            user = db.query(UserModel).filter(UserModel.email == item["email"]).first()
            if user is None:
                initials = "".join(part[0].upper() for part in item["name"].split()[:2])
                user = UserModel(
                    id=str(uuid.uuid4()),
                    name=item["name"],
                    email=item["email"],
                    hashed_password=hash_password(item["password"]),
                    balance=0.0,
                    avatar=initials,
                    phone="",
                    upi_id=f"{item['key']}@payvault",
                    joined=datetime.utcnow().strftime("%Y-%m-%d"),
                )
                db.add(user)
                db.flush()
            users[item["key"]] = user

        today = datetime.utcnow()
        demo_transactions = [
            # Opening balances
            ("demo-xyz-opening", "xyz", "credit", "Income", "Demo opening balance", 20000.0, "PayVault Demo", 14),
            ("demo-alex-opening", "alex", "credit", "Income", "Demo opening balance", 12000.0, "PayVault Demo", 14),
            ("demo-sam-opening", "sam", "credit", "Income", "Demo opening balance", 8500.0, "PayVault Demo", 14),
            ("demo-maya-opening", "maya", "credit", "Income", "Demo opening balance", 15000.0, "PayVault Demo", 14),
            # Sample everyday activity
            ("demo-xyz-utilities", "xyz", "debit", "Utilities", "Electricity bill", 3200.0, "City Utilities", 4),
            ("demo-alex-groceries", "alex", "debit", "Food", "Grocery shopping", 900.0, "Fresh Market", 3),
            ("demo-sam-entertainment", "sam", "debit", "Entertainment", "Movie tickets", 450.0, "Cinema", 3),
            ("demo-maya-shopping", "maya", "debit", "Shopping", "Shopping purchase", 1200.0, "Urban Store", 4),
            # Matched in-app transfers: each debit has a corresponding recipient credit.
            ("demo-xyz-alex-out", "xyz", "debit", "Transfer", "Demo transfer to Alex", 1800.0, "Alex Demo", 2),
            ("demo-xyz-alex-in", "alex", "credit", "Transfer", "Demo transfer from XYZ", 1800.0, "XYZ Demo", 2),
            ("demo-maya-xyz-out", "maya", "debit", "Transfer", "Demo transfer to XYZ", 950.0, "XYZ Demo", 1),
            ("demo-maya-xyz-in", "xyz", "credit", "Transfer", "Demo transfer from Maya", 950.0, "Maya Demo", 1),
            ("demo-sam-maya-out", "sam", "debit", "Transfer", "Demo transfer to Maya", 600.0, "Maya Demo", 2),
            ("demo-sam-maya-in", "maya", "credit", "Transfer", "Demo transfer from Sam", 600.0, "Sam Demo", 2),
            ("demo-alex-sam-out", "alex", "debit", "Transfer", "Demo transfer to Sam", 750.0, "Sam Demo", 1),
            ("demo-alex-sam-in", "sam", "credit", "Transfer", "Demo transfer from Alex", 750.0, "Alex Demo", 1),
        ]

        for txn_id, user_key, txn_type, category, description, amount, to_from, days_ago in demo_transactions:
            exists = db.query(TransactionModel).filter(TransactionModel.id == txn_id).first()
            if exists:
                continue
            txn_date = (today - timedelta(days=days_ago)).strftime("%Y-%m-%d")
            user = users[user_key]
            db.add(TransactionModel(
                id=txn_id,
                user_id=user.id,
                type=txn_type,
                category=category,
                description=description,
                amount=amount,
                to_from=to_from,
                date=txn_date,
                status="completed",
                recurring=False,
            ))
            if txn_type == "credit":
                user.balance = (user.balance or 0.0) + amount
            else:
                user.balance = (user.balance or 0.0) - amount

        db.commit()
        print("[PayVault] Demo accounts are enabled; synthetic demo data is ready.", flush=True)
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()

def create_access_token(data, expires_delta=None):
    to_encode = data.copy()
    expire = datetime.utcnow() + (expires_delta or timedelta(minutes=15))
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)

def user_to_dict(u):
    return {"id": u.id, "name": u.name, "email": u.email, "balance": u.balance,
            "avatar": u.avatar, "phone": u.phone, "upi_id": u.upi_id, "joined": u.joined}

def txn_to_dict(t):
    return {"id": t.id, "type": t.type, "category": t.category, "description": t.description,
            "amount": t.amount, "to_from": t.to_from, "date": t.date, "status": t.status, "recurring": t.recurring}

def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)):
    exc = HTTPException(status_code=401, detail="Could not validate credentials", headers={"WWW-Authenticate": "Bearer"})
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        email = payload.get("sub")
        if not email: raise exc
    except JWTError:
        raise exc
    user = db.query(UserModel).filter(UserModel.email == email).first()
    if not user: raise exc
    return user

# ─── Schemas ───────────────────────────────────────────────────────────────────
class UserRegister(BaseModel):
    name: str
    email: str
    password: str
    phone: Optional[str] = ""

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
    type: str
    date: Optional[str] = None
    recurring: Optional[bool] = False

class AdminTopUp(BaseModel):
    email: str
    amount: float
    admin_key: str

class AdminTopUpAll(BaseModel):
    amount: float
    admin_key: str

# ─── Auth ──────────────────────────────────────────────────────────────────────
@app.post("/api/auth/register")
def register(data: UserRegister, db: Session = Depends(get_db)):
    if db.query(UserModel).filter(UserModel.email == data.email).first():
        raise HTTPException(status_code=400, detail="Email already registered")
    initials = "".join(w[0].upper() for w in data.name.split()[:2])
    user = UserModel(
        id=str(uuid.uuid4()), name=data.name, email=data.email,
        hashed_password=hash_password(data.password), balance=0.0,
        avatar=initials, phone=data.phone or "",
        upi_id=f"{data.name.split()[0].lower()}@payvault",
        joined=datetime.utcnow().strftime("%Y-%m-%d"),
    )
    db.add(user); db.commit(); db.refresh(user)
    token = create_access_token({"sub": data.email}, timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES))
    return {"access_token": token, "token_type": "bearer", "user": user_to_dict(user)}

@app.post("/api/auth/login")
def login(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    user = db.query(UserModel).filter(UserModel.email == form_data.username).first()
    if not user or not verify_password(form_data.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Incorrect email or password")
    token = create_access_token({"sub": form_data.username}, timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES))
    return {"access_token": token, "token_type": "bearer", "user": user_to_dict(user)}

@app.get("/api/auth/me")
def get_me(current_user=Depends(get_current_user)):
    return user_to_dict(current_user)

# ─── Wallet ────────────────────────────────────────────────────────────────────
@app.get("/api/wallet")
def get_wallet(current_user=Depends(get_current_user), db: Session = Depends(get_db)):
    txns = db.query(TransactionModel).filter(TransactionModel.user_id == current_user.id).all()
    return {
        "balance": current_user.balance,
        "total_in":  sum(t.amount for t in txns if t.type == "credit"),
        "total_out": sum(t.amount for t in txns if t.type == "debit"),
        "upi_id": current_user.upi_id,
    }

# ─── Payments ──────────────────────────────────────────────────────────────────
@app.post("/api/pay")
def send_payment(req: PaymentRequest, current_user=Depends(get_current_user), db: Session = Depends(get_db)):
    if req.amount <= 0:
        raise HTTPException(status_code=400, detail="Amount must be positive")
    if current_user.balance < req.amount:
        raise HTTPException(status_code=400, detail="Insufficient balance")

    current_user.balance -= req.amount
    txn = TransactionModel(
        user_id=current_user.id, type="debit", category=req.category,
        description=req.note or f"Payment to {req.recipient_name}",
        amount=req.amount, to_from=req.recipient_name,
        date=datetime.utcnow().strftime("%Y-%m-%d"), status="completed",
    )
    db.add(txn)

    recipient = db.query(UserModel).filter(UserModel.upi_id == req.recipient_upi).first()
    if recipient:
        recipient.balance += req.amount
        db.add(TransactionModel(
            user_id=recipient.id, type="credit", category=req.category,
            description=f"Payment from {current_user.name}",
            amount=req.amount, to_from=current_user.name,
            date=datetime.utcnow().strftime("%Y-%m-%d"), status="completed",
        ))

    db.commit(); db.refresh(txn)
    return {"success": True, "transaction": txn_to_dict(txn), "new_balance": current_user.balance}

# ─── Transactions ──────────────────────────────────────────────────────────────
@app.get("/api/transactions")
def get_transactions(current_user=Depends(get_current_user), db: Session = Depends(get_db)):
    txns = db.query(TransactionModel).filter(TransactionModel.user_id == current_user.id)\
             .order_by(TransactionModel.date.desc()).all()
    return [txn_to_dict(t) for t in txns]

@app.post("/api/transactions")
def add_transaction(exp: ExpenseCreate, current_user=Depends(get_current_user), db: Session = Depends(get_db)):
    txn = TransactionModel(
        user_id=current_user.id, type=exp.type, category=exp.category,
        description=exp.description, amount=exp.amount, to_from="Manual Entry",
        date=exp.date or datetime.utcnow().strftime("%Y-%m-%d"),
        status="completed", recurring=exp.recurring or False,
    )
    if exp.type == "credit": current_user.balance += exp.amount
    else: current_user.balance -= exp.amount
    db.add(txn); db.commit(); db.refresh(txn)
    return txn_to_dict(txn)

@app.delete("/api/transactions/{txn_id}")
def delete_transaction(txn_id: str, current_user=Depends(get_current_user), db: Session = Depends(get_db)):
    txn = db.query(TransactionModel).filter(TransactionModel.id == txn_id, TransactionModel.user_id == current_user.id).first()
    if not txn: raise HTTPException(status_code=404, detail="Transaction not found")
    if txn.type == "credit": current_user.balance -= txn.amount
    else: current_user.balance += txn.amount
    db.delete(txn); db.commit()
    return {"deleted": True}

# ─── Contacts ──────────────────────────────────────────────────────────────────
@app.get("/api/contacts")
def get_contacts(current_user=Depends(get_current_user), db: Session = Depends(get_db)):
    contacts = db.query(ContactModel).filter(ContactModel.user_id == current_user.id).all()
    # Auto-generate contacts from other users if none exist
    if not contacts:
        others = db.query(UserModel).filter(UserModel.id != current_user.id).limit(4).all()
        colors = ["#6366f1", "#f59e0b", "#10b981", "#ef4444"]
        for i, u in enumerate(others):
            c = ContactModel(user_id=current_user.id, name=u.name, upi=u.upi_id, avatar=u.avatar, color=colors[i % 4])
            db.add(c)
        db.commit()
        contacts = db.query(ContactModel).filter(ContactModel.user_id == current_user.id).all()
    return [{"id": c.id, "name": c.name, "upi": c.upi, "avatar": c.avatar, "color": c.color} for c in contacts]

# ─── Analytics ─────────────────────────────────────────────────────────────────
@app.get("/api/analytics")
def get_analytics(current_user=Depends(get_current_user), db: Session = Depends(get_db)):
    txns = db.query(TransactionModel).filter(TransactionModel.user_id == current_user.id).all()
    by_category = {}
    for t in txns:
        if t.type == "debit":
            by_category[t.category] = by_category.get(t.category, 0) + t.amount
    return {
        "by_category": by_category,
        "total_spent": sum(by_category.values()),
        "total_received": sum(t.amount for t in txns if t.type == "credit"),
        "transaction_count": len(txns),
    }

# ─── Admin ─────────────────────────────────────────────────────────────────────
@app.get("/api/admin/users")
def admin_list_users(admin_key: str, db: Session = Depends(get_db)):
    if admin_key != ADMIN_KEY:
        raise HTTPException(status_code=403, detail="Invalid admin key")
    users = db.query(UserModel).all()
    return [user_to_dict(u) for u in users]

@app.post("/api/admin/topup")
def admin_topup(data: AdminTopUp, db: Session = Depends(get_db)):
    if data.admin_key != ADMIN_KEY:
        raise HTTPException(status_code=403, detail="Invalid admin key")
    user = db.query(UserModel).filter(UserModel.email == data.email).first()
    if not user: raise HTTPException(status_code=404, detail="User not found")
    user.balance += data.amount
    db.add(TransactionModel(
        user_id=user.id, type="credit", category="Income",
        description="Admin Top-Up", amount=data.amount,
        to_from="PayVault Admin", date=datetime.utcnow().strftime("%Y-%m-%d"), status="completed",
    ))
    db.commit()
    return {"success": True, "new_balance": user.balance, "user": user.name}

@app.post("/api/admin/topup-all")
def admin_topup_all(data: AdminTopUpAll, db: Session = Depends(get_db)):
    if data.admin_key != ADMIN_KEY:
        raise HTTPException(status_code=403, detail="Invalid admin key")
    users = db.query(UserModel).all()
    for user in users:
        user.balance += data.amount
        db.add(TransactionModel(
            user_id=user.id, type="credit", category="Income",
            description="Admin Top-Up", amount=data.amount,
            to_from="PayVault Admin", date=datetime.utcnow().strftime("%Y-%m-%d"), status="completed",
        ))
    db.commit()
    return {"success": True, "users_updated": len(users), "amount_each": data.amount}

@app.delete("/api/admin/reset-user")
def admin_reset_user(email: str, admin_key: str, db: Session = Depends(get_db)):
    if admin_key != ADMIN_KEY:
        raise HTTPException(status_code=403, detail="Invalid admin key")
    user = db.query(UserModel).filter(UserModel.email == email).first()
    if not user: raise HTTPException(status_code=404, detail="User not found")
    db.query(TransactionModel).filter(TransactionModel.user_id == user.id).delete()
    db.query(ContactModel).filter(ContactModel.user_id == user.id).delete()
    user.balance = 0.0
    db.commit()
    return {"success": True, "message": f"Reset {user.name}"}

# ─── Health ────────────────────────────────────────────────────────────────────
@app.get("/api/health")
def health():
    return {"status": "ok", "service": "PayVault API", "db": engine.dialect.name}
