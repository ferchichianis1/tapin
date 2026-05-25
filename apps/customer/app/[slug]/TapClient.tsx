"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface TapClientProps {
  slug: string;
  merchant: { id: string; name: string; logo_url: string | null };
  campaign: {
    reward_threshold: number;
    points_per_visit: number;
    reward_label: string;
  };
  initialPoints: number;
}

interface TapSuccessResponse {
  pointsEarned: number;
  newBalance: number;
  rewardUnlocked: boolean;
  progressMessage: string;
}

type TapResult =
  | { kind: "success"; data: TapSuccessResponse }
  | { kind: "rate-limited" }
  | { kind: "error"; message: string }
  | null;

// ─── Ring ─────────────────────────────────────────────────────────────────────

const RADIUS = 82;
const STROKE = 5;
const SIZE = 200;
const C = 2 * Math.PI * RADIUS;

function ProgressRing({
  progress,
  threshold,
  rewardLabel,
}: {
  progress: number;
  threshold: number;
  rewardLabel: string;
}) {
  const clamped = Math.min(progress, threshold);
  const offset = C * (1 - (threshold > 0 ? clamped / threshold : 0));

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="relative" style={{ width: SIZE, height: SIZE }}>
        <svg
          width={SIZE}
          height={SIZE}
          viewBox={`0 0 ${SIZE} ${SIZE}`}
          className="-rotate-90"
          aria-hidden="true"
        >
          <circle
            cx={SIZE / 2}
            cy={SIZE / 2}
            r={RADIUS}
            fill="none"
            stroke="#e7e5e4"
            strokeWidth={STROKE}
          />
          <circle
            cx={SIZE / 2}
            cy={SIZE / 2}
            r={RADIUS}
            fill="none"
            stroke="#4f46e5"
            strokeWidth={STROKE}
            strokeLinecap="round"
            strokeDasharray={C}
            strokeDashoffset={offset}
            className="transition-all duration-700 ease-in-out"
          />
        </svg>

        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-5xl font-bold tracking-tight text-stone-900 leading-none">
            {clamped}
          </span>
          <span className="text-sm text-stone-400 mt-2">of {threshold}</span>
        </div>
      </div>

      <p className="text-sm text-stone-400 text-center">
        visits to your free{" "}
        <span className="text-stone-600 font-medium">{rewardLabel}</span>
      </p>
    </div>
  );
}

// ─── Avatar ───────────────────────────────────────────────────────────────────

function MerchantAvatar({ name }: { name: string }) {
  return (
    <div className="w-20 h-20 rounded-2xl bg-stone-100 flex items-center justify-center">
      <span className="text-3xl font-semibold text-stone-900">
        {name.trim().charAt(0).toUpperCase()}
      </span>
    </div>
  );
}

// ─── Reward overlay ───────────────────────────────────────────────────────────

function RewardOverlay({
  merchantName,
  onDismiss,
}: {
  merchantName: string;
  onDismiss: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 bg-indigo-600 flex flex-col items-center justify-center gap-6 px-8 text-center">
      <span className="text-8xl" role="img" aria-label="Party popper">
        🎉
      </span>
      <div>
        <h2 className="text-3xl font-bold text-white">Reward unlocked!</h2>
        <p className="text-indigo-200 mt-2">{merchantName}</p>
      </div>
      <p className="text-indigo-300 text-sm max-w-xs">
        Show this screen to the cashier to claim your reward.
      </p>
      <button
        onClick={onDismiss}
        className="mt-2 bg-white text-indigo-600 font-semibold px-10 py-3.5 rounded-2xl hover:bg-indigo-50 transition-colors"
      >
        Done
      </button>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function TapClient({
  slug,
  merchant,
  campaign,
  initialPoints,
}: TapClientProps) {
  const [currentPoints, setCurrentPoints] = useState(initialPoints);
  const [checking, setChecking] = useState(false);
  const [tapResult, setTapResult] = useState<TapResult>(null);
  const [resultVisible, setResultVisible] = useState(false);
  const [showReward, setShowReward] = useState(false);

  const progressInCycle = currentPoints % campaign.reward_threshold;

  async function handleCheckIn() {
    if (checking) return;
    setChecking(true);
    setResultVisible(false);
    setTapResult(null);

    try {
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session) {
        window.location.href = `/auth?next=/${slug}`;
        return;
      }

      const res = await fetch("/api/tap", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${sessionData.session.access_token}`,
        },
        body: JSON.stringify({ merchantSlug: slug }),
      });

      if (res.ok) {
        const data = (await res.json()) as TapSuccessResponse;
        setCurrentPoints(data.newBalance);
        setTapResult({ kind: "success", data });
        if (data.rewardUnlocked) setShowReward(true);
      } else if (res.status === 429) {
        setTapResult({ kind: "rate-limited" });
      } else {
        let message = "Something went wrong. Please try again.";
        try {
          const errBody = (await res.json()) as { error?: string };
          if (errBody.error) message = errBody.error;
        } catch {
          // ignore
        }
        setTapResult({ kind: "error", message });
      }
    } catch {
      setTapResult({ kind: "error", message: "Network error. Please try again." });
    } finally {
      setChecking(false);
      requestAnimationFrame(() => requestAnimationFrame(() => setResultVisible(true)));
    }
  }

  function dismissReward() {
    setShowReward(false);
    setTapResult(null);
    setResultVisible(false);
  }

  return (
    <>
      {showReward && (
        <RewardOverlay merchantName={merchant.name} onDismiss={dismissReward} />
      )}

      <div className="min-h-screen bg-stone-50 flex flex-col items-center justify-center px-6 py-12">
        <div className="w-full max-w-sm mx-auto flex flex-col items-center gap-10">

          {/* Merchant */}
          <div className="flex flex-col items-center gap-4">
            <MerchantAvatar name={merchant.name} />
            <h1 className="text-3xl font-semibold text-stone-900 text-center">
              {merchant.name}
            </h1>
          </div>

          {/* Ring */}
          <ProgressRing
            progress={progressInCycle}
            threshold={campaign.reward_threshold}
            rewardLabel={campaign.reward_label}
          />

          {/* Action */}
          <div className="w-full space-y-3">
            <button
              onClick={handleCheckIn}
              disabled={checking}
              className="w-full bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white font-medium py-5 rounded-2xl text-base transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {checking ? "Checking in…" : "Check in"}
            </button>

            <div className="min-h-[1.75rem] flex items-center justify-center">
              {tapResult !== null && (
                <div
                  className={`text-center transition-opacity duration-300 ${
                    resultVisible ? "opacity-100" : "opacity-0"
                  }`}
                >
                  {tapResult.kind === "success" && (
                    <p className="text-sm font-medium text-emerald-600">
                      Visit logged — {tapResult.data.progressMessage}
                    </p>
                  )}
                  {tapResult.kind === "rate-limited" && (
                    <p className="text-sm text-stone-400">
                      Already checked in — come back later
                    </p>
                  )}
                  {tapResult.kind === "error" && (
                    <p className="text-sm text-red-500">{tapResult.message}</p>
                  )}
                </div>
              )}
            </div>
          </div>

        </div>
      </div>
    </>
  );
}
