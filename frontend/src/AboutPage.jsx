import TrustPage from "./TrustPage";

export default function AboutPage() {
  return (
    <TrustPage title="About SentimentAI">
      <section>
        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-3">What is SentimentAI?</h2>
        <p>SentimentAI is a full-stack AI-powered sentiment analysis platform that lets you instantly understand the emotional tone behind any text — whether it's positive, negative, or neutral. It was built as a complete SaaS-style application with authentication, analytics, file upload, and PDF export.</p>
      </section>

      <section>
        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-3">The Creator</h2>
        <div className="glass-card rounded-2xl p-5 flex items-start gap-4">
          <span className="w-12 h-12 rounded-xl bg-orange-500 flex items-center justify-center text-white font-black text-xl shrink-0">P</span>
          <div>
            <p className="font-bold text-gray-900 dark:text-white text-base">Pranav Karpe</p>
            <p className="text-sm mt-1">Full-stack developer with a focus on ML-integrated web applications. Built SentimentAI as a complete production-grade project combining React, Flask, MongoDB, and machine learning.</p>
            <div className="flex flex-wrap gap-3 mt-3">
              <a href="mailto:karpepranav7@gmail.com" className="text-xs text-orange-500 hover:underline">karpepranav7@gmail.com</a>
              <a href="https://www.linkedin.com/in/pranav-karpe-46b14528b/" target="_blank" rel="noreferrer" className="text-xs text-orange-500 hover:underline">LinkedIn →</a>
            </div>
          </div>
        </div>
      </section>

      <section>
        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-3">Tech Stack</h2>
        <div className="grid sm:grid-cols-2 gap-3">
          {[
            { label: "Frontend", value: "React 19 + Vite + Tailwind CSS v4" },
            { label: "Backend", value: "Flask (Python) + Flask-CORS" },
            { label: "Database", value: "MongoDB Atlas (cloud)" },
            { label: "ML Model", value: "Logistic Regression + TF-IDF" },
            { label: "Auth", value: "JWT tokens + Werkzeug password hashing" },
            { label: "File Processing", value: "PyMuPDF (PDF) + Tesseract OCR (images)" },
            { label: "PDF Export", value: "ReportLab" },
            { label: "Charts", value: "Recharts (React)" },
          ].map(({ label, value }) => (
            <div key={label} className="glass-card rounded-xl px-4 py-3">
              <p className="text-xs font-semibold uppercase tracking-widest text-orange-500 mb-1">{label}</p>
              <p className="text-sm text-gray-900 dark:text-white">{value}</p>
            </div>
          ))}
        </div>
      </section>

      <section>
        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-3">Features</h2>
        <ul className="list-disc pl-6 space-y-2">
          <li>Sentiment analysis with confidence score (Positive / Negative / Neutral)</li>
          <li>File upload: .txt, .pdf, and image files with OCR</li>
          <li>User authentication with JWT and 48-hour session management</li>
          <li>Analysis history with search, filter, and delete</li>
          <li>Analytics dashboard with pie chart and stats cards</li>
          <li>PDF report export with session summary</li>
          <li>Dark / light mode with glassy UI and animations</li>
          <li>Fully responsive — works on mobile, tablet, and desktop</li>
        </ul>
      </section>
    </TrustPage>
  );
}
