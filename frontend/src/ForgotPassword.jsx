import { useState } from "react";
import axios from "axios";

export default function ForgotPassword({ onNavigate }) {
  const [form, setForm] = useState({ email: "", new_password: "" });
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  const handle = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setLoading(true);
    try {
      const res = await axios.post("http://127.0.0.1:5000/forgot-password", form);
      setSuccess(res.data.message + " — you can now sign in.");
    } catch (err) {
      setError(err.response?.data?.error || "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white dark:bg-[#0a0a0a] flex items-center justify-center px-4">
      <div className="w-full max-w-md">

        {/* Logo */}
        <div className="flex items-center justify-center gap-2 mb-8">
          <span className="w-8 h-8 rounded-lg bg-orange-500 flex items-center justify-center text-white font-black">S</span>
          <span className="font-bold text-xl text-gray-900 dark:text-white">
            Sentiment<span className="text-orange-500">AI</span>
          </span>
        </div>

        {/* Card */}
        <div className="rounded-2xl glass-card overflow-hidden">

          {/* Header */}
          <div className="px-6 pt-6 pb-4 border-b border-gray-100 dark:border-white/5">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">Reset password</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Enter your email and a new password</p>
          </div>

          {/* Form */}
          <form onSubmit={submit} className="px-6 py-5 flex flex-col gap-4">

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Email</label>
              <input
                type="email"
                name="email"
                value={form.email}
                onChange={handle}
                placeholder="you@example.com"
                required
                className="w-full px-4 py-2.5 rounded-xl text-sm bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-600 outline-none focus:border-orange-500 transition-colors"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">New password</label>
              <input
                type="password"
                name="new_password"
                value={form.new_password}
                onChange={handle}
                placeholder="Min. 6 characters"
                required
                className="w-full px-4 py-2.5 rounded-xl text-sm bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-600 outline-none focus:border-orange-500 transition-colors"
              />
            </div>

            {error && (
              <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 text-red-600 dark:text-red-400 text-sm">
                <svg className="w-4 h-4 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm-.75-5.25a.75.75 0 001.5 0v-4a.75.75 0 00-1.5 0v4zm.75-7a1 1 0 100 2 1 1 0 000-2z" clipRule="evenodd" />
                </svg>
                {error}
              </div>
            )}

            {success && (
              <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-green-50 dark:bg-green-500/10 border border-green-200 dark:border-green-500/20 text-green-600 dark:text-green-400 text-sm">
                ✅ {success}
              </div>
            )}

            <button
              type="submit"
              disabled={loading || !!success}
              className="w-full py-2.5 rounded-xl text-sm font-semibold bg-orange-500 hover:bg-orange-600 active:scale-95 disabled:opacity-40 text-white transition-all shadow-md shadow-orange-500/20"
            >
              {loading ? "Resetting..." : "Reset password"}
            </button>
          </form>

          {/* Footer */}
          <div className="px-6 py-4 border-t border-gray-100 dark:border-white/5 bg-gray-50 dark:bg-white/[0.02] text-center">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Remembered it?{" "}
              <button onClick={() => onNavigate("login")} className="text-orange-500 hover:text-orange-600 font-semibold transition-colors">
                Sign in
              </button>
            </p>
          </div>
        </div>

        {/* Back */}
        <button onClick={() => onNavigate("dashboard")} className="mt-6 w-full text-sm text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors">
          ← Back to home
        </button>
      </div>
    </div>
  );
}
