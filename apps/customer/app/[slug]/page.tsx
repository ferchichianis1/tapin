"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Merchant {
  id: string;
  name: string;
  logo_url: string | null;
}

interface Campaign {
  reward_threshold: number;
  points_per_visit: number;
}

type LoadState =
  | { status: "loading" }
  | { status: "no-campaign" }
  | { status: "not-found" }
  | {
      status: "ready";
      merchant: Merchant;
      campaign: Campaign;
      currentPoints: number;
    };

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

// ─── Progress Ring ────────────────────────────────────────────────────────────

const RADIUS = 80;
const STROKE_WIDTH = 12;
const SIZE = 180;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

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
        {/* Track */}
        <circle
          cx={SIZE / 2}
          cy={SIZE / 2}
          r={RADIUS}
          fill="none"
          stroke="currentColor"
          strokeWidth={STROKE_WIDTH}
          className="text-zinc-200 dark:text-zinc-700"
        />
        {/* Progress arc */}
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

      {/* Label — rendered on top via negative margin */}
      <div
        className="flex flex-col items-center -mt-[calc(180px/2+1.5rem)] h-[180px] justify-center pointer-events-none select-none"
      >
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

// ─── Merchant Avatar ──────────────────────────────────────────────────────────

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

// ─── Reward Overlay ───────────────────────────────────────────────────────────

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

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function SlugPage({ params }: { params: { slug: string } }) {
  const { slug } = params;
  const router = useRouter();

  const [loadState, setLoadState] = useState<LoadState>({ status: "loading" });
  const [currentPoints, setCurrentPoints] = useState(0);
  const [checking, setChecking] = useState(false);
  const [tapResult, setTapResult] = useState<TapResult>(null);
  const [resultVisible, setResultVisible] = useState(false);
  const [showReward, setShowReward] = useState(false);

  // ── Initial data load ──────────────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false;

    async function load() {
      // 1. Auth check
      const { data: sessionData } = await supabase.auth.getSession();
      if (cancelled) return;

      if (!sessionData.session) {
        router.replace("/auth?next=/" + slug);
        return;
      }

      const session = sessionData.session;

      // 2. Merchant lookup
      const { data: merchant, error: merchantError } = await supabase
        .from("merchants")
        .select("id, name, logo_url")
        .eq("slug", slug)
        .single();

      if (cancelled) return;

      if (merchantError || !merchant) {
        setLoadState({ status: "not-found" });
        return;
      }

      // 3. Customer points balance
      const { data: customerRow } = await supabase
        .from("customers")
        .select("points_balance")
        .eq("user_id", session.user.id)
        .single();

      if (cancelled) return;

      const balance: number =
        customerRow && typeof customerRow.points_balance === "number"
          ? customerRow.points_balance
          : 0;

      // 4. Active campaign
      const { data: campaignRow } = await supabase
        .from("campaigns")
        .select("reward_threshold, points_per_visit")
        .eq("merchant_id", merchant.id)
        .eq("is_active", true)
        .limit(1)
        .single();

      if (cancelled) return;

      if (!campaignRow) {
        setLoadState({ status: "no-campaign" });
        return;
      }

      setCurrentPoints(balance);
      setLoadState({
        status: "ready",
        merchant: merchant as Merchant,
        campaign: {
          reward_threshold: campaignRow.reward_threshold as number,
          points_per_visit: campaignRow.points_per_visit as number,
        },
        currentPoints: balance,
      });
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [slug, router]);

  // ── Check-in handler ───────────────────────────────────────────────────────
  async function handleCheckIn() {
    if (checking) return;
    setChecking(true);
    setResultVisible(false);
    setTapResult(null);

    try {
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session) {
        router.replace("/auth?next=/" + slug);
        return;
      }

      const token = sessionData.session.access_token;

      const res = await fetch("/api/tap", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ merchantSlug: slug }),
      });

      if (res.ok) {
        const data = (await res.json()) as TapSuccessResponse;
        setCurrentPoints(data.newBalance);
        setTapResult({ kind: "success", data });
        if (data.rewardUnlocked) {
          setShowReward(true);
        }
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
      setTapResult({
        kind: "error",
        message: "Network error. Please try again.",
      });
    } finally {
      setChecking(false);
      // Slight delay so transition plays from opacity-0
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          setResultVisible(true);
        });
      });
    }
  }

  // ── Reward dismiss ─────────────────────────────────────────────────────────
  function dismissReward() {
    setShowReward(false);
    setTapResult(null);
    setResultVisible(false);
  }

  // ── Render states ──────────────────────────────────────────────────────────

  if (loadState.status === "loading") {
    return (
      <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 flex items-center justify-center">
        <div className="w-12 h-12 rounded-full border-4 border-zinc-200 dark:border-zinc-700 border-t-indigo-600 animate-spin" />
      </div>
    );
  }

  if (loadState.status === "not-found") {
    return (
      <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 flex items-center justify-center px-4">
        <div className="text-center">
          <h1 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100 mb-2">
            Shop not found
          </h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            This link doesn&apos;t match any store in our system.
          </p>
        </div>
      </div>
    );
  }

  if (loadState.status === "no-campaign") {
    return (
      <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 flex items-center justify-center px-4">
        <div className="text-center">
          <h1 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100 mb-2">
            No active campaign
          </h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            This store doesn&apos;t have an active loyalty campaign right now.
          </p>
        </div>
      </div>
    );
  }

  // status === "ready"
  const { merchant, campaign } = loadState;
  const progressInCycle = currentPoints % campaign.reward_threshold;

  return (
    <>
      {/* Reward overlay */}
      {showReward && (
        <RewardOverlay
          merchantName={merchant.name}
          onDismiss={dismissReward}
        />
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

          {/* Tap result area — min-height prevents layout jump */}
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
