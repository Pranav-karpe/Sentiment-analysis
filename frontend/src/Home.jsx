import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { authHeaders, clearSession } from "./App";

export default function Home({ dark, setDark }) {
  const navigate = useNavigate();
  const user     = (() => { try { return JSON.parse(localStorage.getItem("user")); } catch { return null; } })();

  const [text,    setText]    = useState("");
  const [result,  setResult]  = useState(null);
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState("");

  const handleLogout = () => { clearSession(); navigate("/login", { replace: true }); };

  const analyze = async () => {
    if (!text.trim()) { setError("Please enter some text before analyzing."); return; }
    setLoading(true); setResult(null); setError("");
    try {
      const res = await axios.post("http://127.0.0.1:5000/predict",
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
      const res = await axios.post("http://127.0.0.1:5000/analyze-file", fd, { headers });
      setResult({ sentiment: res.data.sentiment, confidence: res.data.confidence });
      setText(res.data.text || "");
    } catch (ex) {
      setError(ex.response?.data?.error || "File analysis failed.");
    } finally { setLoading(false); e.target.value = ""; }
  };

  const exportPDF = async () => {
    try {
      const res = await axios.post("http://127.0.0.1:5000/export-report",
        { text, sentiment: result?.sentiment, confidence: result?.confidence,
          positive_count: 0, negative_count: 0 },
        { ...authHeaders(), responseType: "blob" });
      const url = URL.createObjectURL(new Blob([res.data], { type: "application/pdf" }));
      const a = document.createElement("a"); a.href = url;
      a.download = "sentiment_report.pdf"; a.click();
      URL.revokeObjectURL(url);
    } catch { setError("Could not generate PDF."); }
  };

  const handleKey = (e) => { if (e.key === "Enter" && e.ctrlKey) analyze(); };

  const sentimentColor =
    result?.sentiment === "Positive" ? "text-green-500" :
    result?.sentiment === "Negative" ? "text-red-500" : "text-yellow-500";

  return (
    <div className="min-h-screen bg-white dark:bg-[#0a0a0a] text-gray-900 dark:text-white transition-colors duration-300">

      {/* NAVBAR */}
      <header className="fixed top-0 inset-x-0 z-50 flex justify-center pt-4 px-4">
        <nav className="w-full max-w-4xl flex items-center justify-between px-6 py-3 rounded-2xl glass-nav">
          <a href="/" className="flex items-center gap-2 font-bold text-xl tracking-tight select-none">
            <span className="w-7 h-7 rounded-lg bg-orange-500 flex items-center justify-center text-white text-sm font-black">S</span>
            Sentiment<span className="text-orange-500">AI</span>
          </a>
          <div className="hidden sm:flex items-center gap-6 text-sm font-medium text-gray-500 dark:text-gray-400">
            <button onClick={() => navigate("/analytics")} className="hover:text-gray-900 dark:hover:text-white transition-colors">Dashboard</button>
            <a href="#" className="hover:text-gray-900 dark:hover:text-white transition-colors">Docs</a>
            <a href="#" className="hover:text-gray-900 dark:hover:text-white transition-colors">Pricing</a>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => setDark(!dark)} className="w-9 h-9 rounded-xl flex items-center justify-center text-base bg-gray-100 dark:bg-white/10 hover:bg-gray-200 dark:hover:bg-white/20 transition-colors">
              {dark ? "☀️" : "🌙"}
            </button>
            {user ? (
              <>
                <span className="text-sm text-gray-600 dark:text-gray-300 font-medium">👋 {user.name}</span>
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
      </header>

      {/* MAIN */}
      <main className="flex flex-col items-center text-center px-4 pt-36 pb-24">

        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-semibold tracking-wide bg-orange-50 dark:bg-orange-500/10 text-orange-600 dark:text-orange-400 border border-orange-200 dark:border-orange-500/20 mb-8">
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
            <span key={f} className="px-4 py-1.5 rounded-full text-sm font-medium bg-gray-100 dark:bg-white/5 text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-white/10">{f}</span>
          ))}
        </div>

        {/* INPUT CARD */}
        <div className="w-full max-w-2xl rounded-2xl glass-card overflow-hidden">
          <div className="flex items-center gap-2 px-5 py-3 border-b border-gray-100 dark:border-white/5">
            <span className="w-3 h-3 rounded-full bg-red-400" />
            <span className="w-3 h-3 rounded-full bg-yellow-400" />
            <span className="w-3 h-3 rounded-full bg-green-400" />
            <span className="ml-3 text-xs text-gray-400 dark:text-gray-500 font-mono">sentiment-analyzer.ai</span>
          </div>
          <div className="p-5">
            <textarea rows={5} value={text} onChange={(e) => setText(e.target.value)} onKeyDown={handleKey}
              placeholder="Type or paste your text here... (Ctrl+Enter to analyze)"
              className="w-full bg-transparent outline-none resize-none text-base leading-relaxed text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-600" />
          </div>
          <div className="flex items-center justify-between px-5 py-3 border-t border-gray-100 dark:border-white/5 bg-gray-50 dark:bg-white/[0.02]">
            <div className="flex items-center gap-3">
              <span className="text-xs text-gray-400 dark:text-gray-600 font-mono">{text.length} / 5000 chars</span>
              {/* File upload — .txt, .pdf, .jpg, .jpeg, .png */}
              <label className="text-xs text-gray-400 hover:text-orange-500 dark:hover:text-orange-400 transition-colors cursor-pointer flex items-center gap-1">
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" /></svg>
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
                {loading ? (<><svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" /></svg>Analyzing...</>) : (<>Analyze<svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14M13 6l6 6-6 6" /></svg></>)}
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
          <div className="mt-5 w-full max-w-2xl rounded-2xl glass-card overflow-hidden">
            <div className="px-6 py-5 flex items-center justify-between">
              <div className="text-left">
                <p className="text-xs font-semibold uppercase tracking-widest text-gray-400 dark:text-gray-500 mb-1">Analysis Result</p>
                <p className={`text-3xl font-extrabold tracking-tight ${sentimentColor}`}>
                  {result.sentiment === "Positive" ? "😊 Positive" : result.sentiment === "Negative" ? "😞 Negative" : "😐 Neutral"}
                </p>
                {result.confidence && (
                  <div className="mt-2 flex items-center gap-2">
                    <div className="flex-1 h-1.5 rounded-full bg-gray-100 dark:bg-white/10 overflow-hidden">
                      <div className={`h-full rounded-full transition-all duration-500 ${result.sentiment === "Positive" ? "bg-green-500" : result.sentiment === "Negative" ? "bg-red-500" : "bg-yellow-500"}`} style={{ width: `${result.confidence * 100}%` }} />
                    </div>
                    <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 shrink-0">{Math.round(result.confidence * 100)}% confident</span>
                  </div>
                )}
              </div>
              <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-2xl ${result.sentiment === "Positive" ? "bg-green-50 dark:bg-green-500/10" : result.sentiment === "Negative" ? "bg-red-50 dark:bg-red-500/10" : "bg-yellow-50 dark:bg-yellow-500/10"}`}>
                {result.sentiment === "Positive" ? "✅" : result.sentiment === "Negative" ? "❌" : "⚠️"}
              </div>
            </div>
            <div className="px-6 py-3 border-t border-gray-100 dark:border-white/5 bg-gray-50 dark:bg-white/[0.02] flex items-center justify-between">
              <p className="text-xs text-gray-400 dark:text-gray-500">Analyzed {text.length} characters · Powered by Logistic Regression + TF-IDF</p>
              <div className="flex items-center gap-3">
                <button onClick={exportPDF} className="flex items-center gap-1.5 text-xs font-medium text-gray-400 hover:text-orange-500 dark:hover:text-orange-400 transition-colors">
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 10v6m0 0l-3-3m3 3l3-3M3 17V7a2 2 0 012-2h6l2 2h6a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z" /></svg>
                  Download PDF
                </button>
                {user && (
                  <button onClick={() => navigate("/analytics")} className="flex items-center gap-1.5 text-xs font-medium text-orange-500 hover:text-orange-600 transition-colors">
                    View Dashboard →
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
