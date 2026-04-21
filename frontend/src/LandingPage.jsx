import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";

// ── Scroll-reveal hook ────────────────────────────────────────────────────────
function useReveal() {
  const ref = useRef(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setVisible(true); obs.disconnect(); } },
      { threshold: 0.12 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);
  return [ref, visible];
}

// ── Reveal wrapper ────────────────────────────────────────────────────────────
function Reveal({ children, delay = 0, className = "" }) {
  const [ref, visible] = useReveal();
  return (
    <div
      ref={ref}
      className={className}
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? "translateY(0)" : "translateY(32px)",
        transition: `opacity 0.6s ease ${delay}ms, transform 0.6s cubic-bezier(0.22,1,0.36,1) ${delay}ms`,
      }}
    >
      {children}
    </div>
  );
}

// ── Section label ─────────────────────────────────────────────────────────────
function SectionLabel({ children }) {
  return (
    <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-semibold tracking-wide bg-orange-50 dark:bg-orange-500/10 text-orange-600 dark:text-orange-400 border border-orange-200 dark:border-orange-500/20 mb-4">
      <span className="w-1.5 h-1.5 rounded-full bg-orange-500" />
      {children}
    </div>
  );
}

// ── Divider ───────────────────────────────────────────────────────────────────
function Divider() {
  return <div className="w-full max-w-4xl mx-auto h-px bg-gradient-to-r from-transparent via-gray-200 dark:via-white/10 to-transparent my-2" />;
}

// ── FAQ item ──────────────────────────────────────────────────────────────────
function FAQItem({ q, a }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="glass-card rounded-2xl overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-6 py-4 text-left gap-4 hover:bg-white/5 transition-colors"
      >
        <span className="font-semibold text-gray-900 dark:text-white text-sm">{q}</span>
        <span
          className="text-orange-500 text-lg shrink-0 transition-transform duration-300"
          style={{ transform: open ? "rotate(45deg)" : "rotate(0deg)" }}
        >
          +
        </span>
      </button>
      <div
        style={{
          maxHeight: open ? "300px" : "0",
          opacity: open ? 1 : 0,
          transition: "max-height 0.4s cubic-bezier(0.22,1,0.36,1), opacity 0.3s ease",
          overflow: "hidden",
        }}
      >
        <p className="px-6 pb-5 text-sm text-gray-500 dark:text-gray-400 leading-relaxed">{a}</p>
      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export default function LandingPage({ dark }) {
  const navigate = useNavigate();

  const useCases = [
    { icon: "⭐", title: "Customer Reviews", desc: "Instantly understand if customers love or hate your product from review text." },
    { icon: "📱", title: "Social Media", desc: "Track brand sentiment across tweets, comments, and posts in real time." },
    { icon: "🎫", title: "Support Tickets", desc: "Prioritize urgent or frustrated tickets automatically by tone." },
    { icon: "📋", title: "Surveys", desc: "Turn open-ended survey responses into actionable positive/negative signals." },
    { icon: "📦", title: "Product Feedback", desc: "Identify which features users love and which ones frustrate them." },
    { icon: "👥", title: "Employee Feedback", desc: "Gauge team morale and satisfaction from anonymous feedback forms." },
  ];

  const realWorld = [
    { icon: "🛒", label: "E-commerce", desc: "Analyze product reviews to improve listings and catch quality issues early." },
    { icon: "💻", label: "SaaS", desc: "Monitor user feedback to reduce churn and prioritize the right features." },
    { icon: "🍽️", label: "Restaurants", desc: "Understand what diners love and what drives negative reviews." },
    { icon: "🏪", label: "Local Business", desc: "Track Google/Yelp review sentiment without reading every single one." },
    { icon: "🎬", label: "Content Creators", desc: "Measure audience reaction to content and adjust strategy accordingly." },
  ];

  const faqs = [
    {
      q: "What is sentiment analysis?",
      a: "Sentiment analysis is a Natural Language Processing (NLP) technique that identifies the emotional tone behind text — whether it's positive, negative, or neutral. It's used to understand opinions, feedback, and reactions at scale.",
    },
    {
      q: "What tools and technologies power this?",
      a: "SentimentAI uses a Logistic Regression model trained on Twitter data with TF-IDF vectorization. The backend is Flask (Python), the database is MongoDB Atlas, authentication uses JWT tokens, and the frontend is React + Tailwind CSS.",
    },
    {
      q: "What types of sentiment can it detect?",
      a: "The model detects Positive, Negative, and Neutral sentiment. Each result includes a confidence score (0–100%) so you know how certain the model is about its prediction.",
    },
    {
      q: "What file formats can I upload?",
      a: "You can upload .txt files, .pdf documents, and images (.jpg, .jpeg, .png). Images are processed using Tesseract OCR to extract text before analysis.",
    },
    {
      q: "Is my data private?",
      a: "Your analysis history is stored securely in MongoDB Atlas and is only accessible to your account. Sessions expire after 48 hours of inactivity. You can delete any history entry at any time.",
    },
    {
      q: "Do I need an account to use it?",
      a: "You need an account to save history, view analytics, and download PDF reports. The core sentiment analysis works for all users.",
    },
  ];

  return (
    <div className="w-full text-gray-900 dark:text-white">

      {/* ── PROBLEM ─────────────────────────────────────────────────────────── */}
      <section className="py-14 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <Reveal>
            <SectionLabel>The Problem</SectionLabel>
            <h2 className="text-4xl sm:text-5xl font-extrabold tracking-tight leading-tight mb-6">
              Figure Out What People Really<br />
              <span className="sentiment-word">Think About Your Business</span>
            </h2>
            <p className="text-lg text-gray-500 dark:text-gray-400 max-w-2xl mx-auto leading-relaxed">
              Every day your customers leave reviews, send support messages, and post on social media. Hidden inside that text is the truth about your product — but reading it all manually is impossible.
            </p>
          </Reveal>
        </div>
      </section>

      <Divider />

      {/* ── WHY MANUAL FAILS ────────────────────────────────────────────────── */}
      <section className="py-14 px-4">
        <div className="max-w-4xl mx-auto">
          <Reveal className="text-center mb-8">
            <SectionLabel>Why Manual Analysis Fails</SectionLabel>
            <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
              Reading feedback manually doesn't scale
            </h2>
          </Reveal>
          <div className="grid sm:grid-cols-2 gap-4">
            {[
              { icon: "⏱️", title: "Takes Too Long", desc: "Reading hundreds of reviews manually takes hours. By the time you finish, the feedback is already outdated." },
              { icon: "🤔", title: "Different Interpretations", desc: "Two people reading the same text often reach different conclusions. Human bias makes results inconsistent." },
              { icon: "🔍", title: "Misses Subtle Meaning", desc: "Sarcasm, irony, and nuanced language are easy to miss when skimming through large volumes of text." },
              { icon: "📈", title: "Volume Overload", desc: "A single viral post can generate thousands of comments overnight. Manual analysis simply cannot keep up." },
            ].map((item, i) => (
              <Reveal key={item.title} delay={i * 80}>
                <div className="glass-card rounded-2xl p-5 card-hover h-full">
                  <div className="flex items-start gap-4">
                    <span className="text-3xl shrink-0">{item.icon}</span>
                    <div>
                      <p className="font-bold text-gray-900 dark:text-white mb-1">{item.title}</p>
                      <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed">{item.desc}</p>
                    </div>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <Divider />

      {/* ── SYSTEMATIC APPROACH ─────────────────────────────────────────────── */}
      <section className="py-14 px-4">
        <div className="max-w-4xl mx-auto">
          <Reveal className="text-center mb-8">
            <SectionLabel>The AI Solution</SectionLabel>
            <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight mb-4">
              A systematic approach to understanding text
            </h2>
            <p className="text-gray-500 dark:text-gray-400 max-w-2xl mx-auto leading-relaxed">
              SentimentAI uses machine learning trained on millions of real-world examples to classify text instantly, consistently, and at any scale — without fatigue or bias.
            </p>
          </Reveal>
          <div className="grid sm:grid-cols-3 gap-4">
            {[
              { step: "01", title: "Paste or Upload", desc: "Enter text directly, upload a .txt/.pdf file, or even a photo with text — OCR extracts it automatically." },
              { step: "02", title: "AI Analyzes", desc: "The model vectorizes your text using TF-IDF and classifies it with Logistic Regression in milliseconds." },
              { step: "03", title: "Get Insights", desc: "Receive a Positive, Negative, or Neutral result with a confidence score. Save history and export PDF reports." },
            ].map((item, i) => (
              <Reveal key={item.step} delay={i * 100}>
                <div className="glass-card rounded-2xl p-6 card-hover text-center h-full">
                  <div className="w-10 h-10 rounded-xl bg-orange-500/10 border border-orange-500/20 flex items-center justify-center text-orange-500 font-black text-sm mx-auto mb-4">{item.step}</div>
                  <p className="font-bold text-gray-900 dark:text-white mb-2">{item.title}</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed">{item.desc}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <Divider />

      {/* ── USE CASES ───────────────────────────────────────────────────────── */}
      <section className="py-14 px-4">
        <div className="max-w-4xl mx-auto">
          <Reveal className="text-center mb-8">
            <SectionLabel>Use Cases</SectionLabel>
            <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
              Works for every type of feedback
            </h2>
          </Reveal>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {useCases.map((uc, i) => (
              <Reveal key={uc.title} delay={i * 70}>
                <div className="glass-card rounded-2xl p-5 card-hover h-full">
                  <span className="text-3xl mb-3 block">{uc.icon}</span>
                  <p className="font-bold text-gray-900 dark:text-white mb-1.5">{uc.title}</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed">{uc.desc}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <Divider />

      {/* ── REAL WORLD EXAMPLES ─────────────────────────────────────────────── */}
      <section className="py-14 px-4">
        <div className="max-w-4xl mx-auto">
          <Reveal className="text-center mb-8">
            <SectionLabel>Real World Examples</SectionLabel>
            <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
              Who benefits from sentiment analysis?
            </h2>
          </Reveal>
          <div className="flex flex-col gap-3">
            {realWorld.map((rw, i) => (
              <Reveal key={rw.label} delay={i * 60}>
                <div className="glass-card rounded-2xl px-6 py-4 card-hover flex items-center gap-5">
                  <span className="text-3xl shrink-0">{rw.icon}</span>
                  <div>
                    <p className="font-bold text-gray-900 dark:text-white">{rw.label}</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">{rw.desc}</p>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <Divider />

      {/* ── PRACTICAL IMPACT ────────────────────────────────────────────────── */}
      <section className="py-14 px-4">
        <div className="max-w-4xl mx-auto">
          <Reveal className="text-center mb-10">
            <SectionLabel>Practical Impact</SectionLabel>
            <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight mb-4">
              Turn text into decisions
            </h2>
          </Reveal>
          <Reveal delay={100}>
            <div className="glass-card rounded-3xl p-8 card-hover">
              <div className="grid sm:grid-cols-3 gap-8 text-center">
                {[
                  { stat: "< 1s", label: "Analysis time", sub: "Instant results on any text" },
                  { stat: "3", label: "Sentiment classes", sub: "Positive · Negative · Neutral" },
                  { stat: "4+", label: "File formats", sub: ".txt · .pdf · .jpg · .png" },
                ].map((s) => (
                  <div key={s.label}>
                    <p className="text-4xl font-extrabold text-orange-500 mb-1">{s.stat}</p>
                    <p className="font-semibold text-gray-900 dark:text-white text-sm">{s.label}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{s.sub}</p>
                  </div>
                ))}
              </div>
              <div className="mt-8 pt-6 border-t border-gray-100 dark:border-white/5">
                <p className="text-gray-500 dark:text-gray-400 text-sm leading-relaxed text-center max-w-2xl mx-auto">
                  When you understand the sentiment behind your feedback, you stop guessing and start acting. Identify your biggest pain points, double down on what's working, and respond to customers before small issues become big problems.
                </p>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      <Divider />

      {/* ── GETTING STARTED ─────────────────────────────────────────────────── */}
      <section className="py-14 px-4">
        <div className="max-w-4xl mx-auto">
          <Reveal className="text-center mb-8">
            <SectionLabel>Getting Started</SectionLabel>
            <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
              Up and running in seconds
            </h2>
          </Reveal>
          <div className="grid sm:grid-cols-2 gap-4">
            {[
              { icon: "✍️", title: "Type or paste text", desc: "Enter any text directly into the input box. Works with reviews, tweets, emails, survey responses — anything." },
              { icon: "📎", title: "Or upload a file", desc: "Upload a .txt, .pdf, or image file. The system extracts the text automatically using OCR for images." },
              { icon: "⚡", title: "Hit Analyze", desc: "Click Analyze or press Ctrl+Enter. Results appear instantly with a sentiment label and confidence score." },
              { icon: "📊", title: "Track your history", desc: "Create a free account to save every analysis, view charts, filter by sentiment, and export PDF reports." },
            ].map((item, i) => (
              <Reveal key={item.title} delay={i * 80}>
                <div className="glass-card rounded-2xl p-5 card-hover flex items-start gap-4 h-full">
                  <span className="text-2xl shrink-0 mt-0.5">{item.icon}</span>
                  <div>
                    <p className="font-bold text-gray-900 dark:text-white mb-1">{item.title}</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed">{item.desc}</p>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <Divider />

      {/* ── FAQ ─────────────────────────────────────────────────────────────── */}
      <section className="py-14 px-4">
        <div className="max-w-2xl mx-auto">
          <Reveal className="text-center mb-10">
            <SectionLabel>FAQ</SectionLabel>
            <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
              Frequently asked questions
            </h2>
          </Reveal>
          <div className="flex flex-col gap-3">
            {faqs.map((faq, i) => (
              <Reveal key={faq.q} delay={i * 50}>
                <FAQItem q={faq.q} a={faq.a} />
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <Divider />

      {/* ── CTA ─────────────────────────────────────────────────────────────── */}
      <section className="py-14 px-4">
        <div className="max-w-2xl mx-auto text-center">
          <Reveal>
            <div className="glass-card rounded-3xl p-10 card-hover">
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-semibold bg-orange-50 dark:bg-orange-500/10 text-orange-600 dark:text-orange-400 border border-orange-200 dark:border-orange-500/20 mb-6">
                <span className="w-1.5 h-1.5 rounded-full bg-orange-500 animate-pulse" />
                Free to use · No credit card
              </div>
              <h2 className="text-4xl font-extrabold tracking-tight mb-4">
                Ready to Analyze <span className="sentiment-word">Sentiment?</span>
              </h2>
              <p className="text-gray-500 dark:text-gray-400 mb-8 leading-relaxed">
                Start understanding what your customers, users, and audience really think — in seconds.
              </p>
              <div className="flex flex-wrap items-center justify-center gap-3">
                <button
                  onClick={() => { window.scrollTo({ top: 0, behavior: "smooth" }); }}
                  className="px-8 py-3 rounded-xl font-semibold bg-orange-500 hover:bg-orange-600 active:scale-95 text-white transition-all btn-glow"
                >
                  Get Started Free
                </button>
                <button
                  onClick={() => navigate("/login")}
                  className="px-8 py-3 rounded-xl font-semibold glass-card hover:bg-white/10 text-gray-700 dark:text-gray-300 transition-all"
                >
                  Log In
                </button>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ── FOOTER ──────────────────────────────────────────────────────────── */}
      <footer className="border-t border-gray-100 dark:border-white/5 bg-gray-50 dark:bg-white/[0.02]">
        <div className="max-w-4xl mx-auto px-4 py-8">
          <div className="grid sm:grid-cols-3 gap-6 mb-8">

            {/* Brand */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <span className="w-7 h-7 rounded-lg bg-orange-500 flex items-center justify-center text-white text-sm font-black logo-icon-glow">S</span>
                <span className="font-bold text-lg text-gray-900 dark:text-white">Sentiment<span className="text-orange-500">AI</span></span>
              </div>
              <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed">
                AI-powered sentiment analysis for text, files, and images. Built with React, Flask, and MongoDB.
              </p>
            </div>

            {/* Links */}
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-gray-400 dark:text-gray-500 mb-4">Quick Links</p>
              <div className="flex flex-col gap-2.5">
                {[
                  { label: "Analyze Text", action: () => window.scrollTo({ top: 0, behavior: "smooth" }) },
                  { label: "Login", action: () => navigate("/login") },
                  { label: "Sign Up", action: () => navigate("/signup") },
                  { label: "Analytics Dashboard", action: () => navigate("/analytics") },
                ].map(({ label, action }) => (
                  <button key={label} onClick={action}
                    className="text-sm text-gray-500 dark:text-gray-400 hover:text-orange-500 dark:hover:text-orange-400 transition-colors text-left">
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {/* Contact */}
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-gray-400 dark:text-gray-500 mb-4">Contact</p>
              <div className="flex flex-col gap-3">
                <div className="flex items-center gap-2.5">
                  <span className="text-base">👤</span>
                  <span className="text-sm text-gray-700 dark:text-gray-300 font-medium">Pranav Karpe</span>
                </div>
                <a href="mailto:karpepranav7@gmail.com"
                  className="flex items-center gap-2.5 text-sm text-gray-500 dark:text-gray-400 hover:text-orange-500 dark:hover:text-orange-400 transition-colors">
                  <span className="text-base">✉️</span>
                  karpepranav7@gmail.com
                </a>
                <a href="tel:9881265414"
                  className="flex items-center gap-2.5 text-sm text-gray-500 dark:text-gray-400 hover:text-orange-500 dark:hover:text-orange-400 transition-colors">
                  <span className="text-base">📞</span>
                  +91 98812 65414
                </a>
                <a href="https://www.linkedin.com/in/pranav-karpe-46b14528b/" target="_blank" rel="noreferrer"
                  className="flex items-center gap-2.5 text-sm text-gray-500 dark:text-gray-400 hover:text-orange-500 dark:hover:text-orange-400 transition-colors">
                  <svg className="w-4 h-4 shrink-0" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
                  </svg>
                  LinkedIn Profile
                </a>
              </div>
            </div>
          </div>

          {/* Bottom bar */}
          <div className="pt-6 border-t border-gray-100 dark:border-white/5 flex flex-col sm:flex-row items-center justify-between gap-3">
            <p className="text-xs text-gray-400 dark:text-gray-600">
              © {new Date().getFullYear()} SentimentAI · Built by Pranav Karpe
            </p>
            <div className="flex flex-wrap items-center justify-center gap-4">
              {[
                { label: "Privacy", path: "/privacy" },
                { label: "Terms",   path: "/terms" },
                { label: "About",   path: "/about" },
                { label: "Contact", path: "/contact" },
              ].map(({ label, path }) => (
                <button key={label} onClick={() => navigate(path)}
                  className="text-xs text-gray-400 dark:text-gray-600 hover:text-orange-500 dark:hover:text-orange-400 transition-colors">
                  {label}
                </button>
              ))}
              <span className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                <span className="text-xs text-gray-400 dark:text-gray-600">All systems operational</span>
              </span>
            </div>
          </div>
        </div>
      </footer>

    </div>
  );
}
