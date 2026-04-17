import { useNavigate } from "react-router-dom";

export default function TrustPage({ title, children }) {
  const navigate = useNavigate();
  return (
    <div className="min-h-screen bg-white dark:bg-[#0a0a0a] text-gray-900 dark:text-white">
      {/* Minimal navbar */}
      <header className="fixed top-0 inset-x-0 z-50 flex justify-center pt-4 px-4">
        <nav className="w-full max-w-4xl flex items-center justify-between px-6 py-3 rounded-2xl glass-nav">
          <button onClick={() => navigate("/dashboard")} className="flex items-center gap-2 font-bold text-xl tracking-tight select-none">
            <span className="w-7 h-7 rounded-lg bg-orange-500 flex items-center justify-center text-white text-sm font-black logo-icon-glow">S</span>
            <span className="logo-name-glow">Sentiment<span className="text-orange-500">AI</span></span>
          </button>
          <button onClick={() => navigate(-1)} className="flex items-center gap-1.5 text-sm text-gray-500 dark:text-gray-400 hover:text-orange-500 dark:hover:text-orange-400 transition-colors">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
            Back
          </button>
        </nav>
      </header>

      <main className="max-w-3xl mx-auto px-4 pt-36 pb-24">
        <h1 className="text-4xl font-extrabold tracking-tight mb-2">{title}</h1>
        <p className="text-xs text-gray-400 dark:text-gray-600 mb-10 font-mono">Last updated: {new Date().toLocaleDateString("en-IN", { year: "numeric", month: "long", day: "numeric" })}</p>
        <div className="flex flex-col gap-8 text-gray-600 dark:text-gray-400 leading-relaxed text-sm">
          {children}
        </div>
      </main>
    </div>
  );
}
