"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Merchant {
  id: string;
  name: string;
}

interface Campaign {
  id: string;
  name: string;
  points_per_visit: number;
  reward_threshold: number;
  reward_label: string;
  is_active: boolean;
  starts_at: string;
  ends_at: string | null;
}

interface CampaignStats {
  enrolled: number;
  avgProgressPct: number;
}

// ---------------------------------------------------------------------------
// Inline sub-components
// ---------------------------------------------------------------------------

function ActiveBadge({ isActive }: { isActive: boolean }) {
  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
        isActive
          ? "bg-emerald-100 text-emerald-700"
          : "bg-zinc-100 text-zinc-600"
      }`}
    >
      {isActive ? "Active" : "Inactive"}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------

export default function CampaignsPage() {
  const router = useRouter();
  const [merchant, setMerchant] = useState<Merchant | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [statsMap, setStatsMap] = useState<Map<string, CampaignStats>>(
    new Map()
  );
  const [loading, setLoading] = useState(true);

  // Create form
  const [showForm, setShowForm] = useState(false);
  const [formName, setFormName] = useState("");
  const [visitsRequired, setVisitsRequired] = useState(9);
  const [rewardDescription, setRewardDescription] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [formSaving, setFormSaving] = useState(false);

  useEffect(() => {
    async function init() {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) {
        router.replace("/login");
        return;
      }

      const { data: merchantData } = await supabase
        .from("merchants")
        .select("id, name")
        .eq("user_id", session.user.id)
        .single();

      if (!merchantData) {
        setError("No merchant account found");
        return;
      }

      setMerchant(merchantData);
      await loadCampaigns(merchantData.id);
    }
    init();
  }, [router]);

  async function loadCampaigns(merchantId: string) {
    setLoading(true);

    const { data: campaignData } = await supabase
      .from("campaigns")
      .select(
        "id, name, points_per_visit, reward_threshold, reward_label, is_active, starts_at, ends_at"
      )
      .eq("merchant_id", merchantId)
      .order("created_at", { ascending: false });

    const campaignList = (campaignData ?? []) as Campaign[];
    setCampaigns(campaignList);

    if (campaignList.length > 0) {
      const campaignIds = campaignList.map((c) => c.id);

      const { data: allCampaignVisits } = await supabase
        .from("visits")
        .select("customer_id, nfc_codes!inner(campaign_id)")
        .in("nfc_codes.campaign_id", campaignIds)
        .eq("rejected", false);

      // Group by campaign_id → customer_id → visit count
      const byCampaign = new Map<string, Map<string, number>>();
      for (const v of allCampaignVisits ?? []) {
        const nfcInfo = (v.nfc_codes as unknown) as { campaign_id: string } | null;
        if (!nfcInfo) continue;
        const campaignId = nfcInfo.campaign_id;
        const customerId = v.customer_id as string;
        if (!byCampaign.has(campaignId)) {
          byCampaign.set(campaignId, new Map());
        }
        const customerMap = byCampaign.get(campaignId)!;
        customerMap.set(customerId, (customerMap.get(customerId) ?? 0) + 1);
      }

      const newStatsMap = new Map<string, CampaignStats>();
      for (const campaign of campaignList) {
        const customerMap = byCampaign.get(campaign.id) ?? new Map<string, number>();
        const enrolled = customerMap.size;
        let avgProgressPct = 0;
        if (enrolled > 0) {
          const totalProgress = Array.from(customerMap.values()).reduce(
            (sum, visitCount) =>
              sum + Math.min(visitCount / campaign.reward_threshold, 1),
            0
          );
          avgProgressPct = Math.round((totalProgress / enrolled) * 100);
        }
        newStatsMap.set(campaign.id, { enrolled, avgProgressPct });
      }

      setStatsMap(newStatsMap);
    }

    setLoading(false);
  }

  async function handleCreateCampaign(e: React.FormEvent) {
    e.preventDefault();
    if (!merchant) return;
    setFormSaving(true);
    setFormError(null);

    const { error: insertError } = await supabase.from("campaigns").insert({
      merchant_id: merchant.id,
      name: formName,
      points_per_visit: 1,
      reward_threshold: visitsRequired,
      reward_label: rewardDescription,
      is_active: true,
    });

    if (insertError) {
      setFormError(insertError.message);
      setFormSaving(false);
      return;
    }

    // Reset form
    setFormName("");
    setVisitsRequired(9);
    setRewardDescription("");
    setShowForm(false);
    setFormSaving(false);

    await loadCampaigns(merchant.id);
  }

  async function handleSignOut() {
    await supabase.auth.signOut();
    router.replace("/login");
  }

  if (!merchant && !error) {
    return (
      <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 flex items-center justify-center">
        <p className="text-sm text-zinc-500 dark:text-zinc-400">Loading…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 flex items-center justify-center">
        <p className="text-sm text-red-600">{error}</p>
      </div>
    );
  }

  return (
    <div className="bg-zinc-50 dark:bg-zinc-950 min-h-screen">
      {/* Nav */}
      <nav className="bg-white dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800 px-4 py-3">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <span className="text-base font-bold text-zinc-900 dark:text-zinc-100">
            TapIn
          </span>
          <div className="flex items-center gap-4">
            <span className="text-sm text-zinc-600 dark:text-zinc-400">
              {merchant?.name}
            </span>
            <button
              onClick={handleSignOut}
              className="text-sm text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300 transition-colors"
            >
              Sign out
            </button>
          </div>
        </div>
      </nav>

      {/* Tabs */}
      <div className="bg-white dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800">
        <div className="max-w-4xl mx-auto px-4 flex gap-6">
          <Link
            href="/dashboard"
            className="py-3 text-sm text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300 transition-colors"
          >
            Overview
          </Link>
          <span className="py-3 text-sm border-b-2 border-indigo-600 text-indigo-600 font-medium cursor-default">
            Campaigns
          </span>
        </div>
      </div>

      {/* Body */}
      <main className="max-w-4xl mx-auto px-4 py-8">
        {/* Heading row */}
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100">
            Campaigns
          </h1>
          {!showForm && (
            <button
              onClick={() => setShowForm(true)}
              className="bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
            >
              Create campaign
            </button>
          )}
        </div>

        {/* Create form */}
        {showForm && (
          <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-5 mb-6">
            <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-100 mb-4">
              New campaign
            </h2>
            <form onSubmit={handleCreateCampaign} className="space-y-4">
              <div>
                <label
                  htmlFor="campaign-name"
                  className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1"
                >
                  Campaign name
                </label>
                <input
                  id="campaign-name"
                  type="text"
                  required
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="e.g. Summer loyalty"
                  className="w-full rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400"
                />
              </div>
              <div>
                <label
                  htmlFor="visits-required"
                  className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1"
                >
                  Visits required
                </label>
                <input
                  id="visits-required"
                  type="number"
                  min={1}
                  required
                  value={visitsRequired}
                  onChange={(e) => setVisitsRequired(Number(e.target.value))}
                  className="w-full rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 text-zinc-900 dark:text-zinc-100"
                />
              </div>
              <div>
                <label
                  htmlFor="reward-description"
                  className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1"
                >
                  Reward description
                </label>
                <input
                  id="reward-description"
                  type="text"
                  required
                  value={rewardDescription}
                  onChange={(e) => setRewardDescription(e.target.value)}
                  placeholder="e.g. Free coffee"
                  className="w-full rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400"
                />
              </div>
              {formError && (
                <p className="text-sm text-red-600">{formError}</p>
              )}
              <div className="flex items-center gap-3 pt-1">
                <button
                  type="submit"
                  disabled={formSaving}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {formSaving ? "Saving…" : "Save campaign"}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowForm(false);
                    setFormError(null);
                  }}
                  className="text-sm text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Campaign list */}
        {loading ? (
          <div className="space-y-4">
            {[1, 2].map((i) => (
              <div
                key={i}
                className="animate-pulse bg-zinc-200 dark:bg-zinc-700 h-32 rounded-xl"
              />
            ))}
          </div>
        ) : campaigns.length === 0 ? (
          <p className="text-sm text-zinc-500">
            No campaigns yet. Create one to get started.
          </p>
        ) : (
          <div>
            {campaigns.map((campaign) => {
              const stats = statsMap.get(campaign.id) ?? {
                enrolled: 0,
                avgProgressPct: 0,
              };
              return (
                <div
                  key={campaign.id}
                  className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-5 mb-4"
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-semibold text-zinc-900 dark:text-zinc-100">
                      {campaign.name}
                    </span>
                    <ActiveBadge isActive={campaign.is_active} />
                  </div>
                  <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-3">
                    Reward:{" "}
                    <span className="text-zinc-800 dark:text-zinc-200">
                      {campaign.reward_label}
                    </span>{" "}
                    after{" "}
                    <span className="text-zinc-800 dark:text-zinc-200">
                      {campaign.reward_threshold}
                    </span>{" "}
                    visits
                  </p>
                  <p className="text-sm text-zinc-500 mb-3">
                    {stats.enrolled} customer{stats.enrolled !== 1 ? "s" : ""}{" "}
                    enrolled
                  </p>
                  {/* Progress bar */}
                  <div className="bg-zinc-100 dark:bg-zinc-800 rounded-full h-2 mb-1">
                    <div
                      className="bg-indigo-600 rounded-full h-2 transition-all"
                      style={{ width: `${stats.avgProgressPct}%` }}
                    />
                  </div>
                  <p className="text-xs text-zinc-500">
                    Avg completion: {stats.avgProgressPct}%
                  </p>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
