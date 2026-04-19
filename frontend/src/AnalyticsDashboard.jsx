import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { authHeaders, clearSession } from "./App";
import AboutModal from "./AboutModal";
import API from "./api";

export default function AnalyticsDashboard({ dark, setDark }) {
  const navigate = useNavigate();
  const user     = (() => { try { return JSON.parse(localStorage.getItem("user")); } catch { return null; } })();

  const [history,       setHistory]       = useState([]);
  const [historySearch, setHistorySearch] = useState("");
  const [historyFilter, setHistoryFilter] = useState("All");
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [showSupport,   setShowSupport]   = useState(false);
  const [showAbout,     setShowAbout]     = useState(false);
  const [supportSent,   setSupportSent]   = useState(false);
  const [supportMsg,    setSupportMsg]    = useState("");

  const handleLogout = () => { clearSession(); navigate("/login", { replace: true }); };

  useEffect(() => {
    if (!user?.email) { setHistory([]); setLoadingHistory(false); return; }
    setLoadingHistory(true);
    fetch(`${API}/history?email=${encodeURIComponent(user.email)}`,
      { headers: (authHeaders().headers || {}) })
      .then((r) => r.json())
      .then((d) => {
        if (d.error === "Session expired. Please log in again.") { handleLogout(); return; }
        setHistory(Array.isArray(d) ? d : []);
      })
      .catch(() => setHistory([]))
      .finally(() => setLoadingHistory(false));
  }, [user?.email]);

  const deleteHistory = async (id) => {
    try {
      await axios.delete(`${API}/delete-history/${id}`, authHeaders());
      setHistory((prev) => prev.filter((i) => i.id !== id));
    } catch { }
  };

  const pos     = history.filter((h) => h.sentiment === "Positive").length;
  const neg     = history.filter((h) => h.sentiment === "Negative").length;
  const neutral = history.filter((h) => h.sentiment === "Neutral").length;
  const total   = history.length;

  const chartData = [
    { name: "Positive", value: pos },
    { name: "Negative", value: neg },
    ...(neutral > 0 ? [{ name: "Neutral", value: neutral }] : []),
  ].filter((d) => d.value > 0);

  // ── Trend data: group by date, count per sentiment ──────────────────────
  const trendData = (() => {
    const map = {};
    [...history].reverse().forEach((item) => {
      // created_at format: "15 Jun, 02:30 PM" — extract "15 Jun" as the date key
      const dateKey = item.created_at ? item.created_at.split(",")[0].trim() : "Unknown";
      if (!map[dateKey]) map[dateKey] = { date: dateKey, Positive: 0, Negative: 0, Neutral: 0 };
      if (item.sentiment === "Positive") map[dateKey].Positive++;
      else if (item.sentiment === "Negative") map[dateKey].Negative++;
      else map[dateKey].Neutral++;
    });
    return Object.values(map);
  })();

  const badgeColor = (s) =>
    s === "Positive" ? "bg-green-50 dark:bg-green-500/10 text-green-600 dark:text-green-400 border-green-200 dark:border-green-500/20"
    : s === "Negative" ? "bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400 border-red-200 dark:border-red-500/20"
    : "bg-yellow-50 dark:bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 border-yellow-200 dark:border-yellow-500/20";

  const filteredHistory = history
    .filter((i) => historyFilter === "All" || i.sentiment === historyFilter)
    .filter((i) => i.text.toLowerCase().includes(historySearch.toLowerCase()));

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
        <nav className="w-full max-w-5xl flex items-center justify-between px-6 py-3 rounded-2xl glass-nav">
          <button onClick={() => navigate("/dashboard")} className="flex items-center gap-2 font-bold text-xl tracking-tight select-none">
            <span className="w-7 h-7 rounded-lg bg-orange-500 flex items-center justify-center text-white text-sm font-black logo-icon-glow">S</span>
            <span className="logo-name-glow">Sentiment<span className="text-orange-500">AI</span></span>
          </button>
          <div className="hidden sm:flex items-center gap-6 text-sm font-medium text-gray-500 dark:text-gray-400">
            <button onClick={() => navigate("/dashboard")} className="hover:text-gray-900 dark:hover:text-white transition-colors flex items-center gap-1.5">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
              Analyze
            </button>
            <span className="text-orange-500 font-semibold flex items-center gap-1.5">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
              Dashboard
            </span>
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
      <main className="px-4 pt-32 pb-24 max-w-5xl mx-auto">

        {/* PAGE TITLE */}
        <div className="mb-8">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-semibold tracking-wide bg-orange-50 dark:bg-orange-500/10 text-orange-600 dark:text-orange-400 border border-orange-200 dark:border-orange-500/20 mb-4">
            <span className="w-1.5 h-1.5 rounded-full bg-orange-500 animate-pulse" />
            Analytics Overview
          </div>
          <h1 className="text-4xl font-extrabold tracking-tight text-gray-900 dark:text-white">Dashboard</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Your sentiment analysis history and statistics</p>
        </div>

        {loadingHistory ? (
          <div className="flex items-center justify-center py-24">
            <svg className="w-6 h-6 animate-spin text-orange-500" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
            </svg>
          </div>
        ) : total === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="w-16 h-16 rounded-2xl bg-orange-50 dark:bg-orange-500/10 flex items-center justify-center text-3xl mb-4">📊</div>
            <p className="text-lg font-semibold text-gray-900 dark:text-white mb-1">No analyses yet</p>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">Run your first sentiment analysis to see stats here.</p>
            <button onClick={() => navigate("/dashboard")} className="px-6 py-2.5 rounded-xl text-sm font-semibold bg-orange-500 hover:bg-orange-600 text-white transition-colors btn-glow">
              Start Analyzing →
            </button>
          </div>
        ) : (
          <>
            {/* SECTION 1 — STAT CARDS */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
              {/* Total */}
              <div className="rounded-2xl glass-card px-5 py-5 text-left">
                <p className="text-xs font-semibold uppercase tracking-widest text-gray-400 dark:text-gray-500 mb-2">Total</p>
                <p className="text-4xl font-extrabold text-gray-900 dark:text-white">{total}</p>
                <p className="text-xs text-gray-400 dark:text-gray-600 mt-1">analyses</p>
              </div>
              {/* Positive */}
              <div className="rounded-2xl glass-card px-5 py-5 text-left">
                <p className="text-xs font-semibold uppercase tracking-widest text-green-600 dark:text-green-400 mb-2">Positive</p>
                <p className="text-4xl font-extrabold text-green-600 dark:text-green-400">{pos}</p>
                <p className="text-xs text-green-500 dark:text-green-500/70 mt-1">
                  {total > 0 ? Math.round((pos / total) * 100) : 0}% of total
                </p>
              </div>
              {/* Negative */}
              <div className="rounded-2xl glass-card px-5 py-5 text-left">
                <p className="text-xs font-semibold uppercase tracking-widest text-red-600 dark:text-red-400 mb-2">Negative</p>
                <p className="text-4xl font-extrabold text-red-600 dark:text-red-400">{neg}</p>
                <p className="text-xs text-red-500 dark:text-red-500/70 mt-1">
                  {total > 0 ? Math.round((neg / total) * 100) : 0}% of total
                </p>
              </div>
              {/* Neutral */}
              <div className="rounded-2xl glass-card px-5 py-5 text-left">
                <p className="text-xs font-semibold uppercase tracking-widest text-yellow-600 dark:text-yellow-400 mb-2">Neutral</p>
                <p className="text-4xl font-extrabold text-yellow-600 dark:text-yellow-400">{neutral}</p>
                <p className="text-xs text-yellow-500 dark:text-yellow-500/70 mt-1">
                  {total > 0 ? Math.round((neutral / total) * 100) : 0}% of total
                </p>
              </div>
            </div>

            {/* Percentage bar */}
            {total > 0 && (
              <div className="rounded-xl overflow-hidden h-2 flex mb-8">
                <div className="bg-green-500 transition-all duration-500" style={{ width: `${Math.round((pos / total) * 100)}%` }} />
                <div className="bg-red-500 transition-all duration-500" style={{ width: `${Math.round((neg / total) * 100)}%` }} />
                {neutral > 0 && <div className="bg-yellow-400 transition-all duration-500" style={{ width: `${Math.round((neutral / total) * 100)}%` }} />}
              </div>
            )}

            {/* SECTION 2 — CHARTS GRID */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">

              {/* Pie chart — existing, untouched */}
              <div className="rounded-2xl glass-card overflow-hidden">
                <div className="px-6 pt-5 pb-1 flex items-center justify-between">
                  <h2 className="text-lg font-bold text-gray-900 dark:text-white">Sentiment Split</h2>
                  <div className="flex items-center gap-3 text-xs font-medium">
                    <span className="flex items-center gap-1.5 text-green-500"><span className="w-2 h-2 rounded-full bg-green-500" />{pos}</span>
                    <span className="flex items-center gap-1.5 text-red-500"><span className="w-2 h-2 rounded-full bg-red-500" />{neg}</span>
                    {neutral > 0 && <span className="flex items-center gap-1.5 text-yellow-500"><span className="w-2 h-2 rounded-full bg-yellow-400" />{neutral}</span>}
                  </div>
                </div>
                <ResponsiveContainer width="100%" height={240}>
                  <PieChart>
                    <Pie data={chartData} cx="50%" cy="50%" innerRadius={65} outerRadius={95} paddingAngle={4} dataKey="value">
                      <Cell fill="#22c55e" stroke="transparent" />
                      <Cell fill="#ef4444" stroke="transparent" />
                      {neutral > 0 && <Cell fill="#eab308" stroke="transparent" />}
                    </Pie>
                    <Tooltip contentStyle={{ background: dark ? "#1a1a1a" : "#fff", border: dark ? "1px solid rgba(255,255,255,0.1)" : "1px solid #e5e7eb", borderRadius: "12px", color: dark ? "#fff" : "#111", fontSize: "13px" }} formatter={(v, n) => [`${v} entries`, n]} />
                    <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: "13px", color: dark ? "#9ca3af" : "#6b7280" }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              {/* Bar chart — sentiment trend over time */}
              <div className="rounded-2xl glass-card overflow-hidden">
                <div className="px-6 pt-5 pb-1">
                  <h2 className="text-lg font-bold text-gray-900 dark:text-white">Sentiment Trend</h2>
                  <p className="text-xs text-gray-400 dark:text-gray-600 mt-0.5">Analyses per day</p>
                </div>
                {trendData.length < 2 ? (
                  <div className="flex flex-col items-center justify-center h-[200px] text-center px-6">
                    <span className="text-3xl mb-2">📈</span>
                    <p className="text-sm text-gray-400 dark:text-gray-600">Analyze on multiple days to see your trend</p>
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height={240}>
                    <BarChart data={trendData} margin={{ top: 16, right: 20, left: -10, bottom: 4 }} barCategoryGap="30%">
                      <CartesianGrid strokeDasharray="3 3" stroke={dark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.06)"} vertical={false} />
                      <XAxis dataKey="date" tick={{ fontSize: 11, fill: dark ? "#6b7280" : "#9ca3af" }} axisLine={false} tickLine={false} />
                      <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: dark ? "#6b7280" : "#9ca3af" }} axisLine={false} tickLine={false} />
                      <Tooltip
                        contentStyle={{ background: dark ? "#1a1a1a" : "#fff", border: dark ? "1px solid rgba(255,255,255,0.1)" : "1px solid #e5e7eb", borderRadius: "12px", color: dark ? "#fff" : "#111", fontSize: "13px" }}
                        cursor={{ fill: dark ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.03)" }}
                      />
                      <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: "13px", color: dark ? "#9ca3af" : "#6b7280", paddingTop: "8px" }} />
                      <Bar dataKey="Positive" fill="#22c55e" radius={[4, 4, 0, 0]} maxBarSize={32} />
                      <Bar dataKey="Negative" fill="#ef4444" radius={[4, 4, 0, 0]} maxBarSize={32} />
                      {neutral > 0 && <Bar dataKey="Neutral" fill="#eab308" radius={[4, 4, 0, 0]} maxBarSize={32} />}
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>

            </div>

            {/* SECTION 3 — HISTORY */}
            <div className="text-left">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold text-gray-900 dark:text-white">Recent Analysis</h2>
                <span className="text-xs text-gray-400 dark:text-gray-500 font-mono">{history.length} entries</span>
              </div>

              {/* Search + Filter */}
              <div className="flex flex-col sm:flex-row gap-2 mb-4">
                <div className="relative flex-1">
                  <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 dark:text-gray-600 pointer-events-none" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M17 11A6 6 0 105 11a6 6 0 0012 0z" /></svg>
                  <input type="text" value={historySearch} onChange={(e) => setHistorySearch(e.target.value)} placeholder="Search history..."
                    className="w-full pl-8 pr-4 py-2 rounded-xl text-sm bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-600 outline-none focus:border-orange-500 transition-colors" />
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  {["All", "Positive", "Negative", "Neutral"].map((f) => (
                    <button key={f} onClick={() => setHistoryFilter(f)}
                      className={`px-3 py-2 rounded-xl text-xs font-semibold border transition-colors ${historyFilter === f
                        ? f === "Positive" ? "bg-green-500 border-green-500 text-white"
                          : f === "Negative" ? "bg-red-500 border-red-500 text-white"
                          : f === "Neutral" ? "bg-yellow-400 border-yellow-400 text-white"
                          : "bg-orange-500 border-orange-500 text-white"
                        : "bg-gray-50 dark:bg-white/5 border-gray-200 dark:border-white/10 text-gray-500 dark:text-gray-400"}`}>
                      {f}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex flex-col gap-3">
                {filteredHistory.length === 0 ? (
                  <p className="text-sm text-gray-400 dark:text-gray-600 text-center py-6">No results found.</p>
                ) : filteredHistory.map((item) => (
                  <div key={item.id} className="flex items-start justify-between gap-4 px-5 py-4 rounded-xl glass-card">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed line-clamp-2">{item.text}</p>
                      <div className="flex items-center gap-3 mt-1.5">
                        {item.created_at && <span className="text-xs text-gray-400 dark:text-gray-600 font-mono">{item.created_at}</span>}
                        {item.confidence && <span className="text-xs text-gray-400 dark:text-gray-600">{Math.round(item.confidence * 100)}% confident</span>}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${badgeColor(item.sentiment)}`}>
                        {item.sentiment === "Positive" ? "😊" : item.sentiment === "Negative" ? "😞" : "😐"} {item.sentiment}
                      </span>
                      <button onClick={() => deleteHistory(item.id)} className="w-6 h-6 flex items-center justify-center rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors" title="Delete">✕</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
