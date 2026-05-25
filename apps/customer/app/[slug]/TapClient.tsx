"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface TapClientProps {
  slug: string;
  merchant: { id: string; name: string; logo_url: string | null };
  campaign: {
    id: string;
    reward_threshold: number;
    points_per_visit: number;
    reward_label: string;
  };
  initialPoints: number;
  streakCount: number;
  customerId: string | null;
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

// ─── Confetti ─────────────────────────────────────────────────────────────────

async function fireConfetti() {
  const { default: confetti } = await import("canvas-confetti");
  confetti({
    particleCount: 80,
    spread: 60,
    origin: { x: 0.5, y: 0.5 },
    colors: ["#4F46E5", "#B8860B", "#ffffff"],
    ticks: 120,
  });
}

// ─── Ring ─────────────────────────────────────────────────────────────────────

const RADIUS = 82;
const STROKE = 5;
const SIZE = 200;
const C = 2 * Math.PI * RADIUS;

function ProgressRing({
  progress,
  threshold,
  pointsPop,
  onPopEnd,
}: {
  progress: number;
  threshold: number;
  pointsPop: { count: number; key: number } | null;
  onPopEnd: () => void;
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
          {/* Track */}
          <circle
            cx={SIZE / 2}
            cy={SIZE / 2}
            r={RADIUS}
            fill="none"
            stroke="#e7e5e4"
            strokeWidth={STROKE}
          />
          {/* Fill */}
          <circle
            cx={SIZE / 2}
            cy={SIZE / 2}
            r={RADIUS}
            fill="none"
            stroke="#4f46e5"
            strokeWidth={STROKE}
            strokeLinecap="round"
            style={{
              strokeDasharray: C,
              strokeDashoffset: offset,
              transition: "stroke-dashoffset 0.8s ease-out",
            }}
          />
        </svg>

        {/* Count */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-5xl font-bold tracking-tight text-stone-900 leading-none">
            {clamped}
          </span>
          <span className="text-sm text-stone-400 mt-2">of {threshold}</span>
        </div>

        {/* Points pop — floats upward from the ring center */}
        {pointsPop && (
          <div
            key={pointsPop.key}
            className="absolute inset-0 flex items-center justify-center pointer-events-none"
            style={{ animation: "tapinFloatUp 1.5s ease-out forwards" }}
            onAnimationEnd={onPopEnd}
          >
            <span className="text-2xl font-bold text-indigo-600">
              +{pointsPop.count}
            </span>
          </div>
        )}
      </div>

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

// ─── Visit timeline ───────────────────────────────────────────────────────────

function relativeDate(iso: string): string {
  const diffDays = Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000);
  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return `${diffDays} days ago`;
  if (diffDays < 14) return "Last week";
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
  return "A while ago";
}

function VisitTimeline({ dates }: { dates: string[] }) {
  if (dates.length === 0) return null;
  return (
    <div className="w-full">
      <p className="text-[10px] font-semibold tracking-[0.15em] text-stone-400 uppercase mb-2">
        Your Visits
      </p>
      <div className="space-y-2">
        {dates.map((d, i) => (
          <div key={i} className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-stone-300 shrink-0" />
            <span className="text-xs text-stone-400">{relativeDate(d)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function TapClient({
  slug,
  merchant,
  campaign,
  initialPoints,
  streakCount,
  customerId,
}: TapClientProps) {
  const [currentPoints, setCurrentPoints] = useState(initialPoints);
  const [checking, setChecking] = useState(false);
  const [tapResult, setTapResult] = useState<TapResult>(null);
  const [resultVisible, setResultVisible] = useState(false);
  const [showReward, setShowReward] = useState(false);
  const [pointsPop, setPointsPop] = useState<{ count: number; key: number } | null>(null);
  const [recentVisits, setRecentVisits] = useState<string[]>([]);

  useEffect(() => {
    if (!customerId) return;
    supabase
      .from("visits")
      .select("created_at")
      .eq("customer_id", customerId)
      .eq("campaign_id", campaign.id)
      .eq("rejected", false)
      .order("created_at", { ascending: false })
      .limit(5)
      .then(({ data, error }) => {
        console.log("[VisitTimeline] customerId:", customerId, "data:", data, "error:", error);
        if (data) setRecentVisits(data.map((v: { created_at: string }) => v.created_at));
      });
  }, [customerId, campaign.id]);

  const progressInCycle = currentPoints % campaign.reward_threshold;
  const visitsRemaining = campaign.reward_threshold - progressInCycle;

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
        setPointsPop({ count: data.pointsEarned, key: Date.now() });
        setTapResult({ kind: "success", data });
        if (data.rewardUnlocked) setShowReward(true);
        fireConfetti();
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
      {/* Keyframe for the +N float-up animation */}
      <style>{`
        @keyframes tapinFloatUp {
          from { opacity: 1; transform: translateY(0); }
          to   { opacity: 0; transform: translateY(-40px); }
        }
      `}</style>

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

          {/* Streak nudge */}
          {streakCount >= 1 && (
            <p className="text-sm text-stone-500 text-center">
              🔥{" "}
              {streakCount === 1
                ? "1 visit this week — keep it up!"
                : `${streakCount} visits this week`}
            </p>
          )}

          {/* Ring */}
          <ProgressRing
            progress={progressInCycle}
            threshold={campaign.reward_threshold}
            pointsPop={pointsPop}
            onPopEnd={() => setPointsPop(null)}
          />

          {/* Nudge banner */}
          {visitsRemaining === 0 ? (
            <div className="w-full bg-indigo-50 border border-indigo-200 rounded-2xl px-4 py-3 text-sm text-indigo-700 font-medium text-center">
              🎉 Reward ready — show this to staff
            </div>
          ) : (
            <div className="w-full bg-amber-50 border border-amber-200 rounded-2xl px-4 py-3 text-sm text-amber-800 text-center">
              {visitsRemaining === 1
                ? `1 more visit for your ${campaign.reward_label}`
                : `${visitsRemaining} more visits for your ${campaign.reward_label}`}
            </div>
          )}

          {/* Visit timeline */}
          <VisitTimeline dates={recentVisits} />

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
                      Visit recorded ✓
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
