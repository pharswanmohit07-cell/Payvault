/**
 * PayVault — React Frontend
 * ✅ Payment limit warning system
 * ✅ Fixed light mode (all hardcoded dark colors replaced with CSS vars)
 * ✅ Full mobile responsiveness (hamburger menu, stacked layouts)
 * ✅ Dark / Light theme toggle
 */

import { useState, useEffect, useCallback, useRef } from "react";
import {
  Send, ArrowDownLeft, ArrowUpRight, Wallet, LayoutDashboard,
  Receipt, Settings, LogOut, Eye, EyeOff, Plus, X, Trash2,
  ChevronRight, Search, CheckCircle2, AlertCircle,
  CreditCard, BarChart3, Bell, RefreshCw, Shield,
  Copy, Check, ArrowLeft, Moon, Sun, Menu, TriangleAlert,
  SlidersHorizontal, Utensils, Car, Gamepad2, Zap, HeartPulse,
  ShoppingBag, ArrowLeftRight, Banknote, Package, TrendingUp, TrendingDown,
  UserCircle, Phone, CalendarDays, Landmark, Lock, Fingerprint,
  Download, Repeat, Split, Pencil, Target, Calendar, Clock,
  TrendingUp as TrendUp, Flame, Star,
} from "lucide-react";

// ─── API ───────────────────────────────────────────────────────────────────────
const API = import.meta.env?.VITE_API_URL ?? "https://payvault-32xz.onrender.com/api";
const API_REQUEST_TIMEOUT_MS = 60000;

async function fetchWithTimeout(url, options = {}) {
  const controller = new AbortController();
  const timeoutId = window.setTimeout(() => controller.abort(), API_REQUEST_TIMEOUT_MS);

  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } catch (error) {
    if (error.name === "AbortError") {
      throw new Error("The PayVault server did not respond within 60 seconds. It may be waking up; please try again.");
    }
    throw new Error("Could not reach the PayVault server. Please check your connection and try again.");
  } finally {
    window.clearTimeout(timeoutId);
  }
}

async function apiFetch(path, options = {}, token = null) {
  const headers = { "Content-Type": "application/json", ...(options.headers || {}) };
  if (token) headers["Authorization"] = `Bearer ${token}`;
  const res = await fetchWithTimeout(`${API}${path}`, { ...options, headers });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || `Request failed (${res.status})`);
  }
  return res.json();
}

// ─── Constants ─────────────────────────────────────────────────────────────────
const CAT_META = {
  Food:          { icon: Utensils,      color: "#f97316" },
  Transport:     { icon: Car,           color: "#06b6d4" },
  Entertainment: { icon: Gamepad2,      color: "#a855f7" },
  Utilities:     { icon: Zap,           color: "#10b981" },
  Health:        { icon: HeartPulse,    color: "#ec4899" },
  Shopping:      { icon: ShoppingBag,   color: "#f59e0b" },
  Transfer:      { icon: ArrowLeftRight,color: "#6366f1" },
  Income:        { icon: Banknote,      color: "#22c55e" },
  Other:         { icon: Package,       color: "#6b7280" },
};
const CATEGORIES = Object.keys(CAT_META);
const fmt = (n) => `₹${Number(n).toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;

function buildPieGradient(entries, total) {
  let start = 0;
  return entries.map(([cat, amt]) => {
    const pct = total > 0 ? (amt / total * 100) : 0;
    const end = start + pct;
    const color = CAT_META[cat]?.color || "#6b7280";
    const seg = `${color} ${start}% ${end}%`;
    start = end;
    return seg;
  }).join(", ");
}

// ─── Themes ────────────────────────────────────────────────────────────────────
const THEMES = {
  dark: {
    bg: "#060609",
    surface: "rgba(14,16,27,0.92)",
    surfaceSoft: "rgba(18,22,38,0.88)",
    border: "rgba(255,255,255,0.08)",
    borderStrong: "rgba(255,255,255,0.14)",
    text: "#e2e8f0",
    textSub: "rgba(226,232,240,0.55)",
    muted: "rgba(255,255,255,0.38)",
    input: "rgba(255,255,255,0.05)",
    inputBorder: "rgba(255,255,255,0.1)",
    sidebar: "rgba(8,10,18,0.96)",
    topbar: "rgba(6,6,9,0.90)",
    cardAccent: "rgba(255,255,255,0.05)",
    rowHover: "rgba(255,255,255,0.03)",
    pill: "rgba(255,255,255,0.06)",
    pillText: "rgba(255,255,255,0.4)",
    scrollThumb: "rgba(255,255,255,0.1)",
    placeholder: "rgba(255,255,255,0.3)",
    navActive: "rgba(99,102,241,0.14)",
    navActiveText: "#818cf8",
    navText: "rgba(255,255,255,0.38)",
    navHover: "rgba(255,255,255,0.05)",
    navHoverText: "rgba(255,255,255,0.7)",
    donut: "rgba(10,12,20,0.96)",
    donutInner: "rgba(8,10,18,0.98)",
    statBg: "rgba(255,255,255,0.03)",
    warningBg: "rgba(245,158,11,0.08)",
    warningBorder: "rgba(245,158,11,0.25)",
    warningText: "#fbbf24",
    dangerBg: "rgba(239,68,68,0.1)",
    dangerBorder: "rgba(239,68,68,0.28)",
    dangerText: "#f87171",
    btnGhost: "rgba(255,255,255,0.06)",
    btnGhostBorder: "rgba(255,255,255,0.1)",
    btnGhostText: "#e2e8f0",
    btnDanger: "rgba(239,68,68,0.1)",
    btnDangerBorder: "rgba(239,68,68,0.2)",
    btnDangerText: "#f87171",
    heroGrad: "linear-gradient(135deg, rgba(99,102,241,0.18) 0%, rgba(139,92,246,0.12) 100%)",
    heroBorder: "rgba(99,102,241,0.25)",
    txnMeta: "rgba(226,232,240,0.3)",
    contactCard: "rgba(255,255,255,0.04)",
    contactCardBorder: "rgba(255,255,255,0.07)",
    reviewCard: "rgba(99,102,241,0.07)",
    reviewCardBorder: "rgba(99,102,241,0.2)",
  },
  light: {
    bg: "#f0f2f8",
    surface: "rgba(255,255,255,0.95)",
    surfaceSoft: "rgba(248,249,252,0.95)",
    border: "rgba(15,23,42,0.09)",
    borderStrong: "rgba(15,23,42,0.15)",
    text: "#0f172a",
    textSub: "rgba(15,23,42,0.65)",
    muted: "rgba(15,23,42,0.45)",
    input: "rgba(255,255,255,0.98)",
    inputBorder: "rgba(15,23,42,0.14)",
    sidebar: "rgba(255,255,255,0.97)",
    topbar: "rgba(255,255,255,0.96)",
    cardAccent: "rgba(15,23,42,0.05)",
    rowHover: "rgba(15,23,42,0.03)",
    pill: "rgba(15,23,42,0.07)",
    pillText: "rgba(15,23,42,0.5)",
    scrollThumb: "rgba(15,23,42,0.12)",
    placeholder: "rgba(15,23,42,0.35)",
    navActive: "rgba(99,102,241,0.1)",
    navActiveText: "#4f46e5",
    navText: "rgba(15,23,42,0.45)",
    navHover: "rgba(15,23,42,0.06)",
    navHoverText: "#0f172a",
    donut: "rgba(248,249,252,0.97)",
    donutInner: "rgba(255,255,255,0.99)",
    statBg: "rgba(15,23,42,0.03)",
    warningBg: "rgba(245,158,11,0.07)",
    warningBorder: "rgba(245,158,11,0.3)",
    warningText: "#b45309",
    dangerBg: "rgba(239,68,68,0.06)",
    dangerBorder: "rgba(239,68,68,0.25)",
    dangerText: "#dc2626",
    btnGhost: "rgba(15,23,42,0.06)",
    btnGhostBorder: "rgba(15,23,42,0.12)",
    btnGhostText: "#0f172a",
    btnDanger: "rgba(239,68,68,0.07)",
    btnDangerBorder: "rgba(239,68,68,0.2)",
    btnDangerText: "#dc2626",
    heroGrad: "linear-gradient(135deg, rgba(99,102,241,0.08) 0%, rgba(139,92,246,0.05) 100%)",
    heroBorder: "rgba(99,102,241,0.2)",
    txnMeta: "rgba(15,23,42,0.38)",
    contactCard: "rgba(15,23,42,0.03)",
    contactCardBorder: "rgba(15,23,42,0.08)",
    reviewCard: "rgba(99,102,241,0.04)",
    reviewCardBorder: "rgba(99,102,241,0.18)",
  },
};

// ─── Toasts ───────────────────────────────────────────────────────────────────
function useToasts() {
  const [toasts, setToasts] = useState([]);
  const push = useCallback((msg, type = "success") => {
    const id = Date.now();
    setToasts(p => [...p, { id, msg, type }]);
    setTimeout(() => setToasts(p => p.filter(t => t.id !== id)), 4000);
  }, []);
  return { toasts, push };
}

function ToastStack({ toasts, T }) {
  return (
    <div style={{ position: "fixed", top: 20, right: 20, zIndex: 9999, display: "flex", flexDirection: "column", gap: 8, maxWidth: "calc(100vw - 40px)" }}>
      {toasts.map(t => (
        <div key={t.id} style={{
          display: "flex", alignItems: "center", gap: 10,
          padding: "12px 18px", borderRadius: 12, fontSize: 13, fontWeight: 500,
          backdropFilter: "blur(24px)",
          background: t.type === "success" ? "rgba(34,197,94,0.14)"
            : t.type === "error" ? "rgba(239,68,68,0.14)"
            : t.type === "warning" ? "rgba(245,158,11,0.14)"
            : "rgba(99,102,241,0.14)",
          border: `1px solid ${t.type === "success" ? "rgba(34,197,94,0.35)"
            : t.type === "error" ? "rgba(239,68,68,0.35)"
            : t.type === "warning" ? "rgba(245,158,11,0.35)"
            : "rgba(99,102,241,0.35)"}`,
          color: T.text,
          boxShadow: "0 8px 32px rgba(0,0,0,0.25)",
          animation: "toastIn .25s ease",
        }}>
          {t.type === "success" ? <CheckCircle2 size={15} color="#4ade80" />
            : t.type === "error" ? <AlertCircle size={15} color="#f87171" />
            : t.type === "warning" ? <TriangleAlert size={15} color="#fbbf24" />
            : <Bell size={15} color="#818cf8" />}
          {t.msg}
        </div>
      ))}
    </div>
  );
}

// ─── Spinner ──────────────────────────────────────────────────────────────────
function Spinner({ size = 20, color = "#6366f1" }) {
  return <div style={{ width: size, height: size, borderRadius: "50%", border: `2px solid ${color}28`, borderTopColor: color, animation: "spin .7s linear infinite", flexShrink: 0 }} />;
}

// ─── Global CSS ───────────────────────────────────────────────────────────────
function GlobalStyles({ T }) {
  return (
    <style>{`
      @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;700&family=Syne:wght@400;500;600;700;800&display=swap');
      *, *::before, *::after { box-sizing: border-box; }
      body { margin: 0; font-family: 'Syne', sans-serif; background: ${T.bg}; color: ${T.text}; transition: background .3s, color .3s; }
      input, select, textarea { font-family: 'Syne', sans-serif; }
      input[type=number]::-webkit-inner-spin-button { -webkit-appearance: none; }
      input::placeholder { color: ${T.placeholder} !important; }
      ::-webkit-scrollbar { width: 5px; height: 5px; }
      ::-webkit-scrollbar-thumb { background: ${T.scrollThumb}; border-radius: 999px; }
      @keyframes spin { to { transform: rotate(360deg); } }
      @keyframes toastIn { from { opacity: 0; transform: translateX(16px); } to { opacity: 1; transform: none; } }
      @keyframes warningPulse { 0%,100% { box-shadow: 0 0 0 0 rgba(245,158,11,0.3); } 50% { box-shadow: 0 0 0 6px rgba(245,158,11,0); } }
      @keyframes fadeIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: none; } }
      .page-enter { animation: fadeIn .3s ease; }
      select option { background: ${T.bg}; color: ${T.text}; }
      @media (max-width: 768px) {
        .sidebar-desktop { display: none !important; }
        .mobile-header { display: flex !important; }
        .main-content { padding: 16px !important; }
        .grid-stats { grid-template-columns: 1fr 1fr !important; }
        .grid-3col { grid-template-columns: 1fr !important; }
        .grid-2col { grid-template-columns: 1fr !important; }
        .hero-flex { flex-direction: column !important; gap: 20px !important; }
        .hero-actions { width: 100% !important; flex-direction: row !important; }
        .analytics-grid { grid-template-columns: 1fr !important; }
        .filter-pills { flex-wrap: wrap !important; }
        .topbar-title { font-size: 16px !important; }
        .topbar-date { display: none !important; }
        .donut-chart { width: 200px !important; height: 200px !important; }
        .quick-send-scroll { gap: 12px !important; }
      }
      @media (min-width: 769px) {
        .mobile-header { display: none !important; }
        .mobile-menu { display: none !important; }
      }
    `}</style>
  );
}

// ─── Card ─────────────────────────────────────────────────────────────────────
function Card({ children, style = {}, hover = false, onClick, T }) {
  const [hov, setHov] = useState(false);
  return (
    <div onClick={onClick}
      onMouseEnter={() => hover && setHov(true)}
      onMouseLeave={() => hover && setHov(false)}
      style={{
        background: T.surface, backdropFilter: "blur(26px)",
        border: `1px solid ${hov ? T.borderStrong : T.border}`,
        borderRadius: 18,
        boxShadow: hov ? "0 20px 60px rgba(0,0,0,0.18)" : "0 4px 24px rgba(0,0,0,0.08)",
        transform: hov ? "translateY(-2px)" : "none",
        transition: "all .25s ease",
        cursor: onClick ? "pointer" : "default",
        ...style,
      }}>
      {children}
    </div>
  );
}

// ─── Input ────────────────────────────────────────────────────────────────────
function Input({ label, T, error, ...props }) {
  const [focused, setFocused] = useState(false);
  return (
    <div>
      {label && <label style={{ display: "block", fontSize: 11, color: T.muted, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".06em", marginBottom: 7 }}>{label}</label>}
      <input {...props} style={{
        width: "100%", padding: "11px 14px", borderRadius: 10,
        background: T.input,
        border: `1px solid ${error ? "rgba(239,68,68,0.5)" : focused ? "rgba(99,102,241,0.55)" : T.inputBorder}`,
        color: T.text, fontSize: 14, fontFamily: "inherit", outline: "none",
        transition: "border-color .2s, box-shadow .2s", boxSizing: "border-box",
        boxShadow: focused ? "0 0 0 3px rgba(99,102,241,0.1)" : "none",
        ...props.style,
      }}
        onFocus={(e) => { setFocused(true); props.onFocus?.(e); }}
        onBlur={(e) => { setFocused(false); props.onBlur?.(e); }}
      />
      {error && <p style={{ fontSize: 11, color: "#f87171", marginTop: 5 }}>{error}</p>}
    </div>
  );
}

function Select({ label, children, T, ...props }) {
  return (
    <div>
      {label && <label style={{ display: "block", fontSize: 11, color: T.muted, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".06em", marginBottom: 7 }}>{label}</label>}
      <select {...props} style={{
        width: "100%", padding: "11px 14px", borderRadius: 10,
        background: T.input, border: `1px solid ${T.inputBorder}`,
        color: T.text, fontSize: 14, fontFamily: "inherit", outline: "none", boxSizing: "border-box",
      }}>
        {children}
      </select>
    </div>
  );
}

// ─── Button ───────────────────────────────────────────────────────────────────
function Btn({ children, variant = "primary", loading, T, style = {}, ...props }) {
  const variants = {
    primary: { background: "linear-gradient(135deg,#6366f1,#8b5cf6)", color: "white", border: "none", boxShadow: "0 4px 20px rgba(99,102,241,.3)" },
    ghost: { background: T?.btnGhost || "rgba(255,255,255,0.06)", border: `1px solid ${T?.btnGhostBorder || "rgba(255,255,255,0.1)"}`, color: T?.btnGhostText || "#e2e8f0" },
    danger: { background: T?.btnDanger || "rgba(239,68,68,0.1)", border: `1px solid ${T?.btnDangerBorder || "rgba(239,68,68,0.2)"}`, color: T?.btnDangerText || "#f87171" },
    success: { background: "linear-gradient(135deg,#22c55e,#16a34a)", color: "white", border: "none", boxShadow: "0 4px 20px rgba(34,197,94,.22)" },
    warning: { background: "rgba(245,158,11,0.12)", border: "1px solid rgba(245,158,11,0.3)", color: "#f59e0b" },
  };
  return (
    <button {...props} style={{
      display: "inline-flex", alignItems: "center", gap: 7,
      padding: "11px 20px", borderRadius: 11, fontSize: 14,
      fontWeight: 700, cursor: loading ? "not-allowed" : "pointer",
      fontFamily: "inherit", transition: "all .2s",
      opacity: loading ? 0.7 : 1,
      ...variants[variant],
      ...style,
    }}
      onMouseEnter={e => { if (!loading) e.currentTarget.style.filter = "brightness(1.1)"; }}
      onMouseLeave={e => { e.currentTarget.style.filter = "none"; }}
    >
      {loading ? <Spinner size={16} color={variant === "primary" || variant === "success" ? "white" : "#6366f1"} /> : children}
    </button>
  );
}

// ─── Payment Limit Warning Banner ─────────────────────────────────────────────
function PaymentLimitBanner({ amount, paymentLimit, T }) {
  if (!paymentLimit || !amount || parseFloat(amount) <= 0) return null;
  const val = parseFloat(amount);
  const over = val > paymentLimit;
  const near = val > paymentLimit * 0.8 && !over;
  if (!over && !near) return null;
  return (
    <div style={{
      display: "flex", alignItems: "flex-start", gap: 12,
      padding: "12px 16px", borderRadius: 12,
      background: over ? T.dangerBg : T.warningBg,
      border: `1px solid ${over ? T.dangerBorder : T.warningBorder}`,
      animation: over ? "warningPulse 1.8s ease-in-out infinite" : "none",
    }}>
      <TriangleAlert size={18} color={over ? T.dangerText : T.warningText} style={{ flexShrink: 0, marginTop: 1 }} />
      <div>
        <p style={{ fontWeight: 700, fontSize: 13, color: over ? T.dangerText : T.warningText, marginBottom: 2 }}>
          {over ? "Payment Limit Exceeded" : "Approaching Payment Limit"}
        </p>
        <p style={{ fontSize: 12, color: T.textSub }}>
          {over
            ? `This payment (${fmt(val)}) exceeds your set limit of ${fmt(paymentLimit)}. Please review before confirming.`
            : `This payment (${fmt(val)}) is close to your limit of ${fmt(paymentLimit)}.`}
        </p>
      </div>
    </div>
  );
}

// ─── Auth Screen ──────────────────────────────────────────────────────────────
function AuthScreen({ onLogin, toast, T }) {
  const [mode, setMode] = useState("login");
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", password: "", phone: "" });
  const set = k => e => setForm(p => ({ ...p, [k]: e.target.value }));
  const demoAccounts = [
    { label: "XYZ Demo", email: "xyz@payvault.com", password: "XYZ1234" },
    { label: "Alex Demo", email: "alex@payvault.com", password: "ALEX1234" },
    { label: "Sam Demo", email: "sam@payvault.com", password: "SAM1234" },
    { label: "Maya Demo", email: "maya@payvault.com", password: "MAYA1234" },
  ];

  const submit = async () => {
    if (loading) return;
    setLoading(true);
    try {
      let data;
      if (mode === "login") {
        const body = new URLSearchParams({ username: form.email, password: form.password });
        const res = await fetchWithTimeout(`${API}/auth/login`, { method: "POST", body, headers: { "Content-Type": "application/x-www-form-urlencoded" } });
        if (!res.ok) {
          const error = await res.json().catch(() => ({}));
          throw new Error(error.detail || `Login failed (${res.status})`);
        }
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
    <div style={{ minHeight: "100vh", background: T.bg, display: "flex", alignItems: "center", justifyContent: "center", padding: 20, position: "relative", overflow: "hidden" }}>
      <div style={{ position: "absolute", top: "20%", left: "15%", width: 500, height: 500, background: "radial-gradient(circle, rgba(99,102,241,0.1) 0%, transparent 70%)", pointerEvents: "none" }} />
      <div style={{ position: "absolute", bottom: "10%", right: "10%", width: 400, height: 400, background: "radial-gradient(circle, rgba(139,92,246,0.08) 0%, transparent 70%)", pointerEvents: "none" }} />

      <div style={{ width: "100%", maxWidth: 420, position: "relative", zIndex: 1 }}>
        <div style={{ textAlign: "center", marginBottom: 40 }}>
          <div style={{ width: 56, height: 56, borderRadius: 16, background: "linear-gradient(135deg,#6366f1,#8b5cf6)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px", boxShadow: "0 8px 32px rgba(99,102,241,0.35)" }}>
            <Wallet size={26} color="white" />
          </div>
          <h1 style={{ fontFamily: "'Playfair Display',serif", fontSize: 30, color: T.text, margin: 0 }}>PayVault</h1>
          <p style={{ color: T.muted, fontSize: 14, marginTop: 6 }}>Secure payments. Smart finance.</p>
        </div>

        <Card T={T} style={{ padding: 32 }}>
          <div style={{ display: "flex", background: T.cardAccent, borderRadius: 10, padding: 4, marginBottom: 28 }}>
            {["login", "register"].map(m => (
              <button key={m} onClick={() => setMode(m)} style={{
                flex: 1, padding: "9px 0", borderRadius: 8, border: "none", cursor: "pointer",
                fontFamily: "inherit", fontWeight: 700, fontSize: 13,
                background: mode === m ? "linear-gradient(135deg,#6366f1,#8b5cf6)" : "transparent",
                color: mode === m ? "white" : T.muted, transition: "all .2s",
              }}>{m === "login" ? "Sign In" : "Register"}</button>
            ))}
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {mode === "register" && <>
              <Input T={T} label="Full Name" autoComplete="off" value={form.name} onChange={set("name")} onKeyDown={e => e.key === "Enter" && submit()} />
              <Input T={T} label="Phone" autoComplete="off" value={form.phone} onChange={set("phone")} onKeyDown={e => e.key === "Enter" && submit()} />
            </>}
            <Input T={T} label="Email Address" type="email" autoComplete="off" value={form.email} onChange={set("email")} onKeyDown={e => e.key === "Enter" && submit()} />
            <Input T={T} label="Password" type="password" autoComplete="off" value={form.password} onChange={set("password")} onKeyDown={e => e.key === "Enter" && submit()} />
            {mode === "login" && (
              <div style={{ background: T.reviewCard, border: `1px solid ${T.reviewCardBorder}`, borderRadius: 10, padding: "12px 14px", fontSize: 12, color: T.textSub }}>
                <div style={{ color: T.text, fontWeight: 800, marginBottom: 4 }}>Demo access</div>
                <div style={{ marginBottom: 10 }}>Demo wallets use sample balances and simulated transfers only. No real money moves.</div>
                <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
                  <div style={{ borderRadius: 8, padding: "8px 9px", background: "rgba(99,102,241,0.12)", border: "1px solid rgba(99,102,241,0.22)" }}>
                    <strong style={{ color: T.text }}>Demo — xyz@payvault.com / XYZ1234</strong>
                  </div>
                  {demoAccounts.slice(1).map(account => (
                    <button
                      key={account.email}
                      type="button"
                      onClick={() => setForm(p => ({ ...p, email: account.email, password: account.password }))}
                      style={{
                        display: "flex", alignItems: "center", justifyContent: "space-between",
                        gap: 8, width: "100%", textAlign: "left", padding: "7px 9px",
                        borderRadius: 8, border: `1px solid ${T.border}`, background: "transparent",
                        color: T.textSub, fontFamily: "inherit", fontSize: 11, cursor: "pointer",
                      }}
                    >
                      <span><strong style={{ color: T.text }}>{account.label}</strong><br />{account.email} / {account.password}</span>
                      <span style={{ color: T.navActiveText, fontWeight: 700, flexShrink: 0 }}>Use account</span>
                    </button>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={() => setForm(p => ({ ...p, email: demoAccounts[0].email, password: demoAccounts[0].password }))}
                  style={{
                    marginTop: 9, width: "100%", padding: "7px 9px", borderRadius: 8,
                    border: "1px solid rgba(99,102,241,0.22)", background: "transparent",
                    color: T.navActiveText, fontFamily: "inherit", fontSize: 11, fontWeight: 700,
                    cursor: "pointer", textAlign: "left",
                  }}
                >
                  Use XYZ Demo account
                </button>
              </div>
            )}
            <Btn T={T} variant="primary" loading={loading} style={{ width: "100%", justifyContent: "center", marginTop: 4 }} onClick={submit}>
              {mode === "login" ? "Sign In" : "Create Account"}
            </Btn>
          </div>
        </Card>

        <p style={{ textAlign: "center", color: T.muted, fontSize: 12, marginTop: 24, display: "flex", alignItems: "center", justifyContent: "center", gap: 5 }}>
          <Shield size={12} /> 256-bit encrypted · NPCI compliant
        </p>
      </div>
    </div>
  );
}

// ─── Modal ────────────────────────────────────────────────────────────────────
function Modal({ onClose, title, children, T, width = 460 }) {
  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 50, display: "flex", alignItems: "center", justifyContent: "center", padding: 16, background: "rgba(0,0,0,0.55)", backdropFilter: "blur(8px)" }} onClick={onClose}>
      <div style={{ width: "100%", maxWidth: width, background: T.surface, backdropFilter: "blur(30px)", border: `1px solid ${T.borderStrong}`, borderRadius: 20, padding: "24px 24px 28px", boxShadow: "0 32px 80px rgba(0,0,0,0.4)", maxHeight: "92vh", overflowY: "auto" }} onClick={e => e.stopPropagation()}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 22 }}>
          <h3 style={{ fontFamily: "'Playfair Display',serif", fontSize: 20, color: T.text, margin: 0 }}>{title}</h3>
          <button onClick={onClose} style={{ background: T.cardAccent, border: `1px solid ${T.border}`, borderRadius: 8, width: 32, height: 32, cursor: "pointer", color: T.muted, display: "flex", alignItems: "center", justifyContent: "center" }}><X size={15} /></button>
        </div>
        {children}
      </div>
    </div>
  );
}

// ─── Send Money Modal ─────────────────────────────────────────────────────────
function SendMoneyModal({ contacts, token, user, onClose, onSuccess, toast, T, paymentLimit }) {
  const [step, setStep] = useState(1);
  const [recipient, setRecipient] = useState(null);
  const [upiInput, setUpiInput] = useState("");
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [category, setCategory] = useState("Transfer");
  const [loading, setLoading] = useState(false);
  const [limitAcknowledged, setLimitAcknowledged] = useState(false);

  const amtNum = parseFloat(amount) || 0;
  const limitExceeded = paymentLimit > 0 && amtNum > paymentLimit;
  const canProceedFromAmount = amount && (!limitExceeded || limitAcknowledged);

  const handleSend = async () => {
    setLoading(true);
    try {
      const data = await apiFetch("/pay", {
        method: "POST",
        body: JSON.stringify({ recipient_upi: recipient.upi || upiInput, recipient_name: recipient.name, amount: amtNum, note, category }),
      }, token);
      onSuccess(data);
      setStep(4);
      toast(`${fmt(amtNum)} sent to ${recipient.name} ✅`);
    } catch (e) {
      toast(e.message, "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal onClose={onClose} title="Send Money" T={T}>
      {/* Step 1 — Recipient */}
      {step === 1 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <Input T={T} label="UPI ID / Phone" placeholder="name@upi or +91XXXXXXXXXX" value={upiInput} onChange={e => setUpiInput(e.target.value)} />
          <div>
            <p style={{ fontSize: 11, color: T.muted, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".06em", marginBottom: 10 }}>Recent Contacts</p>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {contacts.map(c => (
                <div key={c.id} onClick={() => { setRecipient(c); setStep(2); }}
                  style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 14px", borderRadius: 12, background: T.contactCard, border: `1px solid ${T.contactCardBorder}`, cursor: "pointer", transition: "all .2s" }}
                  onMouseEnter={e => { e.currentTarget.style.background = T.navActive; e.currentTarget.style.borderColor = T.heroBorder; }}
                  onMouseLeave={e => { e.currentTarget.style.background = T.contactCard; e.currentTarget.style.borderColor = T.contactCardBorder; }}>
                  <div style={{ width: 38, height: 38, borderRadius: 10, background: c.color + "22", border: `1px solid ${c.color}38`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 800, color: c.color }}>{c.avatar}</div>
                  <div style={{ flex: 1 }}>
                    <p style={{ fontWeight: 600, fontSize: 14, color: T.text }}>{c.name}</p>
                    <p style={{ fontSize: 12, color: T.muted }}>{c.upi}</p>
                  </div>
                  <ChevronRight size={15} color={T.muted} />
                </div>
              ))}
            </div>
          </div>
          {upiInput && (
            <Btn T={T} variant="primary" style={{ width: "100%", justifyContent: "center" }} onClick={() => { setRecipient({ name: upiInput, upi: upiInput, avatar: upiInput[0]?.toUpperCase(), color: "#6366f1" }); setStep(2); }}>
              Continue <ChevronRight size={15} />
            </Btn>
          )}
        </div>
      )}

      {/* Step 2 — Amount */}
      {step === 2 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <button onClick={() => setStep(1)} style={{ background: T.cardAccent, border: `1px solid ${T.border}`, borderRadius: 8, padding: "6px 10px", cursor: "pointer", color: T.muted, display: "flex" }}><ArrowLeft size={15} /></button>
            <div>
              <p style={{ fontWeight: 700, color: T.text }}>{recipient?.name}</p>
              <p style={{ fontSize: 12, color: T.muted }}>{recipient?.upi}</p>
            </div>
          </div>

          {/* Big amount input */}
          <div style={{ textAlign: "center", padding: "12px 0" }}>
            <p style={{ fontSize: 12, color: T.muted, marginBottom: 8, textTransform: "uppercase", letterSpacing: ".06em", fontWeight: 700 }}>Enter Amount</p>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 4 }}>
              <span style={{ fontFamily: "'Playfair Display',serif", fontSize: 34, color: "#6366f1" }}>₹</span>
              <input value={amount} onChange={e => { setAmount(e.target.value); setLimitAcknowledged(false); }} type="number" placeholder="0"
                style={{ fontFamily: "'Playfair Display',serif", fontSize: 46, color: T.text, background: "transparent", border: "none", outline: "none", width: "170px", textAlign: "center" }} />
            </div>
            {paymentLimit > 0 && (
              <p style={{ fontSize: 12, color: T.muted, marginTop: 6 }}>
                Your payment limit: <strong style={{ color: T.text }}>{fmt(paymentLimit)}</strong>
              </p>
            )}
            <div style={{ display: "flex", gap: 7, justifyContent: "center", marginTop: 12, flexWrap: "wrap" }}>
              {[100, 500, 1000, 2000, 5000].map(q => (
                <button key={q} onClick={() => { setAmount(String(q)); setLimitAcknowledged(false); }}
                  style={{ padding: "5px 12px", borderRadius: 999, background: T.navActive, border: `1px solid ${T.heroBorder}`, color: T.navActiveText, fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>₹{q}</button>
              ))}
            </div>
          </div>

          {/* Warning banner */}
          <PaymentLimitBanner amount={amount} paymentLimit={paymentLimit} T={T} />

          {/* Acknowledge checkbox if limit exceeded */}
          {limitExceeded && (
            <label style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer", padding: "10px 14px", borderRadius: 10, background: T.dangerBg, border: `1px solid ${T.dangerBorder}` }}>
              <input type="checkbox" checked={limitAcknowledged} onChange={e => setLimitAcknowledged(e.target.checked)}
                style={{ width: 16, height: 16, cursor: "pointer", accentColor: "#6366f1" }} />
              <span style={{ fontSize: 13, color: T.dangerText, fontWeight: 600 }}>
                I understand this exceeds my payment limit and wish to proceed
              </span>
            </label>
          )}

          <Input T={T} label="Note (optional)" placeholder="Dinner split, rent, etc." value={note} onChange={e => setNote(e.target.value)} />
          <Select T={T} label="Category" value={category} onChange={e => setCategory(e.target.value)}>
            {CATEGORIES.map(c => <option key={c}>{c}</option>)}
          </Select>

          <Btn T={T} variant={limitExceeded && !limitAcknowledged ? "warning" : "primary"}
            style={{ width: "100%", justifyContent: "center", opacity: (!amount || (limitExceeded && !limitAcknowledged)) ? 0.5 : 1 }}
            onClick={() => canProceedFromAmount && setStep(3)}>
            {limitExceeded && !limitAcknowledged ? <><TriangleAlert size={15} /> Acknowledge Limit First</> : "Review Payment"}
          </Btn>
        </div>
      )}

      {/* Step 3 — Confirm */}
      {step === 3 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
          {limitExceeded && (
            <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", borderRadius: 10, background: T.dangerBg, border: `1px solid ${T.dangerBorder}` }}>
              <TriangleAlert size={16} color={T.dangerText} />
              <p style={{ fontSize: 12, color: T.dangerText, fontWeight: 600, margin: 0 }}>Above your payment limit of {fmt(paymentLimit)}</p>
            </div>
          )}
          <div style={{ background: T.reviewCard, border: `1px solid ${T.reviewCardBorder}`, borderRadius: 14, padding: 20 }}>
            {[["To", recipient?.name], ["UPI ID", recipient?.upi], note && ["Note", note], ["Category", category]].filter(Boolean).map(([lbl, val]) => (
              <div key={lbl} style={{ display: "flex", justifyContent: "space-between", marginBottom: 12 }}>
                <span style={{ color: T.muted, fontSize: 13 }}>{lbl}</span>
                <span style={{ fontWeight: 600, fontSize: 13, color: T.text }}>{val}</span>
              </div>
            ))}
            <div style={{ display: "flex", justifyContent: "space-between", borderTop: `1px solid ${T.border}`, paddingTop: 14 }}>
              <span style={{ color: T.muted, fontSize: 13 }}>Amount</span>
              <span style={{ fontFamily: "'Playfair Display',serif", fontSize: 26, color: "#818cf8" }}>{fmt(amtNum)}</span>
            </div>
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            <Btn T={T} variant="ghost" style={{ flex: 1, justifyContent: "center" }} onClick={() => setStep(2)}>Edit</Btn>
            <Btn T={T} variant="success" loading={loading} style={{ flex: 2, justifyContent: "center" }} onClick={handleSend}>
              <Send size={15} /> Confirm & Pay
            </Btn>
          </div>
        </div>
      )}

      {/* Step 4 — Done */}
      {step === 4 && (
        <div style={{ textAlign: "center", padding: "24px 0" }}>
          <div style={{ width: 64, height: 64, borderRadius: "50%", background: "rgba(34,197,94,0.12)", border: "2px solid rgba(34,197,94,0.3)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 20px" }}>
            <CheckCircle2 size={30} color="#4ade80" />
          </div>
          <h3 style={{ fontFamily: "'Playfair Display',serif", fontSize: 22, color: T.text, marginBottom: 8 }}>Payment Sent!</h3>
          <p style={{ color: T.muted, fontSize: 14 }}>{fmt(amtNum)} sent to {recipient?.name}</p>
          <Btn T={T} variant="ghost" style={{ marginTop: 24, width: "100%", justifyContent: "center" }} onClick={onClose}>Done</Btn>
        </div>
      )}
    </Modal>
  );
}

// ─── Add Expense Modal ────────────────────────────────────────────────────────
function AddExpenseModal({ token, onClose, onSuccess, toast, T }) {
  const [form, setForm] = useState({ description: "", amount: "", category: "Food", type: "debit", date: new Date().toISOString().split("T")[0], recurring: false });
  const [loading, setLoading] = useState(false);
  const set = k => e => setForm(p => ({ ...p, [k]: e.target.value }));

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
    <Modal onClose={onClose} title="Add Transaction" T={T}>
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <div style={{ display: "flex", gap: 8 }}>
          {[["debit", "Expense", "#ef4444"], ["credit", "Income", "#22c55e"]].map(([val, label, color]) => (
            <button key={val} onClick={() => setForm(p => ({ ...p, type: val }))} style={{
              flex: 1, padding: "10px 0", borderRadius: 10,
              border: `1px solid ${form.type === val ? color + "55" : T.border}`,
              background: form.type === val ? color + "12" : "transparent",
              color: form.type === val ? color : T.muted,
              fontWeight: 700, fontSize: 13, cursor: "pointer", fontFamily: "inherit", transition: "all .2s",
            }}>{label}</button>
          ))}
        </div>
        <Input T={T} label="Description" placeholder="What was this for?" value={form.description} onChange={set("description")} />
        <Input T={T} label="Amount (₹)" type="number" placeholder="0.00" value={form.amount} onChange={set("amount")} />
        <Select T={T} label="Category" value={form.category} onChange={set("category")}>
          {CATEGORIES.map(c => <option key={c}>{c}</option>)}
        </Select>
        <Input T={T} label="Date" type="date" value={form.date} onChange={set("date")} />
        <label style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer", padding: "10px 14px", borderRadius: 10, background: form.recurring ? T.navActive : T.statBg, border: `1px solid ${form.recurring ? T.heroBorder : T.border}`, transition: "all .2s" }}>
          <input type="checkbox" checked={form.recurring} onChange={e => setForm(p => ({ ...p, recurring: e.target.checked }))} style={{ accentColor: "#6366f1" }} />
          <Repeat size={14} color={form.recurring ? T.navActiveText : T.muted} />
          <span style={{ fontSize: 13, fontWeight: 600, color: form.recurring ? T.navActiveText : T.muted }}>Mark as recurring</span>
        </label>
        <Btn T={T} variant="primary" loading={loading} style={{ width: "100%", justifyContent: "center" }} onClick={submit}>
          <Plus size={15} /> Add Transaction
        </Btn>
      </div>
    </Modal>
  );
}

// ─── Payment Limit Settings Modal ─────────────────────────────────────────────
function PaymentLimitModal({ paymentLimit, onSave, onClose, T }) {
  const [val, setVal] = useState(paymentLimit > 0 ? String(paymentLimit) : "");

  return (
    <Modal onClose={onClose} title="Payment Limit" T={T} width={380}>
      <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
        <div style={{ padding: "14px 16px", borderRadius: 12, background: T.warningBg, border: `1px solid ${T.warningBorder}` }}>
          <div style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
            <TriangleAlert size={16} color={T.warningText} style={{ marginTop: 2, flexShrink: 0 }} />
            <p style={{ fontSize: 13, color: T.textSub, lineHeight: 1.5 }}>
              Set a per-transaction limit. You'll see a warning when any single payment exceeds this amount. Set to 0 to disable.
            </p>
          </div>
        </div>
        <Input T={T} label="Payment limit (₹)" type="number" placeholder="e.g. 5000" value={val} onChange={e => setVal(e.target.value)} />
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {[1000, 5000, 10000, 25000, 50000].map(q => (
            <button key={q} onClick={() => setVal(String(q))} style={{ padding: "5px 12px", borderRadius: 999, background: T.navActive, border: `1px solid ${T.heroBorder}`, color: T.navActiveText, fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>
              {fmt(q)}
            </button>
          ))}
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <Btn T={T} variant="ghost" style={{ flex: 1, justifyContent: "center" }} onClick={() => { onSave(0); onClose(); }}>Disable</Btn>
          <Btn T={T} variant="primary" style={{ flex: 2, justifyContent: "center" }} onClick={() => { onSave(parseFloat(val) || 0); onClose(); }}>
            <Check size={15} /> Save Limit
          </Btn>
        </div>
      </div>
    </Modal>
  );
}

// ─── Edit Transaction Modal ───────────────────────────────────────────────────
function EditTxnModal({ txn, onClose, onSave, T }) {
  const [form, setForm] = useState({ description: txn.description, category: txn.category });
  const set = k => e => setForm(p => ({ ...p, [k]: e.target.value }));
  return (
    <Modal onClose={onClose} title="Edit Transaction" T={T} width={380}>
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <Input T={T} label="Description" value={form.description} onChange={set("description")} />
        <Select T={T} label="Category" value={form.category} onChange={set("category")}>
          {CATEGORIES.map(c => <option key={c}>{c}</option>)}
        </Select>
        <div style={{ display: "flex", gap: 10 }}>
          <Btn T={T} variant="ghost" style={{ flex: 1, justifyContent: "center" }} onClick={onClose}>Cancel</Btn>
          <Btn T={T} variant="primary" style={{ flex: 2, justifyContent: "center" }} onClick={() => { onSave(txn.id, form); onClose(); }}>
            <Check size={14} /> Save Changes
          </Btn>
        </div>
      </div>
    </Modal>
  );
}

// ─── Budget Modal ──────────────────────────────────────────────────────────────
function BudgetModal({ budgets, onSave, onClose, T, analytics }) {
  const [vals, setVals] = useState({ ...budgets });
  return (
    <Modal onClose={onClose} title="Category Budgets" T={T} width={460}>
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <p style={{ fontSize: 13, color: T.textSub, margin: 0 }}>Set monthly spending limits per category. Leave blank to disable.</p>
        {CATEGORIES.filter(c => c !== "Income").map(cat => {
          const meta = CAT_META[cat];
          const spent = analytics?.by_category?.[cat] || 0;
          const budget = parseFloat(vals[cat]) || 0;
          const pct = budget > 0 ? Math.min((spent / budget) * 100, 100) : 0;
          return (
            <div key={cat} style={{ padding: "12px 14px", borderRadius: 12, background: T.statBg, border: `1px solid ${T.border}` }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: budget > 0 ? 10 : 0 }}>
                <span style={{ width: 28, height: 28, borderRadius: 8, background: meta.color + "18", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <meta.icon size={14} color={meta.color} />
                </span>
                <span style={{ flex: 1, fontSize: 13, fontWeight: 600, color: T.text }}>{cat}</span>
                <input
                  type="number" placeholder="No limit"
                  value={vals[cat] || ""}
                  onChange={e => setVals(p => ({ ...p, [cat]: e.target.value }))}
                  style={{ width: 100, padding: "6px 10px", borderRadius: 8, background: T.input, border: `1px solid ${T.inputBorder}`, color: T.text, fontSize: 13, fontFamily: "inherit", outline: "none", textAlign: "right" }}
                />
              </div>
              {budget > 0 && (
                <div>
                  <div style={{ height: 5, borderRadius: 999, background: T.cardAccent, overflow: "hidden" }}>
                    <div style={{ height: "100%", width: `${pct}%`, borderRadius: 999, background: pct > 90 ? "#ef4444" : pct > 70 ? "#f59e0b" : meta.color, transition: "width .5s" }} />
                  </div>
                  <p style={{ fontSize: 11, color: T.muted, marginTop: 4 }}>{fmt(spent)} of {fmt(budget)} spent</p>
                </div>
              )}
            </div>
          );
        })}
        <div style={{ display: "flex", gap: 10, marginTop: 4 }}>
          <Btn T={T} variant="ghost" style={{ flex: 1, justifyContent: "center" }} onClick={onClose}>Cancel</Btn>
          <Btn T={T} variant="primary" style={{ flex: 2, justifyContent: "center" }} onClick={() => { onSave(vals); onClose(); }}>
            <Check size={14} /> Save Budgets
          </Btn>
        </div>
      </div>
    </Modal>
  );
}

// ─── Split Bill Modal ──────────────────────────────────────────────────────────
function SplitBillModal({ contacts, onClose, T }) {
  const [desc, setDesc] = useState("");
  const [total, setTotal] = useState("");
  const [selected, setSelected] = useState([]);
  const [includeMe, setIncludeMe] = useState(true);

  const people = includeMe ? selected.length + 1 : selected.length;
  const perPerson = people > 0 && total ? (parseFloat(total) / people).toFixed(2) : 0;

  const toggle = id => setSelected(p => p.includes(id) ? p.filter(x => x !== id) : [...p, id]);

  return (
    <Modal onClose={onClose} title="Split Bill" T={T} width={420}>
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <Input T={T} label="What's this for?" placeholder="Dinner, trip, etc." value={desc} onChange={e => setDesc(e.target.value)} />
        <Input T={T} label="Total Amount (₹)" type="number" placeholder="0" value={total} onChange={e => setTotal(e.target.value)} />
        <div>
          <p style={{ fontSize: 11, color: T.muted, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".06em", marginBottom: 10 }}>Split With</p>
          <label style={{ display: "flex", alignItems: "center", gap: 10, padding: "9px 12px", borderRadius: 10, background: T.navActive, border: `1px solid ${T.heroBorder}`, cursor: "pointer", marginBottom: 8 }}>
            <input type="checkbox" checked={includeMe} onChange={e => setIncludeMe(e.target.checked)} style={{ accentColor: "#6366f1" }} />
            <span style={{ fontSize: 13, fontWeight: 600, color: T.navActiveText }}>Include me</span>
          </label>
          {contacts.map(c => (
            <label key={c.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "9px 12px", borderRadius: 10, background: selected.includes(c.id) ? T.navActive : T.contactCard, border: `1px solid ${selected.includes(c.id) ? T.heroBorder : T.contactCardBorder}`, cursor: "pointer", marginBottom: 6, transition: "all .15s" }}>
              <input type="checkbox" checked={selected.includes(c.id)} onChange={() => toggle(c.id)} style={{ accentColor: "#6366f1" }} />
              <span style={{ width: 28, height: 28, borderRadius: 8, background: c.color + "22", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 800, color: c.color }}>{c.avatar}</span>
              <span style={{ fontSize: 13, fontWeight: 600, color: T.text }}>{c.name}</span>
            </label>
          ))}
        </div>
        {perPerson > 0 && (
          <div style={{ padding: "14px 16px", borderRadius: 12, background: T.reviewCard, border: `1px solid ${T.reviewCardBorder}`, textAlign: "center" }}>
            <p style={{ fontSize: 12, color: T.muted, marginBottom: 4 }}>Each person pays</p>
            <p style={{ fontFamily: "'Playfair Display',serif", fontSize: 28, color: "#818cf8", margin: 0 }}>{fmt(perPerson)}</p>
            <p style={{ fontSize: 12, color: T.muted, marginTop: 4 }}>{people} people · {fmt(total)} total</p>
          </div>
        )}
        <Btn T={T} variant="ghost" style={{ width: "100%", justifyContent: "center" }} onClick={onClose}>Done</Btn>
      </div>
    </Modal>
  );
}

// ─── CSV Export ────────────────────────────────────────────────────────────────
function exportCSV(transactions) {
  const rows = [["Date", "Description", "Category", "Type", "Amount", "To/From", "Status"]];
  transactions.forEach(t => rows.push([t.date, t.description, t.category, t.type, t.amount, t.to_from, t.status]));
  const csv = rows.map(r => r.map(v => `"${v}"`).join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a"); a.href = url; a.download = "payvault_transactions.csv"; a.click();
  URL.revokeObjectURL(url);
}

// ─── Transaction Row ───────────────────────────────────────────────────────────
function TxnRow({ t, hideBalance, onDelete, onEdit, showDelete, T }) {
  const meta = CAT_META[t.category] || { icon: Package, color: "#6b7280" };
  const isCredit = t.type === "credit";
  const [hov, setHov] = useState(false);

  return (
    <div onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
      style={{ display: "flex", alignItems: "center", gap: 12, padding: "11px 10px", borderRadius: 11, background: hov ? T.rowHover : "transparent", transition: "background .15s" }}>
      <div style={{ width: 40, height: 40, borderRadius: 11, background: meta.color + "18", border: `1px solid ${meta.color}30`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
        <meta.icon size={18} color={meta.color} />
      </div>
      <div style={{ flex: 1, overflow: "hidden" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <p style={{ fontSize: 14, fontWeight: 600, color: T.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", margin: 0 }}>{t.description}</p>
          {t.recurring && <Repeat size={11} color={T.navActiveText} title="Recurring" />}
        </div>
        <p style={{ fontSize: 11, color: T.txnMeta, margin: 0 }}>{t.date} · {t.to_from} · <span style={{ color: meta.color }}>{t.category}</span></p>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
        <p style={{ fontFamily: "'Playfair Display',serif", fontSize: 16, color: isCredit ? "#4ade80" : "#f87171", fontWeight: 700, margin: 0 }}>
          {isCredit ? "+" : "−"}{hideBalance ? "•••" : fmt(t.amount)}
        </p>
        {showDelete && hov && (
          <>
            <button onClick={() => onEdit(t)} style={{ background: T.navActive, border: `1px solid ${T.heroBorder}`, borderRadius: 7, padding: "5px 8px", cursor: "pointer", color: T.navActiveText, display: "flex" }}>
              <Pencil size={13} />
            </button>
            <button onClick={() => onDelete(t.id)} style={{ background: T.btnDanger, border: `1px solid ${T.btnDangerBorder}`, borderRadius: 7, padding: "5px 8px", cursor: "pointer", color: T.btnDangerText, display: "flex" }}>
              <Trash2 size={13} />
            </button>
          </>
        )}
      </div>
    </div>
  );
}

function FilterPill({ label, active, onClick, T, color }) {
  return (
    <button onClick={onClick} style={{
      padding: "6px 14px", borderRadius: 999, fontSize: 12, fontWeight: 700, cursor: "pointer",
      border: `1px solid ${active ? (color || "#6366f1") + "55" : T.border}`,
      background: active ? (color || "#6366f1") + "15" : T.pill,
      color: active ? (color || T.navActiveText) : T.pillText,
      fontFamily: "inherit", transition: "all .15s",
    }}>{label}</button>
  );
}

function SecurityToggles({ T }) {
  const [twoFA, setTwoFA] = useState(false);
  const [biometric, setBiometric] = useState(true);
  const [alerts, setAlerts] = useState(true);
  const items = [["Two-Factor Auth", twoFA, setTwoFA, Lock], ["Biometric Login", biometric, setBiometric, Fingerprint], ["Transaction Alerts", alerts, setAlerts, Bell]];
  return (
    <>
      {items.map(([label, on, setOn, Icon]) => (
        <div key={label} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 0", borderBottom: `1px solid ${T.border}` }}>
          <span style={{ fontSize: 14, color: T.text, display: "flex", alignItems: "center", gap: 8 }}><Icon size={15} color={T.muted} />{label}</span>
          <div onClick={() => setOn(p => !p)} style={{ width: 40, height: 22, borderRadius: 999, background: on ? "rgba(99,102,241,0.8)" : T.statBg, border: `1px solid ${on ? "rgba(99,102,241,0.4)" : T.border}`, position: "relative", cursor: "pointer", transition: "all .2s" }}>
            <div style={{ width: 16, height: 16, borderRadius: "50%", background: "white", position: "absolute", top: 2, left: on ? 20 : 2, transition: "left .2s", boxShadow: "0 1px 4px rgba(0,0,0,0.2)" }} />
          </div>
        </div>
      ))}
    </>
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
  const T = THEMES[theme];

  // Payment limit
  const [paymentLimit, setPaymentLimit] = useState(() => parseFloat(localStorage.getItem("pv_limit") || "0"));
  const [showLimitModal, setShowLimitModal] = useState(false);

  // Budgets
  const [budgets, setBudgets] = useState(() => JSON.parse(localStorage.getItem("pv_budgets") || "{}"));
  const [showBudgetModal, setShowBudgetModal] = useState(false);

  // New modals
  const [showSplitModal, setShowSplitModal] = useState(false);
  const [editTxn, setEditTxn] = useState(null);

  // Date range filter
  const [dateRange, setDateRange] = useState("all"); // all | today | week | month | custom
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");

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
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Filters
  const [search, setSearch] = useState("");
  const [catFilter, setCatFilter] = useState("all");

  const [copied, setCopied] = useState(false);

  useEffect(() => { localStorage.setItem("pv_theme", theme); }, [theme]);
  useEffect(() => { localStorage.setItem("pv_limit", String(paymentLimit)); }, [paymentLimit]);
  useEffect(() => { localStorage.setItem("pv_budgets", JSON.stringify(budgets)); }, [budgets]);

  // Auth restore
  useEffect(() => {
    if (!token) return;
    apiFetch("/auth/me", {}, token).then(setUser).catch(() => { localStorage.removeItem("pv_token"); setToken(null); });
  }, [token]);

  // Fetch data
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
      setWallet(w); setTransactions(t); setContacts(c); setAnalytics(a);
    } catch (e) { toast(e.message, "error"); }
    finally { setLoading(false); }
  }, [token]);

  useEffect(() => { if (user) fetchAll(); }, [user, fetchAll]);

  const handleLogin = (u, t) => { setUser(u); setToken(t); };
  const handleLogout = () => { localStorage.removeItem("pv_token"); setToken(null); setUser(null); };
  const handlePaySuccess = d => { setWallet(w => ({ ...w, balance: d.new_balance })); setTransactions(p => [d.transaction, ...p]); fetchAll(); };
  const handleExpenseAdded = txn => { setTransactions(p => [txn, ...p]); fetchAll(); };
  const handleDeleteTxn = async id => {
    try {
      await apiFetch(`/transactions/${id}`, { method: "DELETE" }, token);
      setTransactions(p => p.filter(t => t.id !== id));
      fetchAll();
      toast("Transaction removed", "info");
    } catch (e) { toast(e.message, "error"); }
  };
  const copyUpi = () => {
    if (wallet?.upi_id) { navigator.clipboard.writeText(wallet.upi_id); setCopied(true); setTimeout(() => setCopied(false), 2000); }
  };

  const handleEditTxn = (id, changes) => {
    setTransactions(p => p.map(t => t.id === id ? { ...t, ...changes } : t));
    toast("Transaction updated");
  };

  const filteredTxns = transactions.filter(t => {
    const matchCat = catFilter === "all" || t.category === catFilter;
    const matchSearch = !search || t.description.toLowerCase().includes(search.toLowerCase()) || (t.to_from || "").toLowerCase().includes(search.toLowerCase());
    let matchDate = true;
    if (dateRange !== "all" && t.date) {
      const d = new Date(t.date); const now = new Date();
      if (dateRange === "today") matchDate = t.date === now.toISOString().split("T")[0];
      else if (dateRange === "week") { const w = new Date(now); w.setDate(now.getDate() - 7); matchDate = d >= w; }
      else if (dateRange === "month") matchDate = d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
      else if (dateRange === "custom") {
        if (customFrom) matchDate = matchDate && t.date >= customFrom;
        if (customTo) matchDate = matchDate && t.date <= customTo;
      }
    }
    return matchCat && matchSearch && matchDate;
  });

  const navItems = [
    { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
    { id: "send", label: "Send Money", icon: Send, action: () => { setShowSend(true); setSidebarOpen(false); } },
    { id: "expenses", label: "Expenses", icon: Receipt },
    { id: "analytics", label: "Analytics", icon: BarChart3 },
    { id: "settings", label: "Settings", icon: Settings },
  ];

  if (!token || !user) return (
    <>
      <GlobalStyles T={T} />
      <ToastStack toasts={toasts} T={T} />
      <AuthScreen onLogin={handleLogin} toast={toast} T={T} />
    </>
  );

  // ── Sidebar content (shared between desktop & mobile) ──
  const SidebarContent = () => (
    <>
      <div style={{ padding: "20px 18px", borderBottom: `1px solid ${T.border}` }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 36, height: 36, borderRadius: 10, background: "linear-gradient(135deg,#6366f1,#8b5cf6)", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 4px 16px rgba(99,102,241,0.3)", flexShrink: 0 }}>
            <Wallet size={18} color="white" />
          </div>
          <span style={{ fontFamily: "'Playfair Display',serif", fontSize: 18, color: T.text }}>PayVault</span>
        </div>
      </div>

      <nav style={{ flex: 1, padding: "12px 10px", display: "flex", flexDirection: "column", gap: 2 }}>
        {navItems.map(({ id, label, icon: Icon, action }) => {
          const active = page === id && !action;
          return (
            <button key={id} onClick={() => { if (action) action(); else { setPage(id); setSidebarOpen(false); } }}
              style={{
                display: "flex", alignItems: "center", gap: 10, padding: "10px 12px",
                borderRadius: 11, border: "none", cursor: "pointer", fontFamily: "inherit",
                fontSize: 13, fontWeight: 600, textAlign: "left", width: "100%",
                background: active ? T.navActive : "transparent",
                color: active ? T.navActiveText : T.navText,
                transition: "all .2s",
              }}
              onMouseEnter={e => { if (!active) { e.currentTarget.style.background = T.navHover; e.currentTarget.style.color = T.navHoverText; } }}
              onMouseLeave={e => { if (!active) { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = T.navText; } }}
            >
              <Icon size={16} />
              {label}
              {id === "send" && <span style={{ marginLeft: "auto", width: 6, height: 6, borderRadius: "50%", background: "#6366f1" }} />}
            </button>
          );
        })}

        {/* Payment Limit quick-set */}
        <div style={{ marginTop: 8, padding: "10px 12px", borderRadius: 11, border: `1px solid ${paymentLimit > 0 ? T.warningBorder : T.border}`, background: paymentLimit > 0 ? T.warningBg : "transparent" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
            <span style={{ fontSize: 11, color: T.muted, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".05em" }}>Pay Limit</span>
            <button onClick={() => setShowLimitModal(true)} style={{ background: "none", border: "none", cursor: "pointer", color: T.navActiveText, fontSize: 11, fontWeight: 700, fontFamily: "inherit", padding: 0 }}>Edit</button>
          </div>
          <p style={{ fontSize: 14, fontWeight: 700, color: paymentLimit > 0 ? T.warningText : T.muted, margin: 0 }}>
            {paymentLimit > 0 ? fmt(paymentLimit) : "Not set"}
          </p>
        </div>
      </nav>

      <div style={{ padding: "14px 12px", borderTop: `1px solid ${T.border}` }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
          <div style={{ width: 34, height: 34, borderRadius: 9, background: "linear-gradient(135deg,#6366f1,#8b5cf6)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 800, color: "white", flexShrink: 0 }}>{user.avatar}</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ fontSize: 13, fontWeight: 700, color: T.text, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", margin: 0 }}>{user.name}</p>
            <p style={{ fontSize: 11, color: T.muted, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", margin: 0 }}>{user.email}</p>
          </div>
        </div>
        <button onClick={handleLogout} style={{ display: "flex", alignItems: "center", gap: 7, width: "100%", padding: "8px 10px", borderRadius: 9, background: T.btnDanger, border: `1px solid ${T.btnDangerBorder}`, color: T.btnDangerText, cursor: "pointer", fontSize: 13, fontWeight: 600, fontFamily: "inherit" }}>
          <LogOut size={14} /> Sign Out
        </button>
      </div>
    </>
  );

  return (
    <>
      <GlobalStyles T={T} />
      <ToastStack toasts={toasts} T={T} />

      {showSend && <SendMoneyModal contacts={contacts} token={token} user={user} onClose={() => setShowSend(false)} onSuccess={handlePaySuccess} toast={toast} T={T} paymentLimit={paymentLimit} />}
      {showAddExp && <AddExpenseModal token={token} onClose={() => setShowAddExp(false)} onSuccess={handleExpenseAdded} toast={toast} T={T} />}
      {showLimitModal && <PaymentLimitModal paymentLimit={paymentLimit} onSave={v => { setPaymentLimit(v); toast(v > 0 ? `Limit set to ${fmt(v)}` : "Payment limit disabled"); }} onClose={() => setShowLimitModal(false)} T={T} />}
      {showBudgetModal && <BudgetModal budgets={budgets} onSave={setBudgets} onClose={() => setShowBudgetModal(false)} T={T} analytics={analytics} />}
      {showSplitModal && <SplitBillModal contacts={contacts} onClose={() => setShowSplitModal(false)} T={T} />}
      {editTxn && <EditTxnModal txn={editTxn} onClose={() => setEditTxn(null)} onSave={handleEditTxn} T={T} />}

      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div className="mobile-menu" style={{ position: "fixed", inset: 0, zIndex: 40, background: "rgba(0,0,0,0.5)", backdropFilter: "blur(4px)" }} onClick={() => setSidebarOpen(false)}>
          <div style={{ width: 240, height: "100%", background: T.sidebar, backdropFilter: "blur(20px)", borderRight: `1px solid ${T.border}`, display: "flex", flexDirection: "column" }} onClick={e => e.stopPropagation()}>
            <SidebarContent />
          </div>
        </div>
      )}

      <div style={{ display: "flex", minHeight: "100vh", background: T.bg }}>
        {/* Desktop sidebar */}
        <aside className="sidebar-desktop" style={{ width: 232, background: T.sidebar, borderRight: `1px solid ${T.border}`, display: "flex", flexDirection: "column", position: "sticky", top: 0, height: "100vh", flexShrink: 0, backdropFilter: "blur(20px)" }}>
          <SidebarContent />
        </aside>

        <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0 }}>
          {/* Mobile topbar */}
          <header className="mobile-header" style={{ padding: "12px 16px", alignItems: "center", justifyContent: "space-between", borderBottom: `1px solid ${T.border}`, background: T.topbar, backdropFilter: "blur(20px)", position: "sticky", top: 0, zIndex: 20 }}>
            <button onClick={() => setSidebarOpen(true)} style={{ background: T.cardAccent, border: `1px solid ${T.border}`, borderRadius: 9, padding: "8px 10px", cursor: "pointer", color: T.text, display: "flex" }}>
              <Menu size={18} />
            </button>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <div style={{ width: 28, height: 28, borderRadius: 8, background: "linear-gradient(135deg,#6366f1,#8b5cf6)", display: "flex", alignItems: "center", justifyContent: "center" }}><Wallet size={15} color="white" /></div>
              <span style={{ fontFamily: "'Playfair Display',serif", fontSize: 16, color: T.text }}>PayVault</span>
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={() => setTheme(p => p === "dark" ? "light" : "dark")} style={{ background: T.cardAccent, border: `1px solid ${T.border}`, borderRadius: 9, padding: "8px 10px", cursor: "pointer", color: T.text, display: "flex" }}>
                {theme === "dark" ? <Sun size={15} /> : <Moon size={15} />}
              </button>
              <button onClick={() => setHideBalance(p => !p)} style={{ background: T.cardAccent, border: `1px solid ${T.border}`, borderRadius: 9, padding: "8px 10px", cursor: "pointer", color: T.text, display: "flex" }}>
                {hideBalance ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
          </header>

          {/* Desktop topbar */}
          <header style={{ padding: "14px 28px", display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: `1px solid ${T.border}`, background: T.topbar, backdropFilter: "blur(20px)", position: "sticky", top: 0, zIndex: 20 }} className="mobile-header" /* reusing to hide on mobile */>
          </header>
          <header style={{ padding: "14px 28px", display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: `1px solid ${T.border}`, background: T.topbar, backdropFilter: "blur(20px)", position: "sticky", top: 0, zIndex: 20 }}>
            <div>
              <h2 className="topbar-title" style={{ fontFamily: "'Playfair Display',serif", fontSize: 20, color: T.text, margin: 0 }}>
                {page === "dashboard" ? `Good ${new Date().getHours() < 12 ? "morning" : "evening"}, ${user.name.split(" ")[0]}`
                  : page === "expenses" ? "Expense Tracker"
                  : page === "analytics" ? "Analytics"
                  : "Settings"}
              </h2>
              <p className="topbar-date" style={{ fontSize: 12, color: T.muted, margin: 0 }}>
                {new Date().toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
              </p>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              {loading && <Spinner size={17} />}
              {paymentLimit > 0 && (
                <button onClick={() => setShowLimitModal(true)} style={{ display: "flex", alignItems: "center", gap: 6, padding: "7px 12px", borderRadius: 9, background: T.warningBg, border: `1px solid ${T.warningBorder}`, color: T.warningText, cursor: "pointer", fontSize: 12, fontWeight: 700, fontFamily: "inherit" }}>
                  <TriangleAlert size={13} /> Limit: {fmt(paymentLimit)}
                </button>
              )}
              <button onClick={() => setTheme(p => p === "dark" ? "light" : "dark")} style={{ background: T.cardAccent, border: `1px solid ${T.borderStrong}`, borderRadius: 9, padding: "8px 10px", cursor: "pointer", color: T.text, display: "flex", alignItems: "center", gap: 6, fontSize: 12, fontWeight: 700 }}>
                {theme === "dark" ? <><Sun size={14} /> Light</> : <><Moon size={14} /> Dark</>}
              </button>
              <button onClick={() => setHideBalance(p => !p)} style={{ background: T.cardAccent, border: `1px solid ${T.borderStrong}`, borderRadius: 9, padding: "8px 10px", cursor: "pointer", color: T.text, display: "flex" }}>
                {hideBalance ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
              <button onClick={fetchAll} style={{ background: T.cardAccent, border: `1px solid ${T.borderStrong}`, borderRadius: 9, padding: "8px 10px", cursor: "pointer", color: T.text, display: "flex" }}>
                <RefreshCw size={15} />
              </button>
            </div>
          </header>

          {/* ── Pages ── */}
          <div className="main-content page-enter" style={{ flex: 1, padding: 28, overflowY: "auto" }}>

            {/* ══════════ DASHBOARD ══════════ */}
            {page === "dashboard" && (
              <div style={{ display: "flex", flexDirection: "column", gap: 22 }}>

                {/* Payment Limit reminder if set */}
                {paymentLimit > 0 && (
                  <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 18px", borderRadius: 12, background: T.warningBg, border: `1px solid ${T.warningBorder}` }}>
                    <TriangleAlert size={16} color={T.warningText} />
                    <p style={{ fontSize: 13, color: T.textSub, margin: 0, flex: 1 }}>
                      <strong style={{ color: T.warningText }}>Payment limit active:</strong> You'll receive a warning for payments over <strong style={{ color: T.text }}>{fmt(paymentLimit)}</strong>.
                    </p>
                    <button onClick={() => setShowLimitModal(true)} style={{ background: "none", border: "none", cursor: "pointer", color: T.navActiveText, fontSize: 12, fontWeight: 700, fontFamily: "inherit", flexShrink: 0 }}>Change</button>
                  </div>
                )}

                {/* Balance Hero */}
                <Card T={T} style={{ padding: "26px 28px", background: T.heroGrad, borderColor: T.heroBorder, position: "relative", overflow: "hidden" }}>
                  <div style={{ position: "absolute", top: -50, right: -50, width: 220, height: 220, borderRadius: "50%", background: "radial-gradient(circle, rgba(99,102,241,0.12) 0%, transparent 70%)", pointerEvents: "none" }} />
                  <div className="hero-flex" style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16, flexWrap: "wrap" }}>
                    <div>
                      <p style={{ fontSize: 11, color: T.muted, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".07em", marginBottom: 8 }}>Total Balance</p>
                      <p style={{ fontFamily: "'Playfair Display',serif", fontSize: 42, color: T.text, lineHeight: 1, marginBottom: 8 }}>
                        {hideBalance ? "••••••" : fmt(wallet?.balance ?? 0)}
                      </p>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                        <span style={{ fontSize: 12, color: T.muted }}>UPI:</span>
                        <span style={{ fontSize: 12, color: T.navActiveText, fontWeight: 600 }}>{wallet?.upi_id}</span>
                        <button onClick={copyUpi} style={{ background: T.navActive, border: `1px solid ${T.heroBorder}`, borderRadius: 6, padding: "3px 9px", cursor: "pointer", color: T.navActiveText, display: "flex", gap: 4, fontSize: 11, fontFamily: "inherit", fontWeight: 700 }}>
                          {copied ? <Check size={12} /> : <Copy size={12} />} {copied ? "Copied!" : "Copy"}
                        </button>
                      </div>
                    </div>
                    <div className="hero-actions" style={{ display: "flex", gap: 10 }}>
                      <Btn T={T} variant="primary" onClick={() => setShowSend(true)}><Send size={14} /> Send</Btn>
                      <Btn T={T} variant="ghost" onClick={() => setShowAddExp(true)}><Plus size={14} /> Add</Btn>
                      <Btn T={T} variant="warning" onClick={() => setShowLimitModal(true)}><SlidersHorizontal size={14} /> Limit</Btn>
                    </div>
                  </div>
                  <div className="grid-stats" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginTop: 22 }}>
                    {[["Money In", wallet?.total_in, "#22c55e", ArrowDownLeft], ["Money Out", wallet?.total_out, "#ef4444", ArrowUpRight]].map(([label, val, color, Icon]) => (
                      <div key={label} style={{ background: T.cardAccent, borderRadius: 12, padding: "14px 16px", border: `1px solid ${T.border}` }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 7 }}>
                          <Icon size={13} color={color} />
                          <span style={{ fontSize: 11, color: T.muted, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".05em" }}>{label}</span>
                        </div>
                        <p style={{ fontFamily: "'Playfair Display',serif", fontSize: 20, color, margin: 0 }}>{hideBalance ? "•••" : fmt(val ?? 0)}</p>
                      </div>
                    ))}
                  </div>
                </Card>

                {/* Quick Send */}
                <Card T={T} style={{ padding: 20 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                    <p style={{ fontFamily: "'Playfair Display',serif", fontSize: 16, color: T.text, margin: 0 }}>Quick Send</p>
                    <button onClick={() => setShowSend(true)} style={{ background: "none", border: "none", color: T.navActiveText, fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>See all</button>
                  </div>
                  <div className="quick-send-scroll" style={{ display: "flex", gap: 20, overflowX: "auto", paddingBottom: 4 }}>
                    {contacts.map(c => (
                      <div key={c.id} onClick={() => setShowSend(true)} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8, cursor: "pointer", minWidth: 60, flexShrink: 0 }}>
                        <div style={{ width: 48, height: 48, borderRadius: 14, background: c.color + "20", border: `1px solid ${c.color}38`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: 800, color: c.color, transition: "transform .2s" }}
                          onMouseEnter={e => { e.currentTarget.style.transform = "scale(1.1)"; }}
                          onMouseLeave={e => { e.currentTarget.style.transform = "none"; }}>
                          {c.avatar}
                        </div>
                        <p style={{ fontSize: 11, color: T.muted, textAlign: "center", maxWidth: 60, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", margin: 0 }}>{c.name.split(" ")[0]}</p>
                      </div>
                    ))}
                    <div onClick={() => setShowSend(true)} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8, cursor: "pointer", minWidth: 60, flexShrink: 0 }}>
                      <div style={{ width: 48, height: 48, borderRadius: 14, background: T.cardAccent, border: `1px dashed ${T.borderStrong}`, display: "flex", alignItems: "center", justifyContent: "center" }}><Plus size={18} color={T.muted} /></div>
                      <p style={{ fontSize: 11, color: T.muted, margin: 0 }}>New</p>
                    </div>
                  </div>
                </Card>

                {/* Recent Activity */}
                <Card T={T} style={{ padding: 20 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                    <p style={{ fontFamily: "'Playfair Display',serif", fontSize: 16, color: T.text, margin: 0 }}>Recent Activity</p>
                    <button onClick={() => setPage("expenses")} style={{ background: "none", border: "none", color: T.navActiveText, fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", display: "flex", alignItems: "center", gap: 4 }}>View all <ChevronRight size={13} /></button>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                    {transactions.slice(0, 6).map(t => <TxnRow key={t.id} t={t} hideBalance={hideBalance} onDelete={handleDeleteTxn} T={T} />)}
                    {transactions.length === 0 && <p style={{ color: T.muted, textAlign: "center", padding: "20px 0", fontSize: 13 }}>No transactions yet</p>}
                  </div>
                </Card>
              </div>
            )}

            {/* ══════════ EXPENSES ══════════ */}
            {page === "expenses" && (
              <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>

                {/* Summary Cards */}
                {(() => {
                  const debits = transactions.filter(t => t.type === "debit");
                  const avgDaily = debits.length > 0 ? debits.reduce((s, t) => s + t.amount, 0) / Math.max(1, new Set(debits.map(t => t.date)).size) : 0;
                  const topCat = analytics ? Object.entries(analytics.by_category).sort((a,b) => b[1]-a[1])[0] : null;
                  const recurring = transactions.filter(t => t.recurring).length;
                  return (
                    <div className="grid-stats" style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 12 }}>
                      {[
                        ["Avg Daily Spend", fmt(avgDaily), "#818cf8", TrendingDown],
                        ["Top Category", topCat ? topCat[0] : "—", "#f59e0b", Flame],
                        ["Recurring", `${recurring} items`, "#22c55e", Repeat],
                      ].map(([label, val, color, Icon]) => (
                        <Card key={label} T={T} style={{ padding: 16 }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                            <Icon size={14} color={color} />
                            <span style={{ fontSize: 11, color: T.muted, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".05em" }}>{label}</span>
                          </div>
                          <p style={{ fontFamily: "'Playfair Display',serif", fontSize: 18, color, margin: 0 }}>{val}</p>
                        </Card>
                      ))}
                    </div>
                  );
                })()}

                {/* Budget alerts */}
                {Object.entries(budgets).filter(([cat, limit]) => {
                  const spent = analytics?.by_category?.[cat] || 0;
                  return parseFloat(limit) > 0 && spent > parseFloat(limit) * 0.8;
                }).map(([cat, limit]) => {
                  const spent = analytics?.by_category?.[cat] || 0;
                  const over = spent > parseFloat(limit);
                  const meta = CAT_META[cat];
                  return (
                    <div key={cat} style={{ display: "flex", alignItems: "center", gap: 12, padding: "11px 16px", borderRadius: 12, background: over ? T.dangerBg : T.warningBg, border: `1px solid ${over ? T.dangerBorder : T.warningBorder}` }}>
                      <meta.icon size={16} color={over ? T.dangerText : T.warningText} />
                      <p style={{ fontSize: 13, color: over ? T.dangerText : T.warningText, margin: 0, flex: 1 }}>
                        <strong>{cat}</strong>: {over ? "Over budget" : "Near budget"} — {fmt(spent)} of {fmt(limit)}
                      </p>
                      <Target size={14} color={over ? T.dangerText : T.warningText} />
                    </div>
                  );
                })}

                {/* Controls row */}
                <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "9px 14px", borderRadius: 10, background: T.input, border: `1px solid ${T.inputBorder}`, flex: 1, minWidth: 180 }}>
                    <Search size={14} color={T.muted} />
                    <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search transactions…"
                      style={{ background: "transparent", border: "none", outline: "none", color: T.text, fontSize: 13, fontFamily: "inherit", flex: 1 }} />
                    {search && <button onClick={() => setSearch("")} style={{ background: "none", border: "none", cursor: "pointer", color: T.muted, display: "flex" }}><X size={13} /></button>}
                  </div>
                  <Btn T={T} variant="ghost" onClick={() => setShowSplitModal(true)}><Split size={14} /> Split</Btn>
                  <Btn T={T} variant="ghost" onClick={() => setShowBudgetModal(true)}><Target size={14} /> Budgets</Btn>
                  <Btn T={T} variant="ghost" onClick={() => exportCSV(filteredTxns)}><Download size={14} /> Export</Btn>
                  <Btn T={T} variant="primary" onClick={() => setShowAddExp(true)}><Plus size={14} /> Add</Btn>
                </div>

                {/* Date range pills */}
                <div style={{ display: "flex", gap: 7, flexWrap: "wrap" }}>
                  {[["all","All Time"],["today","Today"],["week","This Week"],["month","This Month"],["custom","Custom"]].map(([val, label]) => (
                    <FilterPill key={val} T={T} label={<span style={{display:"flex",alignItems:"center",gap:5}}><Calendar size={11}/>{label}</span>} active={dateRange === val} onClick={() => setDateRange(val)} />
                  ))}
                </div>
                {dateRange === "custom" && (
                  <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                    <div style={{ flex: 1 }}><Input T={T} label="From" type="date" value={customFrom} onChange={e => setCustomFrom(e.target.value)} /></div>
                    <div style={{ flex: 1 }}><Input T={T} label="To" type="date" value={customTo} onChange={e => setCustomTo(e.target.value)} /></div>
                  </div>
                )}

                {/* Category filter pills */}
                <div className="filter-pills" style={{ display: "flex", gap: 7, flexWrap: "wrap" }}>
                  <FilterPill T={T} label="All" active={catFilter === "all"} onClick={() => setCatFilter("all")} />
                  {CATEGORIES.map(c => {
                    const Icon = CAT_META[c].icon;
                    return <FilterPill key={c} T={T} label={<span style={{display:"flex",alignItems:"center",gap:5}}><Icon size={12}/>{c}</span>} active={catFilter === c} onClick={() => setCatFilter(c)} color={CAT_META[c].color} />;
                  })}
                </div>

                <Card T={T} style={{ padding: 20 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16, flexWrap: "wrap", gap: 8 }}>
                    <p style={{ fontFamily: "'Playfair Display',serif", fontSize: 16, color: T.text, margin: 0 }}>
                      Transactions <span style={{ fontSize: 13, color: T.muted, fontFamily: "inherit", fontWeight: 400 }}>({filteredTxns.length})</span>
                    </p>
                    <div style={{ display: "flex", gap: 14, fontSize: 13 }}>
                      <span style={{ color: "#4ade80", fontWeight: 700 }}>+{hideBalance ? "•••" : fmt(filteredTxns.filter(t=>t.type==="credit").reduce((s,t)=>s+t.amount,0))}</span>
                      <span style={{ color: "#f87171", fontWeight: 700 }}>-{hideBalance ? "•••" : fmt(filteredTxns.filter(t=>t.type==="debit").reduce((s,t)=>s+t.amount,0))}</span>
                    </div>
                  </div>
                  {filteredTxns.length === 0 ? (
                    <div style={{ textAlign: "center", padding: "40px 0", color: T.muted }}>
                      <Receipt size={36} style={{ margin: "0 auto 12px", opacity: .3 }} />
                      <p>No transactions found</p>
                    </div>
                  ) : (
                    <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                      {filteredTxns.map(t => <TxnRow key={t.id} t={t} hideBalance={hideBalance} onDelete={handleDeleteTxn} onEdit={setEditTxn} showDelete T={T} />)}
                    </div>
                  )}
                </Card>
              </div>
            )}

            {/* ══════════ ANALYTICS ══════════ */}
            {page === "analytics" && analytics && (
              <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
                <div className="grid-stats" style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 14 }}>
                  {[
                    ["Total Spent", fmt(analytics.total_spent), "#ef4444"],
                    ["Total Received", fmt(analytics.total_received), "#22c55e"],
                    ["Transactions", analytics.transaction_count, "#818cf8"],
                  ].map(([label, val, color]) => (
                    <Card key={label} T={T} style={{ padding: 20 }}>
                      <p style={{ fontSize: 11, color: T.muted, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".06em", marginBottom: 10 }}>{label}</p>
                      <p style={{ fontFamily: "'Playfair Display',serif", fontSize: 24, color, margin: 0 }}>{hideBalance && label !== "Transactions" ? "•••" : val}</p>
                    </Card>
                  ))}
                </div>

                <div className="analytics-grid" style={{ display: "grid", gridTemplateColumns: "1.2fr 0.8fr", gap: 20 }}>
                  <Card T={T} style={{ padding: 24 }}>
                    <p style={{ fontFamily: "'Playfair Display',serif", fontSize: 17, color: T.text, marginBottom: 20 }}>Spending by Category</p>
                    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                      {categoryAnalytics.map(([cat, amt]) => {
                        const pct = analytics.total_spent > 0 ? (amt / analytics.total_spent * 100) : 0;
                        const meta = CAT_META[cat] || { icon: Package, color: "#6b7280" };
                        return (
                          <div key={cat}>
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                              <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
                                <span style={{ width: 28, height: 28, borderRadius: 8, background: meta.color + "18", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                                <meta.icon size={14} color={meta.color} />
                              </span>
                                <span style={{ fontSize: 14, fontWeight: 600, color: T.text }}>{cat}</span>
                              </div>
                              <div>
                                <span style={{ fontSize: 14, fontWeight: 700, color: meta.color }}>{hideBalance ? "•••" : fmt(amt)}</span>
                                <span style={{ fontSize: 11, color: T.muted, marginLeft: 8 }}>{pct.toFixed(1)}%</span>
                              </div>
                            </div>
                            <div style={{ height: 6, borderRadius: 999, background: T.statBg, overflow: "hidden" }}>
                              <div style={{ height: "100%", width: `${pct}%`, borderRadius: 999, background: meta.color, transition: "width .7s ease" }} />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </Card>

                  <div style={{ display: "flex", flexDirection: "column", gap: 16, alignItems: "center" }}>
                    <div className="donut-chart" style={{ width: 240, height: 240, borderRadius: "50%", background: analytics.total_spent > 0 ? `conic-gradient(${pieGradient})` : T.statBg, display: "grid", placeItems: "center", boxShadow: "0 8px 40px rgba(0,0,0,0.12)" }}>
                      <div style={{ width: 140, height: 140, borderRadius: "50%", background: T.donutInner, display: "grid", placeItems: "center", textAlign: "center" }}>
                        <p style={{ fontSize: 11, color: T.muted, marginBottom: 4 }}>Total Spent</p>
                        <p style={{ fontSize: 16, fontWeight: 700, color: T.text, margin: 0 }}>{hideBalance ? "•••" : fmt(analytics.total_spent)}</p>
                      </div>
                    </div>
                    <div style={{ width: "100%", display: "flex", flexDirection: "column", gap: 8 }}>
                      {categoryAnalytics.map(([cat, amt]) => {
                        const meta = CAT_META[cat] || { icon: Package, color: "#6b7280" };
                        return (
                          <div key={cat} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, padding: "9px 12px", borderRadius: 12, background: T.statBg, border: `1px solid ${T.border}` }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                              <span style={{ width: 26, height: 26, borderRadius: 7, background: meta.color + "18", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                                <meta.icon size={13} color={meta.color} />
                              </span>
                              <span style={{ fontSize: 13, color: T.text, fontWeight: 600 }}>{cat}</span>
                            </div>
                            <span style={{ fontSize: 13, color: meta.color, fontWeight: 700 }}>{hideBalance ? "•••" : fmt(amt)}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* Category bar cards */}
                <Card T={T} style={{ padding: 24 }}>
                  <p style={{ fontFamily: "'Playfair Display',serif", fontSize: 17, color: T.text, marginBottom: 18 }}>Category Spend Graph</p>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))", gap: 14 }}>
                    {categoryAnalytics.map(([cat, amt]) => {
                      const pct = analytics.total_spent > 0 ? (amt / analytics.total_spent * 100) : 0;
                      const meta = CAT_META[cat] || { icon: Package, color: "#6b7280" };
                      return (
                        <div key={cat} style={{ display: "flex", flexDirection: "column", gap: 12, padding: 14, borderRadius: 16, background: T.statBg, border: `1px solid ${T.border}` }}>
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                            <span style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, color: T.text }}>
                              <meta.icon size={13} color={meta.color} />{cat}
                            </span>
                            <span style={{ fontSize: 13, color: meta.color, fontWeight: 700 }}>{hideBalance ? "•••" : fmt(amt)}</span>
                          </div>
                          <div style={{ height: 120, borderRadius: 16, background: T.cardAccent, padding: 10, display: "flex", alignItems: "flex-end" }}>
                            <div style={{ width: "100%", height: `${Math.max(pct, 6)}%`, borderRadius: 10, background: meta.color, transition: "height .7s ease" }} />
                          </div>
                          <span style={{ fontSize: 11, color: T.muted }}>{pct.toFixed(1)}% of spend</span>
                        </div>
                      );
                    })}
                  </div>
                </Card>

                {analytics.total_spent > 50000 && (
                  <div style={{ display: "flex", alignItems: "flex-start", gap: 12, padding: "16px 20px", borderRadius: 14, background: T.dangerBg, border: `1px solid ${T.dangerBorder}` }}>
                    <AlertCircle size={22} color={T.dangerText} style={{ flexShrink: 0, marginTop: 1 }} />
                    <div>
                      <p style={{ fontWeight: 700, color: T.dangerText, marginBottom: 4 }}>High Spending Alert</p>
                      <p style={{ fontSize: 13, color: T.textSub, margin: 0 }}>You've spent over ₹50,000 this month. Consider reviewing your expenses to stay within budget.</p>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ══════════ SETTINGS ══════════ */}
            {page === "settings" && (
              <div style={{ maxWidth: 560, display: "flex", flexDirection: "column", gap: 16 }}>
                {/* Profile */}
                <Card T={T} style={{ padding: 24 }}>
                  <p style={{ fontFamily: "'Playfair Display',serif", fontSize: 18, color: T.text, marginBottom: 20 }}>Profile</p>
                  <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 20 }}>
                    <div style={{ width: 54, height: 54, borderRadius: 14, background: "linear-gradient(135deg,#6366f1,#8b5cf6)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, fontWeight: 800, color: "white", flexShrink: 0 }}>{user.avatar}</div>
                    <div>
                      <p style={{ fontWeight: 700, fontSize: 16, color: T.text, margin: 0 }}>{user.name}</p>
                      <p style={{ fontSize: 13, color: T.muted, margin: 0 }}>{user.email}</p>
                    </div>
                  </div>
                  {[["UPI ID", wallet?.upi_id, Landmark], ["Phone", user.phone || "—", Phone], ["Member Since", user.joined, CalendarDays]].map(([label, val, Icon]) => (
                    <div key={label} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 0", borderBottom: `1px solid ${T.border}` }}>
                      <span style={{ fontSize: 13, color: T.muted, display: "flex", alignItems: "center", gap: 7 }}><Icon size={13} />{label}</span>
                      <span style={{ fontSize: 13, fontWeight: 600, color: T.text }}>{val}</span>
                    </div>
                  ))}
                </Card>

                {/* Payment Limit */}
                <Card T={T} style={{ padding: 22 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                    <p style={{ fontFamily: "'Playfair Display',serif", fontSize: 17, color: T.text, margin: 0 }}>Payment Limit</p>
                    <Btn T={T} variant="warning" style={{ padding: "7px 14px", fontSize: 12 }} onClick={() => setShowLimitModal(true)}>
                      <SlidersHorizontal size={13} /> Configure
                    </Btn>
                  </div>
                  {paymentLimit > 0 ? (
                    <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "14px 16px", borderRadius: 12, background: T.warningBg, border: `1px solid ${T.warningBorder}` }}>
                      <TriangleAlert size={20} color={T.warningText} />
                      <div>
                        <p style={{ fontWeight: 700, color: T.warningText, margin: "0 0 3px" }}>Active Limit: {fmt(paymentLimit)}</p>
                        <p style={{ fontSize: 12, color: T.textSub, margin: 0 }}>A warning will appear for any payment exceeding this amount.</p>
                      </div>
                    </div>
                  ) : (
                    <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "14px 16px", borderRadius: 12, background: T.statBg, border: `1px solid ${T.border}` }}>
                      <Shield size={20} color={T.muted} />
                      <div>
                        <p style={{ fontWeight: 600, color: T.muted, margin: "0 0 3px" }}>No limit set</p>
                        <p style={{ fontSize: 12, color: T.muted, margin: 0 }}>Configure a per-transaction limit to get warned on large payments.</p>
                      </div>
                    </div>
                  )}
                </Card>

                {/* Security toggles */}
                <Card T={T} style={{ padding: 20 }}>
                  <p style={{ fontFamily: "'Playfair Display',serif", fontSize: 17, color: T.text, marginBottom: 16 }}>Security</p>
                  <SecurityToggles T={T} />
                </Card>

                <Btn T={T} variant="danger" style={{ width: "100%", justifyContent: "center" }} onClick={handleLogout}>
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
