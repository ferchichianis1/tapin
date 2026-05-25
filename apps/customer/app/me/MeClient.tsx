"use client";

import Link from "next/link";
import { supabase } from "@/lib/supabase";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface MerchantCard {
  merchantId: string;
  name: string;
  slug: string;
  visitCount: number;
  pointsEarned: number;
  rewardThreshold: number;
  pointsPerVisit: number;
  rewardLabel: string;
}

// ─── Progress ring ────────────────────────────────────────────────────────────

const RING_R = 22;
const RING_C = 2 * Math.PI * RING_R;

function ProgressRing({
  visits,
  visitsNeeded,
}: {
  visits: number;
  visitsNeeded: number;
}) {
  const progress = visitsNeeded > 0 ? Math.min(visits / visitsNeeded, 1) : 0;
  const offset = RING_C * (1 - progress);
  const done = progress >= 1;

  return (
    <div className="relative shrink-0 w-14 h-14">
      <svg width="56" height="56" className="-rotate-90">
        <circle
          cx="28"
          cy="28"
          r={RING_R}
          fill="none"
          stroke="#e4e4e7"
          strokeWidth="4"
          className="dark:stroke-zinc-700"
        />
        <circle
          cx="28"
          cy="28"
          r={RING_R}
          fill="none"
          stroke={done ? "#10b981" : "#4f46e5"}
          strokeWidth="4"
          strokeLinecap="round"
          strokeDasharray={RING_C}
          strokeDashoffset={offset}
          style={{ transition: "stroke-dashoffset 0.7s ease" }}
        />
      </svg>
      <span className="absolute inset-0 flex items-center justify-center text-[11px] font-bold text-zinc-800 dark:text-zinc-100 leading-none">
        {visits}/{visitsNeeded}
      </span>
    </div>
  );
}

// ─── Merchant card ────────────────────────────────────────────────────────────

function MerchantCardItem({ card }: { card: MerchantCard }) {
  const visitsNeeded = Math.ceil(
    card.rewardThreshold / Math.max(card.pointsPerVisit, 1)
  );
  const rewardReady = card.visitCount >= visitsNeeded;

  return (
    <Link
      href={`/${card.slug}`}
      className="group flex items-center gap-4 bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 px-4 py-4 hover:border-indigo-300 dark:hover:border-indigo-700 transition-colors"
    >
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-zinc-900 dark:text-zinc-100 truncate">
          {card.name}
        </p>
        <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-0.5">
          {card.visitCount} visit{card.visitCount !== 1 ? "s" : ""}
        </p>
        {rewardReady ? (
          <span className="inline-flex items-center mt-1.5 px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
            {card.rewardLabel} ready!
          </span>
        ) : (
          <p className="text-xs text-zinc-400 dark:text-zinc-500 mt-1">
            {visitsNeeded - card.visitCount} more to: {card.rewardLabel}
          </p>
        )}
      </div>

      <ProgressRing visits={card.visitCount} visitsNeeded={visitsNeeded} />

      <svg
        className="w-4 h-4 shrink-0 text-zinc-300 dark:text-zinc-600 group-hover:text-indigo-400 transition-colors"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={2}
      >
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
      </svg>
    </Link>
  );
}

// ─── Page shell ───────────────────────────────────────────────────────────────

export default function MeClient({
  email,
  cards,
}: {
  email: string;
  cards: MerchantCard[];
}) {
  async function handleSignOut() {
    await supabase.auth.signOut();
    window.location.href = "/auth";
  }

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
      <header className="bg-white dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800 px-4 py-3 sticky top-0 z-10">
        <div className="max-w-lg mx-auto flex items-center justify-between">
          <span className="text-base font-bold text-zinc-900 dark:text-zinc-100">
            TapIn
          </span>
          <button
            onClick={handleSignOut}
            className="text-sm text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300 transition-colors"
          >
            Sign out
          </button>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">
            Welcome back
          </h1>
          {email && (
            <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
              {email}
            </p>
          )}
        </div>

        <h2 className="text-sm font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wide mb-3">
          Your stores
        </h2>

        {cards.length === 0 ? (
          <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 px-6 py-12 text-center">
            <p className="text-2xl mb-3">📲</p>
            <p className="font-medium text-zinc-700 dark:text-zinc-300">
              Tap your first store to get started
            </p>
            <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
              Hold your phone to a TapIn stand to earn your first visit.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {cards.map((card) => (
              <MerchantCardItem key={card.merchantId} card={card} />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
