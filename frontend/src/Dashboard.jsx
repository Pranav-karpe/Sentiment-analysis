import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { authHeaders, clearSession } from "./App";
import AboutModal from "./AboutModal";
import LandingPage from "./LandingPage";
import API from "./api";

export default function Dashboard({ dark, setDark }) {
  const navigate = useNavigate();
  const user     = (() => { try { return JSON.parse(localStorage.getItem("user")); } catch { return null; } })();

  const [text,         setText]         = useState("");
  const [result,       setResult]       = useState(null);
  const [loading,      setLoading]      = useState(false);
  const [error,        setError]        = useState("");
  const [showSupport,  setShowSupport]  = useState(false);
  const [showAbout,    setShowAbout]    = useState(false);
  const [supportSent,  setSupportSent]  = useState(false);
  const [supportMsg,   setSupportMsg]   = useState("");
  const [copied,       setCopied]       = useState(false);
  const [mobileMenu,   setMobileMenu]   = useState(false);
  const [taFocused,    setTaFocused]    = useState(false);
  const textareaRef = useRef(null);

  const handleLogout = () => { clearSession(); navigate("/login", { replace: true }); };

  const analyze = async () => {
    if (!text.trim()) { setError("Please enter some text before analyzing."); return; }
    setLoading(true); setResult(null); setError("");
    try {
      const res = await axios.post(`${API}/predict`,
        { text, email: user?.email ?? "" }, authHeaders());
      setResult({ sentiment: res.data.sentiment, confidence: res.data.confidence });
    } catch (e) {
      if (e.response?.data?.error === "Session expired. Please log in again.") { handleLogout(); return; }
      setError(e.response?.data?.error || "Server error. Make sure Flask is running.");
    } finally { setLoading(false); }
  };

  const analyzeFile = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setError(""); setResult(null); setLoading(true);
    const fd = new FormData();
    fd.append("file", file);
    fd.append("email", user?.email ?? "");
    try {
      const headers = authHeaders().headers || {};
      const res = await axios.post(`${API}/analyze-file`, fd, { headers });
      setResult({ sentiment: res.data.sentiment, confidence: res.data.confidence });
      setText(res.data.text || "");
    } catch (ex) {
      setError(ex.response?.data?.error || "File analysis failed.");
    } finally { setLoading(false); e.target.value = ""; }
  };

  const exportPDF = async () => {
    try {
      const res = await axios.post(`${API}/export-report`,
        { text, sentiment: result?.sentiment, confidence: result?.confidence,
          positive_count: 0, negative_count: 0 },
        { ...authHeaders(), responseType: "blob" });
      const url = URL.createObjectURL(new Blob([res.data], { type: "application/pdf" }));
      const a = document.createElement("a"); a.href = url;
      a.download = "sentiment_report.pdf"; a.click();
      URL.revokeObjectURL(url);
    } catch { setError("Could not generate PDF."); }
  };

  const copyResult = () => {
    if (!result) return;
    const txt = `Sentiment: ${result.sentiment}\nConfidence: ${Math.round(result.confidence * 100)}%\nText: ${text}`;
    navigator.clipboard.writeText(txt).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const handleKey = (e) => { if (e.key === "Enter" && e.ctrlKey) analyze(); };

  // Auto-resize textarea — max 300px then scroll
  useEffect(() => {
    const ta = textareaRef.current;
    if (!ta) return;
    ta.style.height = "auto";
    ta.style.height = Math.min(ta.scrollHeight, 300) + "px";
    ta.style.overflowY = ta.scrollHeight > 300 ? "auto" : "hidden";
  }, [text]);

  const sentimentColor =
    result?.sentiment === "Positive" ? "text-green-500" :
    result?.sentiment === "Negative" ? "text-red-500" : "text-yellow-500";

  return (
    <div className="min-h-screen bg-white dark:bg-[#0a0a0a] text-gray-900 dark:text-white transition-colors duration-300">

      {/* SUPPORT MODAL */}
      {showSupport && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center px-4" onClick={() => { setShowSupport(false); setSupportSent(false); setSupportMsg(""); }}>
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
          <div className="relative w-full max-w-md glass-card rounded-2xl p-6 z-10" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <div>
                <h2 className="text-lg font-bold text-gray-900 dark:text-white">Customer Support</h2>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">We typically reply within 24 hours</p>
              </div>
              <button onClick={() => { setShowSupport(false); setSupportSent(false); setSupportMsg(""); }} className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/10 transition-colors">✕</button>
            </div>
            {supportSent ? (
              <div className="flex flex-col items-center py-6 text-center">
                <div className="w-14 h-14 rounded-2xl bg-green-50 dark:bg-green-500/10 flex items-center justify-center text-3xl mb-3">✅</div>
                <p className="font-semibold text-gray-900 dark:text-white">Message sent!</p>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">We'll get back to you soon.</p>
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Your message</label>
                  <textarea rows={4} value={supportMsg} onChange={(e) => setSupportMsg(e.target.value)}
                    placeholder="Describe your issue or question..."
                    className="w-full bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl px-4 py-3 text-sm text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-600 outline-none focus:border-orange-500 transition-colors resize-none" />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Contact email</label>
                  <input type="email" defaultValue={user?.email || ""} placeholder="you@example.com"
                    className="w-full bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl px-4 py-2.5 text-sm text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-600 outline-none focus:border-orange-500 transition-colors" />
                </div>
                <button onClick={() => { if (supportMsg.trim()) setSupportSent(true); }}
                  disabled={!supportMsg.trim()}
                  className="w-full py-2.5 rounded-xl text-sm font-semibold bg-orange-500 hover:bg-orange-600 disabled:opacity-40 text-white transition-all btn-glow mt-1">
                  Send Message
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ABOUT MODAL */}
      {showAbout && <AboutModal onClose={() => setShowAbout(false)} />}

      {/* NAVBAR */}
      <header className="fixed top-0 inset-x-0 z-50 flex justify-center pt-4 px-4">
        <nav className="w-full max-w-4xl flex items-center justify-between px-6 py-3 rounded-2xl glass-nav">
          <button onClick={() => navigate("/dashboard")} className="flex items-center gap-2 font-bold text-xl tracking-tight select-none group">
            <span className="w-7 h-7 rounded-lg bg-orange-500 flex items-center justify-center text-white text-sm font-black logo-icon-glow">S</span>
            <span className="logo-name-glow">Sentiment<span className="text-orange-500">AI</span></span>
          </button>
          <div className="hidden sm:flex items-center gap-6 text-sm font-medium text-gray-500 dark:text-gray-400">
            <button onClick={() => navigate("/analytics")} className="hover:text-gray-900 dark:hover:text-white transition-colors flex items-center gap-1.5">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
              Dashboard
            </button>
            <button onClick={() => setShowSupport(true)} className="hover:text-gray-900 dark:hover:text-white transition-colors flex items-center gap-1.5">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192l-3.536 3.536M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-5 0a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
              Support
            </button>
            <button onClick={() => setShowAbout(true)} className="hover:text-gray-900 dark:hover:text-white transition-colors flex items-center gap-1.5">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              About
            </button>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => setDark(!dark)} className="w-9 h-9 rounded-xl flex items-center justify-center text-base bg-gray-100 dark:bg-white/10 hover:bg-gray-200 dark:hover:bg-white/20 transition-colors">
              {dark ? "☀️" : "🌙"}
            </button>
            {/* Mobile hamburger */}
            <button onClick={() => setMobileMenu(!mobileMenu)} className="sm:hidden w-9 h-9 rounded-xl flex items-center justify-center bg-gray-100 dark:bg-white/10 hover:bg-gray-200 dark:hover:bg-white/20 transition-colors">
              <svg className="w-4 h-4 text-gray-600 dark:text-gray-300" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                {mobileMenu
                  ? <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  : <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />}
              </svg>
            </button>
            {user ? (
              <>
                <span className="hidden sm:inline text-sm text-gray-600 dark:text-gray-300 font-medium">👋 {user.name}</span>
                <button onClick={handleLogout} className="px-4 py-2 rounded-xl text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/10 transition-colors">Log out</button>
              </>
            ) : (
              <>
                <button onClick={() => navigate("/login")} className="px-4 py-2 rounded-xl text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/10 transition-colors">Log in</button>
                <button onClick={() => navigate("/signup")} className="px-4 py-2 rounded-xl text-sm font-semibold bg-orange-500 hover:bg-orange-600 text-white transition-colors shadow-sm">Sign up</button>
              </>
            )}
          </div>
        </nav>
        {/* Mobile dropdown menu */}
        {mobileMenu && (
          <div className="sm:hidden w-full max-w-4xl mt-2 glass-card rounded-2xl px-4 py-3 flex flex-col gap-1">
            {[
              { label: "Dashboard", action: () => { navigate("/analytics"); setMobileMenu(false); } },
              { label: "Support",   action: () => { setShowSupport(true); setMobileMenu(false); } },
              { label: "About",     action: () => { setShowAbout(true); setMobileMenu(false); } },
            ].map(({ label, action }) => (
              <button key={label} onClick={action}
                className="text-left px-3 py-2.5 rounded-xl text-sm font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/10 transition-colors">
                {label}
              </button>
            ))}
            {user && <p className="px-3 py-2 text-xs text-gray-400 dark:text-gray-600 border-t border-gray-100 dark:border-white/5 mt-1">👋 {user.name}</p>}
          </div>
        )}
      </header>

      {/* MAIN */}
      <main className="flex flex-col items-center text-center px-4 pt-36 pb-24">

        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-semibold tracking-wide bg-orange-50 dark:bg-orange-500/10 text-orange-600 dark:text-orange-400 border border-orange-200 dark:border-orange-500/20 mb-8 badge-float">
          <span className="w-1.5 h-1.5 rounded-full bg-orange-500 animate-pulse" />
          AI-Powered · Real-time Analysis
        </div>

        <h1 className="text-5xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight leading-[1.1] mb-6 max-w-3xl hero-heading">
          Understand the <span className="sentiment-word">sentiment</span><br />behind any text
        </h1>

        <p className="text-lg text-gray-500 dark:text-gray-400 max-w-xl leading-relaxed mb-10">
          Paste any text and instantly detect whether it's positive, negative, or neutral — powered by a machine learning model trained on millions of tweets.
        </p>

        <div className="flex flex-wrap justify-center gap-3 mb-12">
          {["✦ Free to use", "✦ No signup needed", "✦ Instant results", "✦ ML-powered"].map((f) => (
            <span key={f} className="feature-pill px-4 py-1.5 rounded-full text-sm font-medium bg-gray-100 dark:bg-white/5 text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-white/10">{f}</span>
          ))}
        </div>

        {/* INPUT CARD */}
        <div className="w-full max-w-2xl rounded-2xl glass-card overflow-hidden card-hover">
          <div className="flex items-center gap-2 px-5 py-3 border-b border-gray-100 dark:border-white/5">
            <span className="w-3 h-3 rounded-full bg-red-400" />
            <span className="w-3 h-3 rounded-full bg-yellow-400" />
            <span className="w-3 h-3 rounded-full bg-green-400" />
            <span className="ml-3 text-xs text-gray-400 dark:text-gray-500 font-mono">sentiment-analyzer.ai</span>
          </div>
          <div className="p-5">
            <textarea
              ref={textareaRef}
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={handleKey}
              onFocus={() => setTaFocused(true)}
              onBlur={() => setTaFocused(false)}
              placeholder="Type or paste your text here... (Ctrl+Enter to analyze)"
              rows={3}
              style={{ minHeight: "72px", maxHeight: "300px" }}
              className={`w-full bg-transparent outline-none resize-none text-base leading-relaxed text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-600 transition-all duration-200 rounded-lg textarea-glow${taFocused ? " textarea-focused" : ""}`}
            />
          </div>
          <div className="flex items-center justify-between px-5 py-3 border-t border-gray-100 dark:border-white/5 bg-gray-50 dark:bg-white/[0.02]">
            <div className="flex items-center gap-3">
              <span className="text-xs text-gray-400 dark:text-gray-600 font-mono">{text.length} chars</span>
              <label className="text-xs text-gray-400 hover:text-orange-500 dark:hover:text-orange-400 transition-colors cursor-pointer flex items-center gap-1 group">
                <svg className="w-3.5 h-3.5 group-hover:scale-110 transition-transform" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" /></svg>
                Upload file
                <input type="file" accept=".txt,.pdf,.jpg,.jpeg,.png" className="hidden" onChange={analyzeFile} />
              </label>
            </div>
            <div className="flex items-center gap-3">
              {text.length > 0 && (
                <button onClick={() => { setText(""); setResult(null); setError(""); }} className="text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors">Clear</button>
              )}
              <button onClick={analyze} disabled={loading || !text.trim()}
                className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-semibold bg-orange-500 hover:bg-orange-600 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed text-white transition-all duration-150 btn-glow">
                {loading
                  ? (<><svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" /></svg>Analyzing...</>)
                  : (<>Analyze<svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14M13 6l6 6-6 6" /></svg></>)
                }
              </button>
            </div>
          </div>
        </div>

        {/* ERROR */}
        {error && (
          <div className="mt-5 w-full max-w-2xl flex items-center gap-3 px-5 py-3.5 rounded-xl bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 text-red-600 dark:text-red-400 text-sm">
            <svg className="w-4 h-4 shrink-0" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm-.75-5.25a.75.75 0 001.5 0v-4a.75.75 0 00-1.5 0v4zm.75-7a1 1 0 100 2 1 1 0 000-2z" clipRule="evenodd" /></svg>
            {error}
          </div>
        )}

        {/* RESULT */}
        {result && (
          <div className="mt-5 w-full max-w-2xl rounded-2xl glass-card overflow-hidden result-reveal card-hover">
            <div className="px-6 py-5 flex items-center justify-between">
              <div className="text-left">
                <p className="text-xs font-semibold uppercase tracking-widest text-gray-400 dark:text-gray-500 mb-1">Analysis Result</p>
                <p className={`text-3xl font-extrabold tracking-tight ${sentimentColor}`}>
                  {result.sentiment === "Positive" ? "😊 Positive" : result.sentiment === "Negative" ? "😞 Negative" : "😐 Neutral"}
                </p>
                {result.confidence && (
                  <div className="mt-2 flex items-center gap-2">
                    <div className="flex-1 h-1.5 rounded-full bg-gray-100 dark:bg-white/10 overflow-hidden">
                      <div className={`h-full rounded-full transition-all duration-700 ${result.sentiment === "Positive" ? "bg-green-500" : result.sentiment === "Negative" ? "bg-red-500" : "bg-yellow-500"}`}
                        style={{ width: `${result.confidence * 100}%` }} />
                    </div>
                    <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 shrink-0">{Math.round(result.confidence * 100)}% confident</span>
                  </div>
                )}
              </div>
              <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-2xl result-icon ${result.sentiment === "Positive" ? "bg-green-50 dark:bg-green-500/10" : result.sentiment === "Negative" ? "bg-red-50 dark:bg-red-500/10" : "bg-yellow-50 dark:bg-yellow-500/10"}`}>
                {result.sentiment === "Positive" ? "✅" : result.sentiment === "Negative" ? "❌" : "⚠️"}
              </div>
            </div>
            <div className="px-6 py-3 border-t border-gray-100 dark:border-white/5 bg-gray-50 dark:bg-white/[0.02] flex items-center justify-between">
              <p className="text-xs text-gray-400 dark:text-gray-500">Analyzed {text.length} characters · Logistic Regression + TF-IDF</p>
              <div className="flex items-center gap-3">
                <button onClick={copyResult} className="flex items-center gap-1.5 text-xs font-medium text-gray-400 hover:text-orange-500 dark:hover:text-orange-400 transition-colors">
                  {copied
                    ? <><svg className="w-3.5 h-3.5 text-green-500" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg><span className="text-green-500">Copied!</span></>
                    : <><svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>Copy</>
                  }
                </button>
                <button onClick={exportPDF} className="flex items-center gap-1.5 text-xs font-medium text-gray-400 hover:text-orange-500 dark:hover:text-orange-400 transition-colors">
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 10v6m0 0l-3-3m3 3l3-3M3 17V7a2 2 0 012-2h6l2 2h6a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z" /></svg>
                  Download PDF
                </button>
                {user && (
                  <button onClick={() => navigate("/analytics")} className="flex items-center gap-1.5 text-xs font-semibold text-orange-500 hover:text-orange-600 transition-colors">
                    View Dashboard →
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
      </main>
      <LandingPage dark={dark} />
    </div>
  );
}
