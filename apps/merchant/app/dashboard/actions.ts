"use server";

import { supabaseAdmin } from "@/lib/supabase-admin";

export interface VisitorRow {
  customerId: string;
  displayName: string;
  totalVisits: number;
  lastVisit: string;
  daysSinceLastVisit: number;
}

export interface DashboardStats {
  totalVisits: string;
  returnRate: string;
  rewardsClaimed: string;
  avgDays: string;
}

export interface VisitorData {
  visitors: VisitorRow[];
  claimCustomerIds: string[];
}

export async function fetchMerchant(
  userId: string
): Promise<{ id: string; name: string } | null> {
  const { data } = await supabaseAdmin
    .from("merchants")
    .select("id, name")
    .eq("user_id", userId)
    .single();
  return data ?? null;
}

export async function fetchStats(merchantId: string): Promise<DashboardStats> {
  const thirtyDaysAgo = new Date(
    Date.now() - 30 * 24 * 60 * 60 * 1000
  ).toISOString();

  // Total visits last 30 days
  const { count } = await supabaseAdmin
    .from("visits")
    .select("id, nfc_codes!inner(merchant_id)", { count: "exact", head: true })
    .eq("nfc_codes.merchant_id", merchantId)
    .eq("rejected", false)
    .gte("created_at", thirtyDaysAgo);

  // Return rate
  const { data: visitRows } = await supabaseAdmin
    .from("visits")
    .select("customer_id, nfc_codes!inner(merchant_id)")
    .eq("nfc_codes.merchant_id", merchantId)
    .eq("rejected", false);

  const perCustomer = new Map<string, number>();
  for (const row of visitRows ?? []) {
    perCustomer.set(row.customer_id, (perCustomer.get(row.customer_id) ?? 0) + 1);
  }
  const totalCustomers = perCustomer.size;
  const returning = Array.from(perCustomer.values()).filter((n) => n >= 2).length;
  const rate = totalCustomers === 0 ? 0 : Math.round((returning / totalCustomers) * 100);

  // Rewards redeemed
  const { count: redeemedCount } = await supabaseAdmin
    .from("reward_claims")
    .select("id", { count: "exact", head: true })
    .eq("merchant_id", merchantId)
    .is("voided_at", null);

  // Avg days between visits
  const { data: allVisits } = await supabaseAdmin
    .from("visits")
    .select("customer_id, created_at, nfc_codes!inner(merchant_id)")
    .eq("nfc_codes.merchant_id", merchantId)
    .eq("rejected", false)
    .order("created_at", { ascending: true });

  const byCustomer = new Map<string, string[]>();
  for (const v of allVisits ?? []) {
    const arr = byCustomer.get(v.customer_id) ?? [];
    arr.push(v.created_at);
    byCustomer.set(v.customer_id, arr);
  }
  const gaps: number[] = [];
  for (const times of Array.from(byCustomer.values())) {
    for (let i = 1; i < times.length; i++) {
      gaps.push((Date.parse(times[i]) - Date.parse(times[i - 1])) / 86400000);
    }
  }
  const avgDaysVal =
    gaps.length === 0
      ? null
      : (gaps.reduce((a, b) => a + b, 0) / gaps.length).toFixed(1);

  return {
    totalVisits: count !== null ? String(count) : "—",
    returnRate: `${rate}%`,
    rewardsClaimed: redeemedCount !== null ? String(redeemedCount) : "—",
    avgDays: avgDaysVal !== null ? `${avgDaysVal} days` : "—",
  };
}

export async function fetchVisitorData(merchantId: string): Promise<VisitorData> {
  const [{ data: visitData }, { data: claimsData }] = await Promise.all([
    supabaseAdmin
      .from("visits")
      .select(
        "customer_id, created_at, nfc_codes!inner(merchant_id), customers(display_name, email)"
      )
      .eq("nfc_codes.merchant_id", merchantId)
      .eq("rejected", false)
      .order("created_at", { ascending: false }),
    supabaseAdmin
      .from("reward_claims")
      .select("customer_id")
      .eq("merchant_id", merchantId)
      .is("voided_at", null),
  ]);

  const claimCustomerIds = (claimsData ?? []).map((r) => r.customer_id as string);

  const visitorMap = new Map<
    string,
    { displayName: string; totalVisits: number; lastVisit: string }
  >();

  for (const row of visitData ?? []) {
    const cid = row.customer_id as string;
    const customerInfo = (row.customers as unknown) as
      | { display_name: string | null; email: string | null }
      | null;
    const displayName =
      customerInfo?.display_name ?? customerInfo?.email ?? "Anonymous";
    const existing = visitorMap.get(cid);
    if (!existing) {
      visitorMap.set(cid, { displayName, totalVisits: 1, lastVisit: row.created_at as string });
    } else {
      visitorMap.set(cid, { ...existing, totalVisits: existing.totalVisits + 1 });
    }
  }

  const now = Date.now();
  const visitors: VisitorRow[] = Array.from(visitorMap.entries())
    .map(([customerId, info]) => ({
      customerId,
      displayName: info.displayName,
      totalVisits: info.totalVisits,
      lastVisit: info.lastVisit,
      daysSinceLastVisit: (now - Date.parse(info.lastVisit)) / 86400000,
    }))
    .sort((a, b) => Date.parse(b.lastVisit) - Date.parse(a.lastVisit));

  return { visitors, claimCustomerIds };
}
