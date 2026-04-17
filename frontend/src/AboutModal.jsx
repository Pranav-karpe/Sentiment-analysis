import { useEffect, useState } from "react";

const FEATURES = [
  {
    icon: "🧠",
    color: "orange",
    title: "Sentiment Analysis",
    desc: "Logistic Regression + TF-IDF model trained on millions of tweets. Detects Positive, Negative, and Neutral sentiment with a confidence score.",
    tags: ["ML Model", "TF-IDF", "Confidence Score"],
  },
  {
    icon: "📁",
    color: "blue",
    title: "Multi-Format File Upload",
    desc: "Upload .txt, .pdf, or image files (.jpg, .jpeg, .png). Images are processed via Tesseract OCR to extract text before analysis.",
    tags: [".txt", ".pdf", ".jpg / .png", "OCR"],
  },
  {
    icon: "🔐",
    color: "purple",
    title: "Authentication & Sessions",
    desc: "Secure signup, login, and password reset. JWT tokens with 48-hour expiry and inactivity detection. All data stored in MongoDB Atlas.",
    tags: ["JWT Auth", "48hr Session", "MongoDB Atlas"],
  },
  {
    icon: "📊",
    color: "green",
    title: "Analytics Dashboard",
    desc: "View your full analysis history with stats cards (Total, Positive %, Negative %, Neutral %), an interactive pie chart, and a percentage bar.",
    tags: ["Pie Chart", "Stats Cards", "History"],
  },
  {
    icon: "🔍",
    color: "yellow",
    title: "Search & Filter History",
    desc: "Search your past analyses by text content. Filter by sentiment type — All, Positive, Negative, or Neutral. Delete any entry instantly.",
    tags: ["Search", "Filter", "Delete"],
  },
  {
    icon: "📄",
    color: "red",
    title: "PDF Report Export",
    desc: "Download a professionally formatted PDF report with your analyzed text, sentiment result, confidence score, timestamp, and session summary table.",
    tags: ["PDF Export", "ReportLab", "Session Summary"],
  },
  {
    icon: "🌗",
    color: "gray",
    title: "Dark / Light Mode",
    desc: "Full dark and light theme support with glassy frosted-glass UI, animated background orbs, shimmer effects, and smooth transitions.",
    tags: ["Dark Mode", "Glass UI", "Animations"],
  },
  {
    icon: "⚡",
    color: "orange",
    title: "Real-time & Keyboard Shortcuts",
    desc: "Press Ctrl+Enter to analyze instantly. Auto-resizing textarea with no character limit. File upload result loads directly into the input.",
    tags: ["Ctrl+Enter", "Auto-resize", "No Char Limit"],
  },
];

const colorMap = {
  orange: "bg-orange-50 dark:bg-orange-500/10 border-orange-200 dark:border-orange-500/20 text-orange-600 dark:text-orange-400",
  blue:   "bg-blue-50 dark:bg-blue-500/10 border-blue-200 dark:border-blue-500/20 text-blue-600 dark:text-blue-400",
  purple: "bg-purple-50 dark:bg-purple-500/10 border-purple-200 dark:border-purple-500/20 text-purple-600 dark:text-purple-400",
  green:  "bg-green-50 dark:bg-green-500/10 border-green-200 dark:border-green-500/20 text-green-600 dark:text-green-400",
  yellow: "bg-yellow-50 dark:bg-yellow-500/10 border-yellow-200 dark:border-yellow-500/20 text-yellow-600 dark:text-yellow-400",
  red:    "bg-red-50 dark:bg-red-500/10 border-red-200 dark:border-red-500/20 text-red-600 dark:text-red-400",
  gray:   "bg-gray-100 dark:bg-white/5 border-gray-200 dark:border-white/10 text-gray-600 dark:text-gray-400",
};

const tagColorMap = {
  orange: "bg-orange-100 dark:bg-orange-500/15 text-orange-600 dark:text-orange-400",
  blue:   "bg-blue-100 dark:bg-blue-500/15 text-blue-600 dark:text-blue-400",
  purple: "bg-purple-100 dark:bg-purple-500/15 text-purple-600 dark:text-purple-400",
  green:  "bg-green-100 dark:bg-green-500/15 text-green-600 dark:text-green-400",
  yellow: "bg-yellow-100 dark:bg-yellow-500/15 text-yellow-600 dark:text-yellow-400",
  red:    "bg-red-100 dark:bg-red-500/15 text-red-600 dark:text-red-400",
  gray:   "bg-gray-200 dark:bg-white/10 text-gray-600 dark:text-gray-400",
};

export default function AboutModal({ onClose }) {
  const [visible, setVisible] = useState(false);
  const [cardsVisible, setCardsVisible] = useState([]);

  // Mount: trigger backdrop + panel slide-in
  useEffect(() => {
    requestAnimationFrame(() => setVisible(true));
    // Stagger each feature card
    FEATURES.forEach((_, i) => {
      setTimeout(() => setCardsVisible((prev) => [...prev, i]), 120 + i * 60);
    });
  }, []);

  const close = () => {
    setVisible(false);
    setTimeout(onClose, 280);
  };

  // Close on Escape
  useEffect(() => {
    const handler = (e) => { if (e.key === "Escape") close(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center px-4 py-6"
      onClick={close}
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-md transition-opacity duration-300"
        style={{ opacity: visible ? 1 : 0 }}
      />

      {/* Panel */}
      <div
        className="relative w-full max-w-2xl glass-card rounded-3xl overflow-hidden z-10 flex flex-col"
        style={{
          maxHeight: "88vh",
          transform: visible ? "translateY(0) scale(1)" : "translateY(32px) scale(0.96)",
          opacity: visible ? 1 : 0,
          transition: "transform 0.32s cubic-bezier(0.22,1,0.36,1), opacity 0.28s ease",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 pt-6 pb-4 border-b border-gray-100 dark:border-white/5 shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="w-10 h-10 rounded-xl bg-orange-500 flex items-center justify-center text-white font-black text-lg logo-icon-glow shrink-0">S</span>
              <div>
                <h2 className="text-xl font-extrabold text-gray-900 dark:text-white tracking-tight">
                  Sentiment<span className="text-orange-500">AI</span>
                </h2>
                <p className="text-xs text-gray-500 dark:text-gray-400">v2.0 · Full-stack ML Sentiment Platform</p>
              </div>
            </div>
            <button
              onClick={close}
              className="w-9 h-9 rounded-xl flex items-center justify-center text-gray-400 hover:text-gray-700 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-white/10 transition-all text-lg"
            >
              ✕
            </button>
          </div>

          {/* Tech stack pills */}
          <div className="flex flex-wrap gap-2 mt-4">
            {["React + Vite", "Flask (Python)", "MongoDB Atlas", "Logistic Regression", "TF-IDF", "JWT Auth", "Tesseract OCR", "ReportLab PDF", "Recharts"].map((t) => (
              <span key={t} className="px-2.5 py-1 rounded-lg text-xs font-medium bg-gray-100 dark:bg-white/5 text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-white/10">
                {t}
              </span>
            ))}
          </div>
        </div>

        {/* Scrollable feature cards */}
        <div className="overflow-y-auto px-6 py-5 flex flex-col gap-3">
          <p className="text-xs font-semibold uppercase tracking-widest text-gray-400 dark:text-gray-500 mb-1">All Features</p>

          {FEATURES.map((f, i) => (
            <div
              key={f.title}
              className={`rounded-2xl border p-4 transition-all duration-300 ${colorMap[f.color]}`}
              style={{
                opacity: cardsVisible.includes(i) ? 1 : 0,
                transform: cardsVisible.includes(i) ? "translateY(0)" : "translateY(14px)",
                transition: `opacity 0.35s ease, transform 0.35s cubic-bezier(0.22,1,0.36,1)`,
              }}
            >
              <div className="flex items-start gap-3">
                <span className="text-2xl mt-0.5 shrink-0">{f.icon}</span>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-gray-900 dark:text-white text-sm mb-1">{f.title}</p>
                  <p className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed">{f.desc}</p>
                  <div className="flex flex-wrap gap-1.5 mt-2.5">
                    {f.tags.map((tag) => (
                      <span key={tag} className={`px-2 py-0.5 rounded-md text-xs font-semibold ${tagColorMap[f.color]}`}>
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-100 dark:border-white/5 bg-gray-50 dark:bg-white/[0.02] shrink-0 flex items-center justify-between">
          <p className="text-xs text-gray-400 dark:text-gray-600">Built with React · Flask · MongoDB · ML</p>
          <button
            onClick={close}
            className="px-4 py-2 rounded-xl text-xs font-semibold bg-orange-500 hover:bg-orange-600 text-white transition-all btn-glow"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
