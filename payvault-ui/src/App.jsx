/**
 * PayVault — React Frontend
 * Connects to FastAPI backend at http://localhost:8000
 *
 * npm install  (standard CRA or Vite React project)
 * Demo login: alex@payvault.com / demo1234
 */

import { useState, useEffect, useCallback, useRef } from "react";
import {
  Send, ArrowDownLeft, ArrowUpRight, Wallet, LayoutDashboard,
  Receipt, Settings, LogOut, Eye, EyeOff, Plus, X, Trash2,
  ChevronRight, Search, CheckCircle2, AlertCircle, Clock,
  User, CreditCard, Zap, BarChart3, Bell, RefreshCw, Shield,
  Copy, Check, ArrowLeft, Moon, Sun,
} from "lucide-react";

// ─── API base ──────────────────────────────────────────────────────────────────
const API = "http://localhost:8000/api";

async function apiFetch(path, options = {}, token = null) {
  const headers = { "Content-Type": "application/json", ...(options.headers || {}) };
  if (token) headers["Authorization"] = `Bearer ${token}`;
  const res = await fetch(`${API}${path}`, { ...options, headers });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: "Network error" }));
    throw new Error(err.detail || "Request failed");
  }
  return res.json();
}

// ─── Constants ─────────────────────────────────────────────────────────────────
const CAT_META = {
  Food:          { icon: "🍜", color: "#f97316" },
  Transport:     { icon: "🚗", color: "#06b6d4" },
  Entertainment: { icon: "🎮", color: "#a855f7" },
  Utilities:     { icon: "💡", color: "#10b981" },
  Health:        { icon: "🏥", color: "#ec4899" },
  Shopping:      { icon: "🛍️", color: "#f59e0b" },
  Transfer:      { icon: "↔️", color: "#6366f1" },
  Income:        { icon: "💰", color: "#22c55e" },
  Other:         { icon: "📦", color: "#6b7280" },
};
const CATEGORIES = Object.keys(CAT_META);

const fmt = (n) =>
  `₹${Number(n).toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;

const THEMES = {
  dark: {
    bg: "#060609",
    surface: "rgba(10,12,20,0.9)",
    surfaceSoft: "rgba(15,20,35,0.88)",
    border: "rgba(255,255,255,0.08)",
    borderStrong: "rgba(255,255,255,0.12)",
    text: "#e2e8f0",
    muted: "rgba(255,255,255,0.45)",
    input: "rgba(255,255,255,0.05)",
    sidebar: "rgba(255,255,255,0.03)",
    topbar: "rgba(6,6,9,0.88)",
    cardAccent: "rgba(255,255,255,0.05)",
  },
  light: {
    bg: "#f2f4f8",
    surface: "rgba(255,255,255,0.96)",
    surfaceSoft: "rgba(245,247,250,0.96)",
    border: "rgba(15,23,42,0.08)",
    borderStrong: "rgba(15,23,42,0.12)",
    text: "#0f172a",
    muted: "rgba(15,23,42,0.6)",
    input: "rgba(255,255,255,0.92)",
    sidebar: "rgba(255,255,255,0.92)",
    topbar: "rgba(255,255,255,0.95)",
    cardAccent: "rgba(15,23,42,0.04)",
  },
};

function buildPieGradient(entries, total) {
  let start = 0;
  return entries.map(([cat, amt]) => {
    const pct = total > 0 ? (amt / total * 100) : 0;
    const end = start + pct;
    const color = CAT_META[cat]?.color || "#6b7280";
    const segment = `${color} ${start}% ${end}%`;
    start = end;
    return segment;
  }).join(", ");
}

// ─── Toasts ───────────────────────────────────────────────────────────────────
function useToasts() {
  const [toasts, setToasts] = useState([]);
  const push = useCallback((msg, type = "success") => {
    const id = Date.now();
    setToasts((p) => [...p, { id, msg, type }]);
    setTimeout(() => setToasts((p) => p.filter((t) => t.id !== id)), 3500);
  }, []);
  return { toasts, push };
}

function ToastStack({ toasts }) {
  return (
    <div style={{ position: "fixed", top: 20, right: 20, zIndex: 9999, display: "flex", flexDirection: "column", gap: 8 }}>
      {toasts.map((t) => (
        <div key={t.id} style={{
          display: "flex", alignItems: "center", gap: 10,
          padding: "12px 18px", borderRadius: 12, fontSize: 13,
          fontWeight: 500, backdropFilter: "blur(24px)",
          background: t.type === "success" ? "rgba(34,197,94,0.12)" : t.type === "error" ? "rgba(239,68,68,0.12)" : "rgba(99,102,241,0.12)",
          border: `1px solid ${t.type === "success" ? "rgba(34,197,94,0.3)" : t.type === "error" ? "rgba(239,68,68,0.3)" : "rgba(99,102,241,0.3)"}`,
          color: "#e2e8f0", boxShadow: "0 8px 32px rgba(0,0,0,0.4)",
          animation: "toastIn .25s ease",
        }}>
          {t.type === "success" ? <CheckCircle2 size={15} color="#4ade80" /> : t.type === "error" ? <AlertCircle size={15} color="#f87171" /> : <Bell size={15} color="#818cf8" />}
          {t.msg}
        </div>
      ))}
    </div>
  );
}

// ─── Spinner ──────────────────────────────────────────────────────────────────
function Spinner({ size = 20 }) {
  return (
    <div style={{ width: size, height: size, borderRadius: "50%", border: "2px solid rgba(255,255,255,0.1)", borderTopColor: "#6366f1", animation: "spin .7s linear infinite" }} />
  );
}

// ─── Glass Card ───────────────────────────────────────────────────────────────
function Card({ children, style = {}, hover = false, onClick }) {
  return (
    <div onClick={onClick} style={{
      background: "var(--surface)",
      backdropFilter: "blur(26px)",
      border: "1px solid var(--border)",
      boxShadow: "0 24px 70px rgba(0,0,0,0.28)",
      borderRadius: 18,
      transition: "transform .25s ease, border-color .25s ease, box-shadow .25s ease",
      cursor: onClick ? "pointer" : undefined,
      ...style,
    }}
      onMouseEnter={hover ? (e) => { e.currentTarget.style.border = "1px solid rgba(255,255,255,0.16)"; e.currentTarget.style.transform = "translateY(-3px)"; e.currentTarget.style.boxShadow = "0 28px 80px rgba(0,0,0,0.32)"; } : undefined}
      onMouseLeave={hover ? (e) => { e.currentTarget.style.border = "1px solid rgba(255,255,255,0.08)"; e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.boxShadow = "0 24px 70px rgba(0,0,0,0.28)"; } : undefined}
    >
      {children}
    </div>
  );
}

// ─── Input ────────────────────────────────────────────────────────────────────
function Input({ label, ...props }) {
  return (
    <div>
      {label && <label style={{ display: "block", fontSize: 11, color: "var(--muted)", fontWeight: 700, textTransform: "uppercase", letterSpacing: ".06em", marginBottom: 7 }}>{label}</label>}
      <input {...props} style={{
        width: "100%", padding: "11px 14px", borderRadius: 10,
        background: "var(--input)", border: "1px solid var(--border)",
        color: "var(--text)", fontSize: 14, fontFamily: "inherit", outline: "none",
        transition: "border-color .2s", boxSizing: "border-box",
        ...props.style,
      }}
        onFocus={(e) => { e.target.style.borderColor = "rgba(99,102,241,0.6)"; if (props.onFocus) props.onFocus(e); }}
        onBlur={(e) => { e.target.style.borderColor = "rgba(255,255,255,0.1)"; if (props.onBlur) props.onBlur(e); }}
      />
    </div>
  );
}

function Select({ label, children, ...props }) {
  return (
    <div>
      {label && <label style={{ display: "block", fontSize: 11, color: "var(--muted)", fontWeight: 700, textTransform: "uppercase", letterSpacing: ".06em", marginBottom: 7 }}>{label}</label>}
      <select {...props} style={{
        width: "100%", padding: "11px 14px", borderRadius: 10,
        background: "var(--input)", border: "1px solid var(--border)",
        color: "var(--text)", fontSize: 14, fontFamily: "inherit", outline: "none",
        boxSizing: "border-box",
      }}>
        {children}
      </select>
    </div>
  );
}

// ─── Button ───────────────────────────────────────────────────────────────────
function Btn({ children, variant = "primary", loading, style = {}, ...props }) {
  const base = {
    display: "inline-flex", alignItems: "center", gap: 7,
    padding: "11px 20px", borderRadius: 11, fontSize: 14,
    fontWeight: 700, cursor: loading ? "not-allowed" : "pointer",
    border: "none", fontFamily: "inherit", transition: "all .2s",
    opacity: loading ? 0.7 : 1, ...style,
  };
  const variants = {
    primary:  { background: "linear-gradient(135deg,#6366f1,#8b5cf6)", color: "white", boxShadow: "0 4px 20px rgba(99,102,241,.35)" },
    ghost:    { background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", color: "#e2e8f0" },
    danger:   { background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)", color: "#f87171" },
    success:  { background: "linear-gradient(135deg,#22c55e,#16a34a)", color: "white", boxShadow: "0 4px 20px rgba(34,197,94,.25)" },
  };
  return (
    <button {...props} style={{ ...base, ...variants[variant] }}
      onMouseEnter={(e) => { if (!loading) e.currentTarget.style.opacity = ".85"; }}
      onMouseLeave={(e) => { e.currentTarget.style.opacity = loading ? ".7" : "1"; }}
    >
      {loading ? <Spinner size={16} /> : children}
    </button>
  );
}

// ─── Auth Screen ──────────────────────────────────────────────────────────────
function AuthScreen({ onLogin, toast, theme }) {
  const [mode, setMode] = useState("login"); // login | register
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", password: "", phone: "" });
  const set = (k) => (e) => setForm((p) => ({ ...p, [k]: e.target.value }));

  const submit = async () => {
    setLoading(true);
    try {
      let data;
      if (mode === "login") {
        const body = new URLSearchParams({ username: form.email, password: form.password });
        const res = await fetch(`${API}/auth/login`, { method: "POST", body, headers: { "Content-Type": "application/x-www-form-urlencoded" } });
        if (!res.ok) { const e = await res.json(); throw new Error(e.detail); }
        data = await res.json();
      } else {
        data = await apiFetch("/auth/register", { method: "POST", body: JSON.stringify({ name: form.name, email: form.email, password: form.password, phone: form.phone }) });
      }
      localStorage.setItem("pv_token", data.access_token);
      onLogin(data.user, data.access_token);
      toast("Welcome to PayVault! 🎉");
    } catch (e) {
      toast(e.message, "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg)", color: "var(--text)", display: "flex", alignItems: "center", justifyContent: "center", padding: 20, position: "relative", overflow: "hidden" }}>
      {/* BG orbs */}
      <div style={{ position: "absolute", top: "20%", left: "15%", width: 500, height: 500, background: theme === "dark" ? "radial-gradient(circle, rgba(99,102,241,0.12) 0%, transparent 70%)" : "radial-gradient(circle, rgba(79,70,229,0.12) 0%, transparent 70%)", pointerEvents: "none" }} />
      <div style={{ position: "absolute", bottom: "10%", right: "10%", width: 400, height: 400, background: theme === "dark" ? "radial-gradient(circle, rgba(139,92,246,0.1) 0%, transparent 70%)" : "radial-gradient(circle, rgba(8,145,178,0.08) 0%, transparent 70%)", pointerEvents: "none" }} />

      <div style={{ width: "100%", maxWidth: 420, position: "relative", zIndex: 1 }}>
        {/* Logo */}
        <div style={{ textAlign: "center", marginBottom: 40 }}>
          <div style={{ width: 56, height: 56, borderRadius: 16, background: "linear-gradient(135deg,#6366f1,#8b5cf6)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px", boxShadow: "0 8px 32px rgba(99,102,241,0.4)" }}>
            <Wallet size={26} color="white" />
          </div>
          <h1 style={{ fontFamily: "'Playfair Display',serif", fontSize: 30, color: "#f8fafc", margin: 0 }}>PayVault</h1>
          <p style={{ color: "rgba(255,255,255,0.35)", fontSize: 14, marginTop: 6 }}>Secure payments. Smart finance.</p>
        </div>

        <Card style={{ padding: 32 }}>
          {/* Tab switcher */}
          <div style={{ display: "flex", background: "rgba(255,255,255,0.05)", borderRadius: 10, padding: 4, marginBottom: 28 }}>
            {["login", "register"].map((m) => (
              <button key={m} onClick={() => setMode(m)} style={{
                flex: 1, padding: "9px 0", borderRadius: 8, border: "none", cursor: "pointer",
                fontFamily: "inherit", fontWeight: 700, fontSize: 13,
                background: mode === m ? "rgba(99,102,241,0.9)" : "transparent",
                color: mode === m ? "white" : "rgba(255,255,255,0.4)",
                transition: "all .2s",
              }}>{m === "login" ? "Sign In" : "Register"}</button>
            ))}
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {mode === "register" && (
              <>
                <Input label="Full Name" placeholder="Alex Johnson" value={form.name} onChange={set("name")} onKeyDown={(e) => e.key === "Enter" && submit()} />
                <Input label="Phone" placeholder="+91 98765 43210" value={form.phone} onChange={set("phone")} onKeyDown={(e) => e.key === "Enter" && submit()} />
              </>
            )}
            <Input label="Email Address" type="email" placeholder="alex@payvault.com" value={form.email} onChange={set("email")} onKeyDown={(e) => e.key === "Enter" && submit()} />
            <Input label="Password" type="password" placeholder="••••••••" value={form.password} onChange={set("password")} onKeyDown={(e) => e.key === "Enter" && submit()} />

            {mode === "login" && (
              <div style={{ background: "rgba(99,102,241,0.08)", border: "1px solid rgba(99,102,241,0.2)", borderRadius: 10, padding: "10px 14px", fontSize: 12, color: "rgba(255,255,255,0.45)" }}>
                Demo — <strong style={{ color: "rgba(255,255,255,0.7)" }}>alex@payvault.com</strong> / <strong style={{ color: "rgba(255,255,255,0.7)" }}>demo1234</strong>
              </div>
            )}

            <Btn variant="primary" loading={loading} style={{ width: "100%", justifyContent: "center", marginTop: 4 }} onClick={submit}>
              {mode === "login" ? "Sign In" : "Create Account"}
            </Btn>
          </div>
        </Card>

        <p style={{ textAlign: "center", color: "rgba(255,255,255,0.2)", fontSize: 12, marginTop: 24 }}>
          <Shield size={12} style={{ display: "inline", marginRight: 5, verticalAlign: "middle" }} />
          256-bit encrypted · NPCI compliant
        </p>
      </div>
    </div>
  );
}

// ─── Modal ────────────────────────────────────────────────────────────────────
function Modal({ onClose, title, children, width = 440 }) {
  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 50, display: "flex", alignItems: "center", justifyContent: "center", padding: 20, background: "rgba(0,0,0,0.7)", backdropFilter: "blur(6px)" }} onClick={onClose}>
      <div style={{ width: "100%", maxWidth: width, background: "rgba(12,12,20,0.97)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 20, padding: 28, boxShadow: "0 24px 80px rgba(0,0,0,0.6)", maxHeight: "90vh", overflowY: "auto" }} onClick={(e) => e.stopPropagation()}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 22 }}>
          <h3 style={{ fontFamily: "'Playfair Display',serif", fontSize: 20, color: "#f8fafc", margin: 0 }}>{title}</h3>
          <button onClick={onClose} style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, width: 32, height: 32, cursor: "pointer", color: "rgba(255,255,255,0.5)", display: "flex", alignItems: "center", justifyContent: "center" }}><X size={15} /></button>
        </div>
        {children}
      </div>
    </div>
  );
}

// ─── Send Money Modal ─────────────────────────────────────────────────────────
function SendMoneyModal({ contacts, token, user, onClose, onSuccess, toast }) {
  const [step, setStep] = useState(1); // 1=recipient 2=amount 3=confirm 4=done
  const [recipient, setRecipient] = useState(null);
  const [upiInput, setUpiInput] = useState("");
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [category, setCategory] = useState("Transfer");
  const [loading, setLoading] = useState(false);

  const handleSend = async () => {
    setLoading(true);
    try {
      const data = await apiFetch("/pay", {
        method: "POST",
        body: JSON.stringify({ recipient_upi: recipient.upi || upiInput, recipient_name: recipient.name, amount: parseFloat(amount), note, category }),
      }, token);
      onSuccess(data);
      setStep(4);
      toast(`₹${amount} sent to ${recipient.name} ✅`);
    } catch (e) {
      toast(e.message, "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal onClose={onClose} title="Send Money">
      {step === 1 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <Input label="UPI ID / Phone" placeholder="name@upi or +91XXXXXXXXXX" value={upiInput} onChange={(e) => setUpiInput(e.target.value)} />
          <div>
            <p style={{ fontSize: 11, color: "rgba(255,255,255,0.35)", fontWeight: 700, textTransform: "uppercase", letterSpacing: ".06em", marginBottom: 10 }}>Recent Contacts</p>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {contacts.map((c) => (
                <div key={c.id} onClick={() => { setRecipient(c); setStep(2); }} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 14px", borderRadius: 12, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)", cursor: "pointer", transition: "all .2s" }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(99,102,241,0.1)"; e.currentTarget.style.borderColor = "rgba(99,102,241,0.3)"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.04)"; e.currentTarget.style.borderColor = "rgba(255,255,255,0.07)"; }}>
                  <div style={{ width: 38, height: 38, borderRadius: 10, background: c.color + "25", border: `1px solid ${c.color}40`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 800, color: c.color }}>{c.avatar}</div>
                  <div style={{ flex: 1 }}>
                    <p style={{ fontWeight: 600, fontSize: 14, color: "#e2e8f0" }}>{c.name}</p>
                    <p style={{ fontSize: 12, color: "rgba(255,255,255,0.35)" }}>{c.upi}</p>
                  </div>
                  <ChevronRight size={15} color="rgba(255,255,255,0.3)" />
                </div>
              ))}
            </div>
          </div>
          {upiInput && (
            <Btn variant="primary" style={{ width: "100%", justifyContent: "center" }} onClick={() => { setRecipient({ name: upiInput, upi: upiInput, avatar: upiInput[0]?.toUpperCase() }); setStep(2); }}>
              Continue <ChevronRight size={15} />
            </Btn>
          )}
        </div>
      )}

      {step === 2 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <button onClick={() => setStep(1)} style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, padding: "6px 10px", cursor: "pointer", color: "rgba(255,255,255,0.6)", display: "flex" }}><ArrowLeft size={15} /></button>
            <div>
              <p style={{ fontWeight: 700, color: "#e2e8f0" }}>{recipient?.name}</p>
              <p style={{ fontSize: 12, color: "rgba(255,255,255,0.35)" }}>{recipient?.upi}</p>
            </div>
          </div>
          <div style={{ textAlign: "center", padding: "16px 0" }}>
            <p style={{ fontSize: 13, color: "rgba(255,255,255,0.4)", marginBottom: 8 }}>Enter Amount</p>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 4 }}>
              <span style={{ fontFamily: "'Playfair Display',serif", fontSize: 36, color: "#6366f1" }}>₹</span>
              <input value={amount} onChange={(e) => setAmount(e.target.value)} type="number" placeholder="0" style={{ fontFamily: "'Playfair Display',serif", fontSize: 48, color: "#f8fafc", background: "transparent", border: "none", outline: "none", width: "160px", textAlign: "center" }} />
            </div>
            <div style={{ display: "flex", gap: 8, justifyContent: "center", marginTop: 14 }}>
              {[100, 500, 1000, 2000].map((q) => (
                <button key={q} onClick={() => setAmount(String(q))} style={{ padding: "5px 12px", borderRadius: 999, background: "rgba(99,102,241,0.12)", border: "1px solid rgba(99,102,241,0.25)", color: "#818cf8", fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>₹{q}</button>
              ))}
            </div>
          </div>
          <Input label="Note (optional)" placeholder="Dinner split, rent, etc." value={note} onChange={(e) => setNote(e.target.value)} />
          <Select label="Category" value={category} onChange={(e) => setCategory(e.target.value)}>
            {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
          </Select>
          <Btn variant="primary" style={{ width: "100%", justifyContent: "center" }} onClick={() => amount && setStep(3)}>
            Review Payment
          </Btn>
        </div>
      )}

      {step === 3 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
          <div style={{ background: "rgba(99,102,241,0.07)", border: "1px solid rgba(99,102,241,0.2)", borderRadius: 14, padding: 20 }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 12 }}>
              <span style={{ color: "rgba(255,255,255,0.45)", fontSize: 13 }}>To</span>
              <span style={{ fontWeight: 700, color: "#e2e8f0" }}>{recipient?.name}</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 12 }}>
              <span style={{ color: "rgba(255,255,255,0.45)", fontSize: 13 }}>UPI ID</span>
              <span style={{ fontSize: 13, color: "rgba(255,255,255,0.6)" }}>{recipient?.upi}</span>
            </div>
            {note && <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 12 }}>
              <span style={{ color: "rgba(255,255,255,0.45)", fontSize: 13 }}>Note</span>
              <span style={{ fontSize: 13, color: "rgba(255,255,255,0.6)" }}>{note}</span>
            </div>}
            <div style={{ display: "flex", justifyContent: "space-between", borderTop: "1px solid rgba(255,255,255,0.07)", paddingTop: 12 }}>
              <span style={{ color: "rgba(255,255,255,0.45)", fontSize: 13 }}>Amount</span>
              <span style={{ fontFamily: "'Playfair Display',serif", fontSize: 24, color: "#818cf8" }}>₹{Number(amount).toLocaleString("en-IN")}</span>
            </div>
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            <Btn variant="ghost" style={{ flex: 1, justifyContent: "center" }} onClick={() => setStep(2)}>Edit</Btn>
            <Btn variant="success" loading={loading} style={{ flex: 2, justifyContent: "center" }} onClick={handleSend}>
              <Send size={15} /> Confirm & Pay
            </Btn>
          </div>
        </div>
      )}

      {step === 4 && (
        <div style={{ textAlign: "center", padding: "24px 0" }}>
          <div style={{ width: 64, height: 64, borderRadius: "50%", background: "rgba(34,197,94,0.12)", border: "2px solid rgba(34,197,94,0.3)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 20px" }}>
            <CheckCircle2 size={30} color="#4ade80" />
          </div>
          <h3 style={{ fontFamily: "'Playfair Display',serif", fontSize: 22, color: "#f8fafc", marginBottom: 8 }}>Payment Sent!</h3>
          <p style={{ color: "rgba(255,255,255,0.4)", fontSize: 14 }}>₹{Number(amount).toLocaleString("en-IN")} sent to {recipient?.name}</p>
          <Btn variant="ghost" style={{ marginTop: 24, width: "100%", justifyContent: "center" }} onClick={onClose}>Done</Btn>
        </div>
      )}
    </Modal>
  );
}

// ─── Add Expense Modal ────────────────────────────────────────────────────────
function AddExpenseModal({ token, onClose, onSuccess, toast }) {
  const [form, setForm] = useState({ description: "", amount: "", category: "Food", type: "debit", date: new Date().toISOString().split("T")[0] });
  const [loading, setLoading] = useState(false);
  const set = (k) => (e) => setForm((p) => ({ ...p, [k]: e.target.value }));

  const submit = async () => {
    if (!form.description || !form.amount) return toast("Fill in all fields", "error");
    setLoading(true);
    try {
      const data = await apiFetch("/transactions", { method: "POST", body: JSON.stringify({ ...form, amount: parseFloat(form.amount) }) }, token);
      onSuccess(data);
      toast("Transaction added");
      onClose();
    } catch (e) {
      toast(e.message, "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal onClose={onClose} title="Add Transaction">
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <div style={{ display: "flex", gap: 8 }}>
          {[["debit", "Expense", "#ef4444"], ["credit", "Income", "#22c55e"]].map(([val, label, color]) => (
            <button key={val} onClick={() => setForm((p) => ({ ...p, type: val }))} style={{
              flex: 1, padding: "10px 0", borderRadius: 10, border: `1px solid ${form.type === val ? color + "60" : "rgba(255,255,255,0.08)"}`,
              background: form.type === val ? color + "15" : "transparent", color: form.type === val ? color : "rgba(255,255,255,0.4)",
              fontWeight: 700, fontSize: 13, cursor: "pointer", fontFamily: "inherit", transition: "all .2s",
            }}>{label}</button>
          ))}
        </div>
        <Input label="Description" placeholder="What was this for?" value={form.description} onChange={set("description")} />
        <Input label="Amount (₹)" type="number" placeholder="0.00" value={form.amount} onChange={set("amount")} />
        <Select label="Category" value={form.category} onChange={set("category")}>
          {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
        </Select>
        <Input label="Date" type="date" value={form.date} onChange={set("date")} />
        <Btn variant="primary" loading={loading} style={{ width: "100%", justifyContent: "center" }} onClick={submit}>
          <Plus size={15} /> Add Transaction
        </Btn>
      </div>
    </Modal>
  );
}

// ─── Main App ─────────────────────────────────────────────────────────────────
export default function PayVault() {
  const [token, setToken] = useState(() => localStorage.getItem("pv_token"));
  const [user, setUser] = useState(null);
  const [page, setPage] = useState("dashboard");
  const [hideBalance, setHideBalance] = useState(false);
  const { toasts, push: toast } = useToasts();
  const [theme, setTheme] = useState(() => localStorage.getItem("pv_theme") || "dark");
  const themeStyle = THEMES[theme];

  // Data
  const [wallet, setWallet] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [contacts, setContacts] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(false);

  const categoryAnalytics = analytics ? Object.entries(analytics.by_category).sort((a, b) => b[1] - a[1]) : [];
  const pieGradient = analytics ? buildPieGradient(categoryAnalytics, analytics.total_spent) : "";

  // Modals
  const [showSend, setShowSend] = useState(false);
  const [showAddExp, setShowAddExp] = useState(false);

  useEffect(() => {
    localStorage.setItem("pv_theme", theme);
  }, [theme]);

  // Filters
  const [search, setSearch] = useState("");
  const [catFilter, setCatFilter] = useState("all");

  // ── Auth restore ──
  useEffect(() => {
    if (!token) return;
    apiFetch("/auth/me", {}, token)
      .then((u) => setUser(u))
      .catch(() => { localStorage.removeItem("pv_token"); setToken(null); });
  }, [token]);

  // ── Fetch data ──
  const fetchAll = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const [w, t, c, a] = await Promise.all([
        apiFetch("/wallet", {}, token),
        apiFetch("/transactions", {}, token),
        apiFetch("/contacts", {}, token),
        apiFetch("/analytics", {}, token),
      ]);
      setWallet(w);
      setTransactions(t);
      setContacts(c);
      setAnalytics(a);
    } catch (e) {
      toast(e.message, "error");
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => { if (user) fetchAll(); }, [user, fetchAll]);

  const handleLogin = (u, t) => { setUser(u); setToken(t); };
  const handleLogout = () => { localStorage.removeItem("pv_token"); setToken(null); setUser(null); };

  const handlePaySuccess = (data) => {
    setWallet((w) => ({ ...w, balance: data.new_balance }));
    setTransactions((p) => [data.transaction, ...p]);
    fetchAll(); // refresh totals
  };

  const handleExpenseAdded = (txn) => {
    setTransactions((p) => [txn, ...p]);
    fetchAll(); // refresh balance
  };

  const handleDeleteTxn = async (id) => {
    try {
      await apiFetch(`/transactions/${id}`, { method: "DELETE" }, token);
      setTransactions((p) => p.filter((t) => t.id !== id));
      fetchAll();
      toast("Transaction removed", "info");
    } catch (e) {
      toast(e.message, "error");
    }
  };

  // ── Filtered txns ──
  const filteredTxns = transactions.filter((t) => {
    const matchCat = catFilter === "all" || t.category === catFilter;
    const matchSearch = !search || t.description.toLowerCase().includes(search.toLowerCase()) || (t.to_from || "").toLowerCase().includes(search.toLowerCase());
    return matchCat && matchSearch;
  });

  // ── Copied UPI ──
  const [copied, setCopied] = useState(false);
  const copyUpi = () => {
    if (wallet?.upi_id) { navigator.clipboard.writeText(wallet.upi_id); setCopied(true); setTimeout(() => setCopied(false), 2000); }
  };

  if (!token || !user) return (
    <>
      <GlobalStyles theme={theme} />
      <ToastStack toasts={toasts} />
      <AuthScreen onLogin={handleLogin} toast={toast} theme={theme} />
    </>
  );

  const navItems = [
    { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
    { id: "send", label: "Send Money", icon: Send, action: () => setShowSend(true) },
    { id: "expenses", label: "Expenses", icon: Receipt },
    { id: "analytics", label: "Analytics", icon: BarChart3 },
    { id: "settings", label: "Settings", icon: Settings },
  ];

  return (
    <>
      <GlobalStyles theme={theme} />
      <ToastStack toasts={toasts} />
      {showSend && <SendMoneyModal contacts={contacts} token={token} user={user} onClose={() => setShowSend(false)} onSuccess={handlePaySuccess} toast={toast} />}
      {showAddExp && <AddExpenseModal token={token} onClose={() => setShowAddExp(false)} onSuccess={handleExpenseAdded} toast={toast} />}

      <div style={{ display: "flex", minHeight: "100vh", background: themeStyle.bg, color: themeStyle.text }}>
        {/* ── Sidebar ── */}
        <aside style={{ width: 230, background: themeStyle.sidebar, borderRight: `1px solid ${themeStyle.border}`, display: "flex", flexDirection: "column", position: "sticky", top: 0, height: "100vh", flexShrink: 0, backdropFilter: "blur(20px)" }}>
          <div style={{ padding: "22px 20px", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{ width: 36, height: 36, borderRadius: 10, background: "linear-gradient(135deg,#6366f1,#8b5cf6)", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 4px 16px rgba(99,102,241,0.3)" }}>
                <Wallet size={18} color="white" />
              </div>
              <span style={{ fontFamily: "'Playfair Display',serif", fontSize: 18, color: "#f8fafc" }}>PayVault</span>
            </div>
          </div>

          <nav style={{ flex: 1, padding: "14px 10px", display: "flex", flexDirection: "column", gap: 2 }}>
            {navItems.map(({ id, label, icon: Icon, action }) => {
              const active = page === id && !action;
              return (
                <button key={id} onClick={() => { if (action) action(); else setPage(id); }} style={{
                  display: "flex", alignItems: "center", gap: 10, padding: "10px 12px",
                  borderRadius: 11, border: "none", cursor: "pointer", fontFamily: "inherit",
                  fontSize: 13, fontWeight: 600, textAlign: "left", width: "100%",
                  background: active ? "rgba(99,102,241,0.14)" : "transparent",
                  color: active ? "#818cf8" : "rgba(255,255,255,0.35)",
                  transition: "all .2s",
                }}
                  onMouseEnter={(e) => { if (!active) { e.currentTarget.style.background = "rgba(255,255,255,0.04)"; e.currentTarget.style.color = "rgba(255,255,255,0.65)"; } }}
                  onMouseLeave={(e) => { if (!active) { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "rgba(255,255,255,0.35)"; } }}
                >
                  <Icon size={16} />
                  {label}
                  {id === "send" && <span style={{ marginLeft: "auto", width: 6, height: 6, borderRadius: "50%", background: "#6366f1" }} />}
                </button>
              );
            })}
          </nav>

          {/* User in sidebar */}
          <div style={{ padding: "14px 12px", borderTop: "1px solid rgba(255,255,255,0.06)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
              <div style={{ width: 34, height: 34, borderRadius: 9, background: "linear-gradient(135deg,#6366f1,#8b5cf6)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 800, color: "white" }}>{user.avatar}</div>
              <div style={{ flex: 1, overflow: "hidden" }}>
                <p style={{ fontSize: 13, fontWeight: 700, color: "#e2e8f0", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{user.name}</p>
                <p style={{ fontSize: 11, color: "rgba(255,255,255,0.3)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{user.email}</p>
              </div>
            </div>
            <button onClick={handleLogout} style={{ display: "flex", alignItems: "center", gap: 7, width: "100%", padding: "8px 10px", borderRadius: 9, background: "rgba(239,68,68,0.07)", border: "1px solid rgba(239,68,68,0.15)", color: "#f87171", cursor: "pointer", fontSize: 13, fontWeight: 600, fontFamily: "inherit" }}>
              <LogOut size={14} /> Sign Out
            </button>
          </div>
        </aside>

        {/* ── Main ── */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
          {/* Topbar */}
          <header style={{ padding: "16px 28px", display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: `1px solid ${themeStyle.border}`, background: themeStyle.topbar, backdropFilter: "blur(20px)", position: "sticky", top: 0, zIndex: 20 }}>
            <div>
              <h2 style={{ fontFamily: "'Playfair Display',serif", fontSize: 20, color: "#f8fafc", margin: 0 }}>
                {page === "dashboard" ? `Good ${new Date().getHours() < 12 ? "morning" : "evening"}, ${user.name.split(" ")[0]}` :
                  page === "expenses" ? "Expense Tracker" :
                  page === "analytics" ? "Analytics" : "Settings"}
              </h2>
              <p style={{ fontSize: 12, color: "rgba(255,255,255,0.25)", margin: 0 }}>{new Date().toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}</p>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              {loading && <Spinner size={18} />}
                      <button onClick={() => setTheme((p) => p === "dark" ? "light" : "dark")} style={{ background: themeStyle.cardAccent, border: `1px solid ${themeStyle.borderStrong}`, borderRadius: 9, padding: "8px 10px", cursor: "pointer", color: themeStyle.text, display: "flex", alignItems: "center", gap: 6 }}>
                {theme === "dark" ? <Sun size={15} /> : <Moon size={15} />} {theme === "dark" ? "Light" : "Dark"}
              </button>
              <button onClick={() => setHideBalance((p) => !p)} style={{ background: themeStyle.cardAccent, border: `1px solid ${themeStyle.borderStrong}`, borderRadius: 9, padding: "8px 10px", cursor: "pointer", color: themeStyle.text, display: "flex" }}>
                {hideBalance ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
              <button onClick={fetchAll} style={{ background: themeStyle.cardAccent, border: `1px solid ${themeStyle.borderStrong}`, borderRadius: 9, padding: "8px 10px", cursor: "pointer", color: themeStyle.text, display: "flex" }}>
                <RefreshCw size={15} />
              </button>
            </div>
          </header>

          {/* ── Pages ── */}
          <div style={{ flex: 1, padding: 28, overflowY: "auto" }}>

            {/* ══════════ DASHBOARD ══════════ */}
            {page === "dashboard" && (
              <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
                {/* Balance Hero */}
                <Card style={{ padding: 28, background: "linear-gradient(135deg, rgba(99,102,241,0.15) 0%, rgba(139,92,246,0.1) 100%)", borderColor: "rgba(99,102,241,0.2)", position: "relative", overflow: "hidden" }}>
                  <div style={{ position: "absolute", top: -40, right: -40, width: 200, height: 200, borderRadius: "50%", background: "radial-gradient(circle, rgba(99,102,241,0.15) 0%, transparent 70%)" }} />
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                    <div>
                      <p style={{ fontSize: 12, color: "rgba(255,255,255,0.4)", fontWeight: 700, textTransform: "uppercase", letterSpacing: ".07em", marginBottom: 10 }}>Total Balance</p>
                      <p style={{ fontFamily: "'Playfair Display',serif", fontSize: 44, color: "#f8fafc", lineHeight: 1, marginBottom: 6 }}>
                        {hideBalance ? "••••••" : fmt(wallet?.balance ?? 0)}
                      </p>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 10 }}>
                        <span style={{ fontSize: 12, color: "rgba(255,255,255,0.4)" }}>UPI:</span>
                        <span style={{ fontSize: 12, color: "#818cf8", fontWeight: 600 }}>{wallet?.upi_id}</span>
                        <button onClick={copyUpi} style={{ background: "rgba(99,102,241,0.15)", border: "1px solid rgba(99,102,241,0.25)", borderRadius: 6, padding: "3px 8px", cursor: "pointer", color: "#818cf8", display: "flex", gap: 4, fontSize: 11, fontFamily: "inherit", fontWeight: 600 }}>
                          {copied ? <Check size={12} /> : <Copy size={12} />} {copied ? "Copied!" : "Copy"}
                        </button>
                      </div>
                    </div>
                    <div style={{ display: "flex", gap: 10, flexDirection: "column", alignItems: "flex-end" }}>
                      <div style={{ display: "flex", gap: 10 }}>
                        <Btn variant="primary" onClick={() => setShowSend(true)}><Send size={14} /> Send</Btn>
                        <Btn variant="ghost" onClick={() => setShowAddExp(true)}><Plus size={14} /> Add</Btn>
                      </div>
                    </div>
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginTop: 24 }}>
                    {[["Money In", wallet?.total_in, "#22c55e", ArrowDownLeft], ["Money Out", wallet?.total_out, "#ef4444", ArrowUpRight]].map(([label, val, color, Icon]) => (
                      <div key={label} style={{ background: "rgba(255,255,255,0.04)", borderRadius: 12, padding: "14px 16px", border: "1px solid rgba(255,255,255,0.06)" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 7 }}>
                          <Icon size={13} color={color} />
                          <span style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", fontWeight: 700, textTransform: "uppercase", letterSpacing: ".05em" }}>{label}</span>
                        </div>
                        <p style={{ fontFamily: "'Playfair Display',serif", fontSize: 20, color }}>{hideBalance ? "•••" : fmt(val ?? 0)}</p>
                      </div>
                    ))}
                  </div>
                </Card>

                {/* Quick Send */}
                <Card style={{ padding: 20 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                    <p style={{ fontFamily: "'Playfair Display',serif", fontSize: 17, color: "#f8fafc" }}>Quick Send</p>
                    <button onClick={() => setShowSend(true)} style={{ background: "none", border: "none", color: "#818cf8", fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>See all</button>
                  </div>
                  <div style={{ display: "flex", gap: 16, overflowX: "auto", paddingBottom: 4 }}>
                    {contacts.map((c) => (
                      <div key={c.id} onClick={() => setShowSend(true)} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8, cursor: "pointer", minWidth: 64, flexShrink: 0 }}>
                        <div style={{ width: 48, height: 48, borderRadius: 14, background: c.color + "20", border: `1px solid ${c.color}40`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: 800, color: c.color, transition: "all .2s" }}
                          onMouseEnter={(e) => { e.currentTarget.style.transform = "scale(1.08)"; }}
                          onMouseLeave={(e) => { e.currentTarget.style.transform = "scale(1)"; }}
                        >{c.avatar}</div>
                        <p style={{ fontSize: 11, color: "rgba(255,255,255,0.5)", textAlign: "center", maxWidth: 60, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.name.split(" ")[0]}</p>
                      </div>
                    ))}
                    <div onClick={() => setShowSend(true)} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8, cursor: "pointer", minWidth: 64, flexShrink: 0 }}>
                      <div style={{ width: 48, height: 48, borderRadius: 14, background: "rgba(255,255,255,0.05)", border: "1px dashed rgba(255,255,255,0.15)", display: "flex", alignItems: "center", justifyContent: "center" }}><Plus size={18} color="rgba(255,255,255,0.3)" /></div>
                      <p style={{ fontSize: 11, color: "rgba(255,255,255,0.3)", textAlign: "center" }}>New</p>
                    </div>
                  </div>
                </Card>

                {/* Recent Transactions */}
                <Card style={{ padding: 20 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                    <p style={{ fontFamily: "'Playfair Display',serif", fontSize: 17, color: "#f8fafc" }}>Recent Activity</p>
                    <button onClick={() => setPage("expenses")} style={{ background: "none", border: "none", color: "#818cf8", fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", display: "flex", alignItems: "center", gap: 4 }}>View all <ChevronRight size={13} /></button>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                    {transactions.slice(0, 6).map((t) => (
                      <TxnRow key={t.id} t={t} hideBalance={hideBalance} onDelete={handleDeleteTxn} />
                    ))}
                  </div>
                </Card>
              </div>
            )}

            {/* ══════════ EXPENSES ══════════ */}
            {page === "expenses" && (
              <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
                {/* Controls */}
                <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "9px 14px", borderRadius: 10, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", flex: 1, minWidth: 200 }}>
                    <Search size={14} color="rgba(255,255,255,0.3)" />
                    <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search transactions…" style={{ background: "transparent", border: "none", outline: "none", color: "#e2e8f0", fontSize: 13, fontFamily: "inherit", flex: 1 }} />
                    {search && <button onClick={() => setSearch("")} style={{ background: "none", border: "none", cursor: "pointer", color: "rgba(255,255,255,0.3)", display: "flex" }}><X size={13} /></button>}
                  </div>
                  <Btn variant="primary" onClick={() => setShowAddExp(true)}><Plus size={14} /> Add Transaction</Btn>
                </div>

                {/* Category filter pills */}
                <div style={{ display: "flex", gap: 7, flexWrap: "wrap" }}>
                  <FilterPill label="All" active={catFilter === "all"} onClick={() => setCatFilter("all")} />
                  {CATEGORIES.map((c) => <FilterPill key={c} label={`${CAT_META[c].icon} ${c}`} active={catFilter === c} onClick={() => setCatFilter(c)} color={CAT_META[c].color} />)}
                </div>

                {/* Transactions */}
                <Card style={{ padding: 20 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                    <p style={{ fontFamily: "'Playfair Display',serif", fontSize: 17, color: "#f8fafc" }}>
                      Transactions <span style={{ fontSize: 13, color: "rgba(255,255,255,0.3)", fontFamily: "inherit", fontWeight: 400 }}>({filteredTxns.length})</span>
                    </p>
                    <div style={{ display: "flex", gap: 14, fontSize: 13 }}>
                      <span style={{ color: "#4ade80" }}>+{hideBalance ? "•••" : fmt(analytics?.total_received ?? 0)}</span>
                      <span style={{ color: "#f87171" }}>-{hideBalance ? "•••" : fmt(analytics?.total_spent ?? 0)}</span>
                    </div>
                  </div>
                  {filteredTxns.length === 0 ? (
                    <div style={{ textAlign: "center", padding: "40px 0", color: "rgba(255,255,255,0.25)" }}>
                      <Receipt size={36} style={{ margin: "0 auto 12px", opacity: .3 }} />
                      <p>No transactions found</p>
                    </div>
                  ) : (
                    <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                      {filteredTxns.map((t) => <TxnRow key={t.id} t={t} hideBalance={hideBalance} onDelete={handleDeleteTxn} showDelete />)}
                    </div>
                  )}
                </Card>
              </div>
            )}

            {/* ══════════ ANALYTICS ══════════ */}
            {page === "analytics" && analytics && (
              <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 14 }}>
                  {[
                    ["Total Spent", fmt(analytics.total_spent), "#ef4444"],
                    ["Total Received", fmt(analytics.total_received), "#22c55e"],
                    ["Transactions", analytics.transaction_count, "#818cf8"],
                  ].map(([label, val, color]) => (
                    <Card key={label} style={{ padding: 20 }}>
                      <p style={{ fontSize: 11, color: "rgba(255,255,255,0.35)", fontWeight: 700, textTransform: "uppercase", letterSpacing: ".06em", marginBottom: 10 }}>{label}</p>
                      <p style={{ fontFamily: "'Playfair Display',serif", fontSize: 26, color }}>{hideBalance && label !== "Transactions" ? "•••" : val}</p>
                    </Card>
                  ))}
                </div>

                <Card style={{ padding: 24, display: "grid", gridTemplateColumns: "1.2fr 0.8fr", gap: 24, alignItems: "center" }}>
                  <div>
                    <p style={{ fontFamily: "'Playfair Display',serif", fontSize: 18, color: "#f8fafc", marginBottom: 16 }}>Expense Overview</p>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 18 }}>
                      {categoryAnalytics.slice(0, 4).map(([cat, amt]) => {
                        const pct = analytics.total_spent > 0 ? (amt / analytics.total_spent * 100) : 0;
                        const meta = CAT_META[cat] || { icon: "📦", color: "#6b7280" };
                        return (
                          <Card key={cat} style={{ padding: 16, background: "rgba(255,255,255,0.04)" }}>
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                                <span style={{ fontSize: 18 }}>{meta.icon}</span>
                                <div>
                                  <p style={{ fontSize: 13, fontWeight: 700, color: "#f8fafc" }}>{cat}</p>
                                  <p style={{ fontSize: 11, color: "rgba(255,255,255,0.45)" }}>{pct.toFixed(1)}%</p>
                                </div>
                              </div>
                            </div>
                            <div style={{ height: 8, borderRadius: 999, background: "rgba(255,255,255,0.05)", overflow: "hidden" }}>
                              <div style={{ height: "100%", width: `${Math.max(pct, 4)}%`, borderRadius: 999, background: meta.color, transition: "width .6s ease" }} />
                            </div>
                          </Card>
                        );
                      })}
                    </div>
                  </div>

                  <div style={{ display: "flex", flexDirection: "column", gap: 16, alignItems: "center" }}>
                    <div style={{ width: 260, height: 260, borderRadius: "50%", background: analytics.total_spent > 0 ? `conic-gradient(${pieGradient})` : "rgba(255,255,255,0.05)", boxShadow: "inset 0 0 0 10px rgba(15,23,42,0.95)", display: "grid", placeItems: "center" }}>
                      <div style={{ width: 150, height: 150, borderRadius: "50%", background: "rgba(10,12,20,0.96)", display: "grid", placeItems: "center", textAlign: "center" }}>
                        <p style={{ fontSize: 11, color: "rgba(255,255,255,0.55)", marginBottom: 6 }}>Total Spent</p>
                        <p style={{ fontSize: 18, fontWeight: 700, color: "#f8fafc" }}>{hideBalance ? "•••" : fmt(analytics.total_spent)}</p>
                      </div>
                    </div>
                    <div style={{ width: "100%", display: "grid", gap: 10 }}>
                      {categoryAnalytics.map(([cat, amt]) => {
                        const meta = CAT_META[cat] || { icon: "📦", color: "#6b7280" };
                        return (
                          <div key={cat} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, padding: "10px 14px", borderRadius: 14, background: "rgba(255,255,255,0.03)" }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                              <span style={{ fontSize: 16 }}>{meta.icon}</span>
                              <span style={{ fontSize: 13, color: "#e2e8f0", fontWeight: 600 }}>{cat}</span>
                            </div>
                            <span style={{ fontSize: 13, color: meta.color, fontWeight: 700 }}>{hideBalance ? "•••" : fmt(amt)}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </Card>

                <Card style={{ padding: 24 }}>
                  <p style={{ fontFamily: "'Playfair Display',serif", fontSize: 18, color: "#f8fafc", marginBottom: 22 }}>Category Spend Graph</p>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 16 }}>
                    {categoryAnalytics.map(([cat, amt]) => {
                      const pct = analytics.total_spent > 0 ? (amt / analytics.total_spent * 100) : 0;
                      const meta = CAT_META[cat] || { color: "#6b7280" };
                      return (
                        <div key={cat} style={{ display: "flex", flexDirection: "column", gap: 14, padding: 16, borderRadius: 18, background: "rgba(255,255,255,0.03)" }}>
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", color: "#e2e8f0", marginBottom: 6 }}>
                            <span style={{ fontSize: 13 }}>{cat}</span>
                            <span style={{ fontSize: 13, color: meta.color, fontWeight: 700 }}>{hideBalance ? "•••" : fmt(amt)}</span>
                          </div>
                          <div style={{ height: 140, borderRadius: 20, background: "rgba(255,255,255,0.06)", padding: 12, display: "flex", alignItems: "flex-end" }}>
                            <div style={{ width: "100%", height: `${Math.max(pct, 6)}%`, borderRadius: 16, background: meta.color, transition: "height .6s ease" }} />
                          </div>
                          <span style={{ fontSize: 12, color: "rgba(255,255,255,0.45)" }}>{pct.toFixed(1)}% of spend</span>
                        </div>
                      );
                    })}
                  </div>
                </Card>

                {analytics.total_spent > 50000 && (
                  <Card style={{ padding: 20, background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                      <AlertCircle size={24} color="#f87171" />
                      <div>
                        <p style={{ fontWeight: 700, color: "#f87171", marginBottom: 4 }}>High Spending Alert</p>
                        <p style={{ fontSize: 13, color: "rgba(255,255,255,0.7)" }}>You've spent over ₹50,000 this month. Consider reviewing your expenses to stay within budget.</p>
                      </div>
                    </div>
                  </Card>
                )}
              </div>
            )}

            {/* ══════════ SETTINGS ══════════ */}
            {page === "settings" && (
              <div style={{ maxWidth: 520, display: "flex", flexDirection: "column", gap: 16 }}>
                <Card style={{ padding: 24 }}>
                  <p style={{ fontFamily: "'Playfair Display',serif", fontSize: 18, color: "#f8fafc", marginBottom: 20 }}>Profile</p>
                  <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 20 }}>
                    <div style={{ width: 56, height: 56, borderRadius: 14, background: "linear-gradient(135deg,#6366f1,#8b5cf6)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, fontWeight: 800, color: "white" }}>{user.avatar}</div>
                    <div>
                      <p style={{ fontWeight: 700, fontSize: 16, color: "#f8fafc" }}>{user.name}</p>
                      <p style={{ fontSize: 13, color: "rgba(255,255,255,0.35)" }}>{user.email}</p>
                    </div>
                  </div>
                  {[["UPI ID", wallet?.upi_id], ["Phone", user.phone || "—"], ["Member Since", user.joined]].map(([label, val]) => (
                    <div key={label} style={{ display: "flex", justifyContent: "space-between", padding: "12px 0", borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
                      <span style={{ fontSize: 13, color: "rgba(255,255,255,0.35)" }}>{label}</span>
                      <span style={{ fontSize: 13, fontWeight: 600, color: "#e2e8f0" }}>{val}</span>
                    </div>
                  ))}
                </Card>

                <Card style={{ padding: 20 }}>
                  <p style={{ fontFamily: "'Playfair Display',serif", fontSize: 17, color: "#f8fafc", marginBottom: 16 }}>Security</p>
                  {[["Two-Factor Auth", false], ["Biometric Login", true], ["Transaction Alerts", true]].map(([label, on]) => (
                    <div key={label} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 0", borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
                      <span style={{ fontSize: 14, color: "#e2e8f0" }}>{label}</span>
                      <div style={{ width: 40, height: 22, borderRadius: 999, background: on ? "rgba(99,102,241,0.8)" : "rgba(255,255,255,0.1)", position: "relative", cursor: "pointer" }}>
                        <div style={{ width: 16, height: 16, borderRadius: "50%", background: "white", position: "absolute", top: 3, left: on ? 21 : 3, transition: "left .2s" }} />
                      </div>
                    </div>
                  ))}
                </Card>

                <Btn variant="danger" style={{ width: "100%", justifyContent: "center" }} onClick={handleLogout}>
                  <LogOut size={15} /> Sign Out of PayVault
                </Btn>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}

// ─── Transaction Row ───────────────────────────────────────────────────────────
function TxnRow({ t, hideBalance, onDelete, showDelete }) {
  const meta = CAT_META[t.category] || { icon: "📦", color: "#6b7280" };
  const isCredit = t.type === "credit";
  const [hovered, setHovered] = useState(false);

  return (
    <div onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)}
      style={{ display: "flex", alignItems: "center", gap: 12, padding: "11px 10px", borderRadius: 11, background: hovered ? "rgba(255,255,255,0.03)" : "transparent", transition: "background .15s" }}>
      <div style={{ width: 40, height: 40, borderRadius: 11, background: meta.color + "18", border: `1px solid ${meta.color}30`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, flexShrink: 0 }}>{meta.icon}</div>
      <div style={{ flex: 1, overflow: "hidden" }}>
        <p style={{ fontSize: 14, fontWeight: 600, color: "#e2e8f0", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{t.description}</p>
        <p style={{ fontSize: 11, color: "rgba(255,255,255,0.3)" }}>{t.date} · {t.to_from} ·
          <span style={{ color: meta.color, marginLeft: 4 }}>{t.category}</span>
        </p>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
        <p style={{ fontFamily: "'Playfair Display',serif", fontSize: 16, color: isCredit ? "#4ade80" : "#f87171", fontWeight: 700 }}>
          {isCredit ? "+" : "−"}{hideBalance ? "•••" : fmt(t.amount)}
        </p>
        {showDelete && hovered && (
          <button onClick={() => onDelete(t.id)} style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)", borderRadius: 7, padding: "5px 8px", cursor: "pointer", color: "#f87171", display: "flex" }}>
            <Trash2 size={13} />
          </button>
        )}
      </div>
    </div>
  );
}

function FilterPill({ label, active, onClick, color }) {
  return (
    <button onClick={onClick} style={{
      padding: "6px 14px", borderRadius: 999, fontSize: 12, fontWeight: 700,
      cursor: "pointer", border: `1px solid ${active ? (color || "#6366f1") + "60" : "rgba(255,255,255,0.08)"}`,
      background: active ? (color || "#6366f1") + "18" : "transparent",
      color: active ? (color || "#818cf8") : "rgba(255,255,255,0.35)",
      fontFamily: "inherit", transition: "all .15s",
    }}>{label}</button>
  );
}

// ─── Global CSS ───────────────────────────────────────────────────────────────
function GlobalStyles({ theme }) {
  const t = THEMES[theme] || THEMES.dark;
  return (
    <style>{`
      @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;700&family=Syne:wght@400;500;600;700;800&display=swap');
      :root {
        --bg: ${t.bg};
        --surface: ${t.surface};
        --surface-soft: ${t.surfaceSoft};
        --border: ${t.border};
        --border-strong: ${t.borderStrong};
        --text: ${t.text};
        --muted: ${t.muted};
        --input: ${t.input};
        --sidebar: ${t.sidebar};
        --topbar: ${t.topbar};
        --card-accent: ${t.cardAccent};
        --placeholder: ${theme === "dark" ? "rgba(255,255,255,0.35)" : "rgba(15,23,42,0.45)"};
        --scroll-thumb: ${theme === "dark" ? "rgba(255,255,255,0.12)" : "rgba(15,23,42,0.12)"};
      }
      *, *::before, *::after { box-sizing: border-box; }
      body { margin: 0; font-family: 'Syne', sans-serif; background: var(--bg); color: var(--text); }
      input[type=number]::-webkit-inner-spin-button { -webkit-appearance: none; }
      input::placeholder { color: var(--placeholder) !important; }
      ::-webkit-scrollbar { width: 5px; height: 5px; }
      ::-webkit-scrollbar-thumb { background: var(--scroll-thumb); border-radius: 999px; }
      @keyframes spin { to { transform: rotate(360deg); } }
      @keyframes toastIn { from { opacity: 0; transform: translateX(16px); } to { opacity: 1; transform: none; } }
    `}</style>
  );
}
