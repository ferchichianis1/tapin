"use client";

import { useState } from "react";
import { createClient } from "@supabase/supabase-js";

export default function AuthPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [devEmail, setDevEmail] = useState("");
  const [devPassword, setDevPassword] = useState("");
  const [devLoading, setDevLoading] = useState(false);
  const [devError, setDevError] = useState<string | null>(null);

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  async function handleMagicLink(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });

    setLoading(false);

    if (error) {
      setError(error.message);
    } else {
      setSent(true);
    }
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
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 flex items-center justify-center px-4">
      <div className="w-full max-w-sm mx-auto space-y-4">

        {/* Magic link */}
        <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-sm border border-zinc-200 dark:border-zinc-800 p-8">
          {sent ? (
            <div className="text-center">
              <h1 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100 mb-2">
                Check your email
              </h1>
              <p className="text-sm text-zinc-500 dark:text-zinc-400">
                We sent a magic link to{" "}
                <span className="font-medium text-zinc-700 dark:text-zinc-300">{email}</span>.
              </p>
            </div>
          ) : (
            <>
              <h1 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100 mb-6">
                Sign in to TapIn
              </h1>
              <form onSubmit={handleMagicLink} className="space-y-4">
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">
                    Email address
                  </label>
                  <input
                    id="email"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    className="w-full rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400"
                  />
                </div>
                {error && <p className="text-sm text-red-600">{error}</p>}
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-3 rounded-lg transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {loading ? "Sending…" : "Send magic link"}
                </button>
              </form>
            </>
          )}
        </div>

        {/* Dev login */}
        <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-sm border border-zinc-200 dark:border-zinc-800 p-8">
          <h2 className="text-sm font-semibold text-zinc-500 dark:text-zinc-400 mb-4 uppercase tracking-wide">
            Dev login (password)
          </h2>
          <form onSubmit={handleDevLogin} className="space-y-3">
            <input
              type="email"
              required
              value={devEmail}
              onChange={(e) => setDevEmail(e.target.value)}
              placeholder="customer@tapin.app"
              className="w-full rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400"
            />
            <input
              type="password"
              required
              value={devPassword}
              onChange={(e) => setDevPassword(e.target.value)}
              placeholder="Password"
              className="w-full rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400"
            />
            {devError && <p className="text-sm text-red-600">{devError}</p>}
            <button
              type="submit"
              disabled={devLoading}
              className="w-full bg-zinc-800 hover:bg-zinc-700 text-white font-medium py-3 rounded-lg transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {devLoading ? "Signing in…" : "Sign in"}
            </button>
          </form>
        </div>

      </div>
    </div>
  );
}
