"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

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

// ─── Store card ───────────────────────────────────────────────────────────────

function StoreCard({ card }: { card: MerchantCard }) {
  const visitsNeeded = Math.ceil(card.rewardThreshold / Math.max(card.pointsPerVisit, 1));
  const pct = Math.min((card.visitCount / visitsNeeded) * 100, 100);
  const rewardReady = card.visitCount >= visitsNeeded;

  return (
    <Link
      href={`/${card.slug}`}
      className="block bg-white rounded-2xl border border-stone-100 p-5 cursor-pointer transition-all duration-150 ease-out hover:scale-[1.01] hover:shadow-sm active:scale-[0.98] active:shadow-none"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-semibold text-stone-900 truncate">{card.name}</p>
          <p className="text-sm text-stone-400 mt-0.5">
            {card.visitCount} visit{card.visitCount !== 1 ? "s" : ""}
          </p>
        </div>
        {rewardReady && (
          <span className="shrink-0 text-xs font-medium text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full">
            Ready
          </span>
        )}
      </div>

      <div className="mt-4 h-1 bg-stone-100 rounded-full overflow-hidden">
        <div
          className="h-full bg-indigo-600 rounded-full transition-all duration-500"
          style={{ width: `${pct}%` }}
        />
      </div>

      <p className="text-xs text-stone-400 mt-2">
        {rewardReady
          ? `Claim your ${card.rewardLabel}`
          : `${visitsNeeded - card.visitCount} more to your ${card.rewardLabel}`}
      </p>
    </Link>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function MeClient({
  email,
  cards,
}: {
  email: string;
  cards: MerchantCard[];
}) {
  const [greeting, setGreeting] = useState("Welcome back");

  useEffect(() => {
    const h = new Date().getHours();
    setGreeting(h < 12 ? "Good morning" : h < 18 ? "Good afternoon" : "Good evening");
  }, []);

  return (
    <div className="min-h-screen bg-stone-50">

      {/* Header */}
      <header className="px-6 pt-14 pb-8">
        <div>
          <span className="text-xs font-medium tracking-[0.2em] text-[#B8860B] uppercase">
            TapIn
          </span>
        </div>

        <div className="mt-10">
          <h1 className="text-3xl font-bold text-stone-900">{greeting}</h1>
          {email && (
            <p className="text-sm text-stone-400 mt-1">{email}</p>
          )}
        </div>
      </header>

      {/* Store list */}
      <main className="px-6 pb-6">
        <p className="text-xs font-semibold tracking-[0.15em] text-stone-400 uppercase mb-5">
          Your Stores
        </p>

        {cards.length === 0 ? (
          <div className="bg-white rounded-2xl border border-stone-100 px-6 py-14 text-center">
            <p className="text-3xl mb-4">📲</p>
            <p className="font-semibold text-stone-700">
              Tap your first store to get started
            </p>
            <p className="text-sm text-stone-400 mt-2 leading-relaxed">
              Hold your phone to a TapIn stand<br />to earn your first visit.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {cards.map((card) => (
              <StoreCard key={card.merchantId} card={card} />
            ))}
          </div>
        )}

        <div className="flex items-center justify-center gap-2 mt-6">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#d4d3cc" strokeWidth="1.5" strokeLinecap="round">
            <path d="M6.5 6.5a7 7 0 0 0 0 11M17.5 6.5a7 7 0 0 1 0 11M3 12h.01M21 12h.01M12 3v.01M12 21v.01"/>
          </svg>
          <span className="text-xs text-stone-300">Tap a TapIn stand to add a new store</span>
        </div>
      </main>

    </div>
  );
}
