"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface TapClientProps {
  slug: string;
  merchant: { id: string; name: string; logo_url: string | null };
  campaign: { reward_threshold: number; points_per_visit: number };
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

// ─── Constants ────────────────────────────────────────────────────────────────

const RADIUS = 80;
const STROKE_WIDTH = 12;
const SIZE = 180;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

// ─── Sub-components ───────────────────────────────────────────────────────────

function ProgressRing({
  progress,
  threshold,
}: {
  progress: number;
  threshold: number;
}) {
  const clamped = Math.min(progress, threshold);
  const fraction = threshold > 0 ? clamped / threshold : 0;
  const offset = CIRCUMFERENCE * (1 - fraction);

  return (
    <div className="flex flex-col items-center gap-2">
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
          stroke="currentColor"
          strokeWidth={STROKE_WIDTH}
          className="text-zinc-200 dark:text-zinc-700"
        />
        <circle
          cx={SIZE / 2}
          cy={SIZE / 2}
          r={RADIUS}
          fill="none"
          stroke="currentColor"
          strokeWidth={STROKE_WIDTH}
          strokeLinecap="round"
          className="text-indigo-600 transition-all duration-700 ease-in-out"
          style={{
            strokeDasharray: CIRCUMFERENCE,
            strokeDashoffset: offset,
          }}
        />
      </svg>

      <div className="flex flex-col items-center -mt-[calc(180px/2+1.5rem)] h-[180px] justify-center pointer-events-none select-none">
        <span className="text-3xl font-bold text-zinc-900 dark:text-zinc-100">
          {clamped} / {threshold}
        </span>
        <span className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
          visits to reward
        </span>
      </div>
    </div>
  );
}

function MerchantAvatar({ name }: { name: string }) {
  const initial = name.trim().charAt(0).toUpperCase();
  return (
    <div className="w-16 h-16 rounded-2xl bg-indigo-100 dark:bg-indigo-900 flex items-center justify-center">
      <span className="text-2xl font-bold text-indigo-600 dark:text-indigo-300">
        {initial}
      </span>
    </div>
  );
}

function RewardOverlay({
  merchantName,
  onDismiss,
}: {
  merchantName: string;
  onDismiss: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 bg-indigo-600 flex flex-col items-center justify-center gap-6 px-6 text-center">
      <span className="text-7xl" role="img" aria-label="Party popper">
        🎉
      </span>
      <h2 className="text-3xl font-bold text-white">Reward unlocked!</h2>
      <p className="text-indigo-100 text-lg font-medium">{merchantName}</p>
      <p className="text-indigo-200 text-sm max-w-xs">
        Show this screen to claim your reward
      </p>
      <button
        onClick={onDismiss}
        className="mt-4 bg-white text-indigo-600 font-semibold px-8 py-3 rounded-xl hover:bg-indigo-50 transition-colors"
      >
        Done
      </button>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

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
          // ignore JSON parse failure
        }
        setTapResult({ kind: "error", message });
      }
    } catch {
      setTapResult({ kind: "error", message: "Network error. Please try again." });
    } finally {
      setChecking(false);
      requestAnimationFrame(() => {
        requestAnimationFrame(() => setResultVisible(true));
      });
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

      <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 flex flex-col items-center justify-center px-4 py-12">
        <div className="w-full max-w-sm mx-auto flex flex-col items-center gap-8">

          {/* Merchant header */}
          <div className="flex flex-col items-center gap-3">
            <MerchantAvatar name={merchant.name} />
            <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100 text-center">
              {merchant.name}
            </h1>
          </div>

          {/* Progress ring */}
          <ProgressRing
            progress={progressInCycle}
            threshold={campaign.reward_threshold}
          />

          {/* Check-in button */}
          <button
            onClick={handleCheckIn}
            disabled={checking}
            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-4 rounded-xl text-lg transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {checking ? "Checking in…" : "Check in"}
          </button>

          {/* Tap result — min-height prevents layout jump */}
          <div className="w-full min-h-[3rem] flex flex-col items-center justify-center gap-1 text-center">
            {tapResult !== null && (
              <div
                className={`transition-opacity duration-300 ${
                  resultVisible ? "opacity-100" : "opacity-0"
                }`}
              >
                {tapResult.kind === "success" && (
                  <>
                    <p className="text-emerald-600 font-semibold text-base">
                      +{tapResult.data.pointsEarned} point
                      {tapResult.data.pointsEarned !== 1 ? "s" : ""}
                    </p>
                    <p className="text-zinc-500 dark:text-zinc-400 text-sm mt-0.5">
                      {tapResult.data.progressMessage}
                    </p>
                  </>
                )}
                {tapResult.kind === "rate-limited" && (
                  <p className="text-amber-600 font-medium text-sm">
                    Already checked in — come back later
                  </p>
                )}
                {tapResult.kind === "error" && (
                  <p className="text-red-600 font-medium text-sm">
                    {tapResult.message}
                  </p>
                )}
              </div>
            )}
          </div>

        </div>
      </div>
    </>
  );
}
