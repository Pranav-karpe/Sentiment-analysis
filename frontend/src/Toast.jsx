import { useState, useCallback, useEffect, createContext, useContext } from "react";

// ── Context ───────────────────────────────────────────────────────────────────
const ToastContext = createContext(null);

export function useToast() {
  return useContext(ToastContext);
}

// ── Single toast item ─────────────────────────────────────────────────────────
function ToastItem({ id, type, message, onRemove }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Slide in
    requestAnimationFrame(() => setVisible(true));
    // Auto-dismiss after 3s
    const t = setTimeout(() => {
      setVisible(false);
      setTimeout(() => onRemove(id), 300);
    }, 3000);
    return () => clearTimeout(t);
  }, []);

  const icons = {
    success: (
      <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
      </svg>
    ),
    error: (
      <svg className="w-4 h-4 shrink-0" fill="currentColor" viewBox="0 0 20 20">
        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm-.75-5.25a.75.75 0 001.5 0v-4a.75.75 0 00-1.5 0v4zm.75-7a1 1 0 100 2 1 1 0 000-2z" clipRule="evenodd" />
      </svg>
    ),
    info: (
      <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
      </svg>
    ),
  };

  const colors = {
    success: "bg-green-50 dark:bg-green-500/15 border-green-200 dark:border-green-500/30 text-green-700 dark:text-green-400",
    error:   "bg-red-50 dark:bg-red-500/15 border-red-200 dark:border-red-500/30 text-red-700 dark:text-red-400",
    info:    "bg-gray-50 dark:bg-white/5 border-gray-200 dark:border-white/10 text-gray-700 dark:text-gray-300",
  };

  return (
    <div
      className={`flex items-center gap-3 px-4 py-3 rounded-xl border text-sm font-medium shadow-lg backdrop-blur-xl transition-all duration-300 ${colors[type]}`}
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? "translateX(0)" : "translateX(24px)",
        maxWidth: "320px",
        minWidth: "220px",
      }}
    >
      {icons[type]}
      <span className="flex-1">{message}</span>
      <button
        onClick={() => { setVisible(false); setTimeout(() => onRemove(id), 300); }}
        className="opacity-50 hover:opacity-100 transition-opacity text-base leading-none ml-1"
      >
        ✕
      </button>
    </div>
  );
}

// ── Provider ──────────────────────────────────────────────────────────────────
export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const toast = useCallback((message, type = "info") => {
    const id = Date.now() + Math.random();
    setToasts((prev) => [...prev, { id, type, message }]);
  }, []);

  const remove = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={toast}>
      {children}
      {/* Toast container — top-right */}
      <div className="fixed top-5 right-5 z-[200] flex flex-col gap-2 pointer-events-none">
        {toasts.map((t) => (
          <div key={t.id} className="pointer-events-auto">
            <ToastItem id={t.id} type={t.type} message={t.message} onRemove={remove} />
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
