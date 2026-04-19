import { useState } from "react";
import axios from "axios";
import API from "./api";

export default function Signup({ onNavigate, onLoginSuccess }) {
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handle = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await axios.post(`${API}/signup`, form);
      const res = await axios.post(`${API}/login`, {
        email: form.email,
        password: form.password,
      });
      onLoginSuccess(res.data.name, res.data.email, res.data.token);
    } catch (err) {
      if (err.response) {
        // Backend replied with an error — show exact message
        setError(err.response.data?.error || "Signup failed");
      } else if (err.request) {
        // Request made but no response — Flask not running
        setError("Cannot reach server. Make sure Flask is running on port 5000.");
      } else {
        setError("Something went wrong. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white dark:bg-[#0a0a0a] flex items-center justify-center px-4">
      <div className="w-full max-w-md">

        <div className="flex items-center justify-center gap-2 mb-8">
          <span className="w-8 h-8 rounded-lg bg-orange-500 flex items-center justify-center text-white font-black">S</span>
          <span className="font-bold text-xl text-gray-900 dark:text-white">Sentiment<span className="text-orange-500">AI</span></span>
        </div>

        <div className="rounded-2xl glass-card overflow-hidden">

          <div className="px-6 pt-6 pb-4 border-b border-gray-100 dark:border-white/5">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">Create your account</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Start analyzing sentiment for free</p>
          </div>

          <form onSubmit={submit} className="px-6 py-5 flex flex-col gap-4">

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Full name</label>
              <input type="text" name="name" value={form.name} onChange={handle} placeholder="John Doe" required
                className="w-full px-4 py-2.5 rounded-xl text-sm bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-600 outline-none focus:border-orange-500 transition-colors" />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Email</label>
              <input type="email" name="email" value={form.email} onChange={handle} placeholder="you@example.com" required
                className="w-full px-4 py-2.5 rounded-xl text-sm bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-600 outline-none focus:border-orange-500 transition-colors" />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Password</label>
              <input type="password" name="password" value={form.password} onChange={handle} placeholder="Min. 6 characters" required
                className="w-full px-4 py-2.5 rounded-xl text-sm bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-600 outline-none focus:border-orange-500 transition-colors" />
            </div>

            {error && (
              <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 text-red-600 dark:text-red-400 text-sm">
                <svg className="w-4 h-4 shrink-0" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm-.75-5.25a.75.75 0 001.5 0v-4a.75.75 0 00-1.5 0v4zm.75-7a1 1 0 100 2 1 1 0 000-2z" clipRule="evenodd" /></svg>
                {error}
              </div>
            )}

            <button type="submit" disabled={loading}
              className="w-full py-2.5 rounded-xl text-sm font-semibold bg-orange-500 hover:bg-orange-600 active:scale-95 disabled:opacity-40 text-white transition-all shadow-md shadow-orange-500/20">
              {loading ? "Creating account..." : "Create account"}
            </button>
          </form>

          <div className="px-6 py-4 border-t border-gray-100 dark:border-white/5 bg-gray-50 dark:bg-white/[0.02] text-center">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Already have an account?{" "}
              <button type="button" onClick={() => onNavigate("login")} className="text-orange-500 hover:text-orange-600 font-semibold transition-colors">
                Sign in
              </button>
            </p>
          </div>
        </div>

        <button type="button" onClick={() => onNavigate("login")} className="mt-6 w-full text-sm text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors">
          ← Back to login
        </button>
      </div>
    </div>
  );
}
