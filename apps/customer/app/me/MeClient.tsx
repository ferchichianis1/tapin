"use client";

import { useEffect, useState } from "react";
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

// ─── Store card ───────────────────────────────────────────────────────────────

function StoreCard({ card }: { card: MerchantCard }) {
  const visitsNeeded = Math.ceil(card.rewardThreshold / Math.max(card.pointsPerVisit, 1));
  const pct = Math.min((card.visitCount / visitsNeeded) * 100, 100);
  const rewardReady = card.visitCount >= visitsNeeded;

  return (
    <Link
      href={`/${card.slug}`}
      className="block bg-white rounded-2xl border border-stone-100 p-5 hover:border-stone-200 transition-colors"
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

  async function handleSignOut() {
    await supabase.auth.signOut();
    window.location.href = "/auth";
  }

  return (
    <div className="min-h-screen bg-stone-50">

      {/* Header */}
      <header className="px-6 pt-14 pb-8">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium tracking-[0.2em] text-stone-300 uppercase">
            TapIn
          </span>
          <button
            onClick={handleSignOut}
            className="text-xs text-stone-400 hover:text-stone-600 transition-colors"
          >
            Sign out
          </button>
        </div>

        <div className="mt-10">
          <h1 className="text-3xl font-bold text-stone-900">{greeting}</h1>
          {email && (
            <p className="text-sm text-stone-400 mt-1">{email}</p>
          )}
        </div>
      </header>

      {/* Store list */}
      <main className="px-6 pb-16">
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
      </main>

    </div>
  );
}
