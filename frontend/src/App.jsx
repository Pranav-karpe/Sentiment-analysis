import { useState, useEffect, lazy, Suspense } from "react";
import { BrowserRouter, Routes, Route, Navigate, useNavigate } from "react-router-dom";
import axios from "axios";
import Login from "./Login";
import Signup from "./Signup";
import ForgotPassword from "./ForgotPassword";

// Lazy-loaded pages
const Dashboard         = lazy(() => import("./Dashboard"));
const Home              = lazy(() => import("./Home"));
const AnalyticsDashboard = lazy(() => import("./AnalyticsDashboard"));
const PrivacyPolicy     = lazy(() => import("./PrivacyPolicy"));
const Terms             = lazy(() => import("./Terms"));
const AboutPage         = lazy(() => import("./AboutPage"));
const ContactPage       = lazy(() => import("./ContactPage"));

const PageLoader = () => (
  <div className="min-h-screen bg-white dark:bg-[#0a0a0a] flex items-center justify-center">
    <svg className="w-6 h-6 animate-spin text-orange-500" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
    </svg>
  </div>
);

// ── Theme bootstrap (runs before any render) ─────────────────────────────────
const savedTheme = localStorage.getItem("theme");
if (savedTheme === "dark" || (!savedTheme)) {
  document.documentElement.classList.add("dark");
} else {
  document.documentElement.classList.remove("dark");
}

// ── Auth helpers ─────────────────────────────────────────────────────────────
export const authHeaders = () => {
  const token = localStorage.getItem("token");
  return token ? { headers: { Authorization: `Bearer ${token}` } } : {};
};

const INACTIVITY_LIMIT = 48 * 60 * 60 * 1000;

export const checkSession = () => {
  const token = localStorage.getItem("token");
  if (!token) return false;
  try {
    const payload = JSON.parse(atob(token.split(".")[1]));
    if (payload.exp * 1000 < Date.now()) return false;
  } catch { return false; }
  const lastActive = parseInt(localStorage.getItem("lastActive") || "0", 10);
  if (lastActive && Date.now() - lastActive > INACTIVITY_LIMIT) return false;
  return true;
};

export const clearSession = () => {
  localStorage.removeItem("user");
  localStorage.removeItem("token");
  localStorage.removeItem("lastActive");
};

export const updateLastActive = () =>
  localStorage.setItem("lastActive", Date.now().toString());

// ── Protected route wrapper ───────────────────────────────────────────────────
function RequireAuth({ children }) {
  const user = (() => { try { return JSON.parse(localStorage.getItem("user")); } catch { return null; } })();
  if (!user || !checkSession()) {
    clearSession();
    return <Navigate to="/login" replace />;
  }
  return children;
}

// ── Login page wrapper (passes router navigate to Login component) ────────────
function LoginPage({ dark, setDark }) {
  const navigate = useNavigate();
  const handleLoginSuccess = (name, email, token) => {
    localStorage.setItem("user", JSON.stringify({ name, email }));
    if (token) localStorage.setItem("token", token);
    localStorage.setItem("lastActive", Date.now().toString());
    navigate("/dashboard", { replace: true });
  };
  return (
    <div className={dark ? "dark" : ""}>
      <Login
        onNavigate={(p) => navigate("/" + p)}
        onLoginSuccess={handleLoginSuccess}
        onGuest={() => navigate("/guest")}
        dark={dark}
        setDark={setDark}
      />
    </div>
  );
}

// ── Signup page wrapper ───────────────────────────────────────────────────────
function SignupPage({ dark, setDark }) {
  const navigate = useNavigate();
  const handleLoginSuccess = (name, email, token) => {
    localStorage.setItem("user", JSON.stringify({ name, email }));
    if (token) localStorage.setItem("token", token);
    localStorage.setItem("lastActive", Date.now().toString());
    navigate("/dashboard", { replace: true });
  };
  return (
    <div className={dark ? "dark" : ""}>
      <Signup
        onNavigate={(p) => navigate("/" + p)}
        onLoginSuccess={handleLoginSuccess}
        dark={dark}
        setDark={setDark}
      />
    </div>
  );
}

// ── ForgotPassword page wrapper ───────────────────────────────────────────────
function ForgotPage({ dark, setDark }) {
  const navigate = useNavigate();
  return (
    <div className={dark ? "dark" : ""}>
      <ForgotPassword
        onNavigate={(p) => navigate("/" + p)}
        dark={dark}
        setDark={setDark}
      />
    </div>
  );
}

// ── Root App ──────────────────────────────────────────────────────────────────
export default function App() {
  const [dark, setDark] = useState(() => {
    const saved = localStorage.getItem("theme");
    return saved ? saved === "dark" : true;
  });

  useEffect(() => {
    if (dark) {
      document.documentElement.classList.add("dark");
      localStorage.setItem("theme", "dark");
    } else {
      document.documentElement.classList.remove("dark");
      localStorage.setItem("theme", "light");
    }
  }, [dark]);

  return (
    <BrowserRouter>
      <Suspense fallback={<PageLoader />}>
        <Routes>
          <Route path="/login"    element={<LoginPage    dark={dark} setDark={setDark} />} />
          <Route path="/signup"   element={<SignupPage   dark={dark} setDark={setDark} />} />
          <Route path="/forgot"   element={<ForgotPage   dark={dark} setDark={setDark} />} />
          <Route path="/privacy"  element={<PrivacyPolicy />} />
          <Route path="/terms"    element={<Terms />} />
          <Route path="/about"    element={<AboutPage />} />
          <Route path="/contact"  element={<ContactPage />} />
          <Route path="/guest"    element={<Dashboard dark={dark} setDark={setDark} />} />
          <Route path="/dashboard" element={
            <RequireAuth>
              <Dashboard dark={dark} setDark={setDark} />
            </RequireAuth>
          } />
          <Route path="/home" element={
            <RequireAuth>
              <Home dark={dark} setDark={setDark} />
            </RequireAuth>
          } />
          <Route path="/analytics" element={
            <RequireAuth>
              <AnalyticsDashboard dark={dark} setDark={setDark} />
            </RequireAuth>
          } />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}
