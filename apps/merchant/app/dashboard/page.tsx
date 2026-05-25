"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { fetchMerchant, fetchStats, fetchVisitorData } from "./actions";
import type { VisitorRow, DashboardStats } from "./actions";

// ---------------------------------------------------------------------------
// Inline sub-components
// ---------------------------------------------------------------------------

function StatCard({
  label,
  value,
  loading,
}: {
  label: string;
  value: string;
  loading: boolean;
}) {
  return (
    <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-5">
      <p className="text-sm text-zinc-500">{label}</p>
      {loading ? (
        <div className="animate-pulse bg-zinc-200 dark:bg-zinc-700 h-8 w-20 rounded mt-1" />
      ) : (
        <p className="text-3xl font-bold text-zinc-900 dark:text-zinc-100 mt-1">{value}</p>
      )}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  let cls = "";
  if (status === "Reward ready") cls = "bg-emerald-100 text-emerald-700";
  else if (status === "At risk") cls = "bg-amber-100 text-amber-700";
  else if (status === "Regular") cls = "bg-indigo-100 text-indigo-700";
  else cls = "bg-zinc-100 text-zinc-600";
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${cls}`}>
      {status}
    </span>
  );
}

function relativeTime(daysSince: number): string {
  if (daysSince < 1) return "Today";
  if (daysSince < 2) return "Yesterday";
  return `${Math.floor(daysSince)} days ago`;
}

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------

export default function DashboardPage() {
  const router = useRouter();
  const [merchantName, setMerchantName] = useState<string | null>(null);
  const [merchantId, setMerchantId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [statsLoading, setStatsLoading] = useState(true);
  const [stats, setStats] = useState<DashboardStats>({
    totalVisits: "—",
    returnRate: "—",
    rewardsClaimed: "—",
    avgDays: "—",
  });

  const [tableLoading, setTableLoading] = useState(true);
  const [visitors, setVisitors] = useState<VisitorRow[]>([]);
  const [claimsSet, setClaimsSet] = useState<Set<string>>(new Set());
  const [refreshKey, setRefreshKey] = useState(0);

  function refresh() {
    setRefreshKey((k) => k + 1);
  }

  useEffect(() => {
    function handleVisibility() {
      if (document.visibilityState === "visible") refresh();
    }
    document.addEventListener("visibilitychange", handleVisibility);
    return () => document.removeEventListener("visibilitychange", handleVisibility);
  }, []);

  useEffect(() => {
    async function init() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.replace("/login");
        return;
      }

      const merchant = await fetchMerchant(session.user.id);
      if (!merchant) {
        setError("No merchant account found");
        return;
      }

      setMerchantName(merchant.name);
      setMerchantId(merchant.id);

      await Promise.all([
        fetchStats(merchant.id).then((s) => {
          setStats(s);
          setStatsLoading(false);
        }),
        fetchVisitorData(merchant.id).then(({ visitors: rows, claimCustomerIds }) => {
          setVisitors(rows);
          setClaimsSet(new Set(claimCustomerIds));
          setTableLoading(false);
        }),
      ]);
    }

    setStatsLoading(true);
    setTableLoading(true);
    init();
  }, [router, refreshKey]);

  function getStatus(row: VisitorRow): string {
    if (claimsSet.has(row.customerId)) return "Reward ready";
    if (row.daysSinceLastVisit > 10) return "At risk";
    if (row.totalVisits >= 3) return "Regular";
    return "New";
  }

  async function handleSignOut() {
    await supabase.auth.signOut();
    router.replace("/login");
  }

  if (!merchantId && !error) {
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
          <span className="text-base font-bold text-zinc-900 dark:text-zinc-100">TapIn</span>
          <div className="flex items-center gap-4">
            <span className="text-sm text-zinc-600 dark:text-zinc-400">{merchantName}</span>
            <button
              onClick={refresh}
              className="text-sm text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300 transition-colors"
            >
              Refresh
            </button>
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
          <span className="py-3 text-sm border-b-2 border-indigo-600 text-indigo-600 font-medium cursor-default">
            Overview
          </span>
          <Link
            href="/dashboard/campaigns"
            className="py-3 text-sm text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300 transition-colors"
          >
            Campaigns
          </Link>
        </div>
      </div>

      {/* Body */}
      <main className="max-w-4xl mx-auto px-4 py-8">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard label="Visits (last 30 days)" value={stats.totalVisits} loading={statsLoading} />
          <StatCard label="Return rate" value={stats.returnRate} loading={statsLoading} />
          <StatCard label="Rewards redeemed" value={stats.rewardsClaimed} loading={statsLoading} />
          <StatCard label="Avg days between visits" value={stats.avgDays} loading={statsLoading} />
        </div>

        <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 mt-10 mb-4">
          Recent visitors
        </h2>

        {tableLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="animate-pulse bg-zinc-200 dark:bg-zinc-700 h-14 rounded-xl" />
            ))}
          </div>
        ) : visitors.length === 0 ? (
          <p className="text-sm text-zinc-500">No visitors yet.</p>
        ) : (
          <>
            {/* Mobile: stacked cards */}
            <div className="md:hidden space-y-3">
              {visitors.map((row) => (
                <div
                  key={row.customerId}
                  className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-4"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                      {row.displayName}
                    </span>
                    <StatusBadge status={getStatus(row)} />
                  </div>
                  <div className="mt-1 flex gap-4 text-xs text-zinc-500">
                    <span>{row.totalVisits} visit{row.totalVisits !== 1 ? "s" : ""}</span>
                    <span>{relativeTime(row.daysSinceLastVisit)}</span>
                  </div>
                </div>
              ))}
            </div>

            {/* Desktop: table */}
            <div className="hidden md:block overflow-hidden rounded-xl border border-zinc-200 dark:border-zinc-800">
              <table className="w-full text-sm">
                <thead className="bg-zinc-50 dark:bg-zinc-800/50">
                  <tr>
                    <th className="text-left px-4 py-3 font-medium text-zinc-500 text-xs uppercase tracking-wide">Name</th>
                    <th className="text-left px-4 py-3 font-medium text-zinc-500 text-xs uppercase tracking-wide">Visits</th>
                    <th className="text-left px-4 py-3 font-medium text-zinc-500 text-xs uppercase tracking-wide">Last visit</th>
                    <th className="text-left px-4 py-3 font-medium text-zinc-500 text-xs uppercase tracking-wide">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800 bg-white dark:bg-zinc-900">
                  {visitors.map((row) => (
                    <tr key={row.customerId} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors">
                      <td className="px-4 py-3 text-zinc-900 dark:text-zinc-100 font-medium">{row.displayName}</td>
                      <td className="px-4 py-3 text-zinc-600 dark:text-zinc-400">{row.totalVisits}</td>
                      <td className="px-4 py-3 text-zinc-600 dark:text-zinc-400">{relativeTime(row.daysSinceLastVisit)}</td>
                      <td className="px-4 py-3"><StatusBadge status={getStatus(row)} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
