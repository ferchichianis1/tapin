"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";

export default function AuthPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [devEmail, setDevEmail] = useState("");
  const [devPassword, setDevPassword] = useState("");
  const [devLoading, setDevLoading] = useState(false);
  const [devError, setDevError] = useState<string | null>(null);

  async function handleMagicLink(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
    });

    setLoading(false);
    if (error) setError(error.message);
    else setSent(true);
  }

  async function handleDevLogin(e: React.FormEvent) {
    e.preventDefault();
    setDevLoading(true);
    setDevError(null);

    const { error } = await supabase.auth.signInWithPassword({
      email: devEmail,
      password: devPassword,
    });

    if (error) {
      setDevError(error.message);
      setDevLoading(false);
    } else {
      window.location.href = "/me";
    }
  }

  return (
    <div className="min-h-screen bg-stone-50 flex flex-col items-center justify-center px-6">
      <div className="w-full max-w-sm mx-auto">

        {/* Brand */}
        <p className="text-xs font-medium tracking-[0.25em] text-[#B8860B] uppercase text-center mb-16">
          TapIn
        </p>

        {/* Main auth block */}
        {sent ? (
          <div>
            <h1 className="text-3xl font-bold text-stone-900 mb-3">
              Check your inbox.
            </h1>
            <p className="text-stone-400 text-sm leading-relaxed">
              We sent a sign-in link to{" "}
              <span className="text-stone-600 font-medium">{email}</span>.
              <br />
              Click it to continue.
            </p>
          </div>
        ) : (
          <div>
            <h1 className="text-3xl font-bold text-stone-900 mb-2">
              Welcome to TapIn.
            </h1>
            <p className="text-stone-400 text-sm mb-8">
              Enter your email to receive a sign-in link.
            </p>

            <form onSubmit={handleMagicLink} className="space-y-3">
              <input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your@email.com"
                className="w-full rounded-xl border border-stone-200 bg-white px-4 py-3.5 text-sm text-stone-900 placeholder:text-stone-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition"
              />
              {error && <p className="text-sm text-red-500">{error}</p>}
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white font-medium py-3.5 rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? "Sending…" : "Send sign-in link"}
              </button>
            </form>
          </div>
        )}

        {/* Dev login */}
        <div className="mt-14 pt-8 border-t border-stone-100">
          <p className="text-xs font-medium tracking-[0.15em] text-stone-300 uppercase mb-4">
            Dev access
          </p>
          <form onSubmit={handleDevLogin} className="space-y-2">
            <input
              type="email"
              required
              value={devEmail}
              onChange={(e) => setDevEmail(e.target.value)}
              placeholder="Email"
              className="w-full rounded-xl border border-stone-200 bg-white px-4 py-3 text-sm text-stone-900 placeholder:text-stone-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition"
            />
            <input
              type="password"
              required
              value={devPassword}
              onChange={(e) => setDevPassword(e.target.value)}
              placeholder="Password"
              className="w-full rounded-xl border border-stone-200 bg-white px-4 py-3 text-sm text-stone-900 placeholder:text-stone-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition"
            />
            {devError && <p className="text-sm text-red-500">{devError}</p>}
            <button
              type="submit"
              disabled={devLoading}
              className="w-full bg-stone-900 hover:bg-stone-800 text-white text-sm font-medium py-3 rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {devLoading ? "Signing in…" : "Sign in"}
            </button>
          </form>
        </div>

      </div>
    </div>
  );
}
