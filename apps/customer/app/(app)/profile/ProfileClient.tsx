"use client";

import { supabase } from "@/lib/supabase";

export interface ProfileStats {
  totalVisits: number;
  merchantCount: number;
  rewardsEarned: number;
}

export default function ProfileClient({
  email,
  stats,
}: {
  email: string;
  stats: ProfileStats;
}) {
  const initial = email.trim().charAt(0).toUpperCase();

  async function handleSignOut() {
    await supabase.auth.signOut();
    window.location.href = "/auth";
  }

  return (
    <div className="min-h-screen bg-stone-50">

      {/* Header */}
      <header className="px-6 pt-14 pb-8">
        <span className="text-xs font-medium tracking-[0.2em] text-[#B8860B] uppercase">
          TapIn
        </span>
      </header>

      <main className="px-6 flex flex-col items-center gap-8">

        {/* Avatar */}
        <div className="flex flex-col items-center gap-2">
          <div className="w-20 h-20 rounded-full bg-stone-100 flex items-center justify-center">
            <span className="text-3xl font-semibold text-stone-900">{initial}</span>
          </div>
          <p className="text-sm text-stone-400">{email}</p>
        </div>

        {/* Stats */}
        <div className="w-full grid grid-cols-3 gap-3">
          {[
            { label: "Stores", value: stats.merchantCount },
            { label: "Visits", value: stats.totalVisits },
            { label: "Rewards", value: stats.rewardsEarned },
          ].map(({ label, value }) => (
            <div
              key={label}
              className="bg-white rounded-2xl border border-stone-100 py-4 flex flex-col items-center gap-1"
            >
              <span className="text-2xl font-bold text-stone-900">{value}</span>
              <span className="text-xs text-stone-400">{label}</span>
            </div>
          ))}
        </div>

        {/* Settings */}
        <div className="w-full bg-white rounded-2xl border border-stone-100 divide-y divide-stone-50 overflow-hidden">
          <div className="px-5 py-4 flex items-center justify-between">
            <span className="text-sm text-stone-300">Notifications</span>
            <span className="text-[11px] text-stone-200">Coming soon</span>
          </div>
          <button
            onClick={handleSignOut}
            className="w-full px-5 py-4 text-left text-sm text-red-400 hover:text-red-500 transition-colors"
          >
            Sign out
          </button>
        </div>

      </main>

    </div>
  );
}
