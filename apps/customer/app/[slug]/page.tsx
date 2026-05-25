import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { redirect } from "next/navigation";
import { supabaseAdmin } from "@/lib/supabase-admin";
import TapClient from "./TapClient";

export default async function SlugPage({
  params,
}: {
  params: { slug: string };
}) {
  const { slug } = params;

  // ── Auth ──────────────────────────────────────────────────────────────────
  const cookieStore = cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll() {
          // Can't set cookies in a Server Component; middleware handles refresh
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect(`/auth?next=/${slug}`);

  // ── Merchant ──────────────────────────────────────────────────────────────
  const { data: merchant } = await supabaseAdmin
    .from("merchants")
    .select("id, name, logo_url")
    .eq("slug", slug)
    .single();

  if (!merchant) {
    return (
      <div className="min-h-screen bg-stone-50 flex items-center justify-center px-4">
        <div className="text-center">
          <h1 className="text-xl font-semibold text-stone-900 mb-2">
            Shop not found
          </h1>
          <p className="text-sm text-stone-500">
            This link doesn&apos;t match any store in our system.
          </p>
        </div>
      </div>
    );
  }

  // ── Active campaign ───────────────────────────────────────────────────────
  const now = new Date().toISOString();
  const { data: campaign } = await supabaseAdmin
    .from("campaigns")
    .select("id, reward_threshold, points_per_visit, reward_label")
    .eq("merchant_id", merchant.id)
    .eq("is_active", true)
    .lte("starts_at", now)
    .or(`ends_at.is.null,ends_at.gt.${now}`)
    .limit(1)
    .single();

  if (!campaign) {
    return (
      <div className="min-h-screen bg-stone-50 flex items-center justify-center px-4">
        <div className="text-center">
          <h1 className="text-xl font-semibold text-stone-900 mb-2">
            No active campaign
          </h1>
          <p className="text-sm text-stone-500">
            This store doesn&apos;t have an active loyalty campaign right now.
          </p>
        </div>
      </div>
    );
  }

  // ── Customer points balance + streak ─────────────────────────────────────
  const { data: customer } = await supabaseAdmin
    .from("customers")
    .select("id, points_balance")
    .eq("user_id", user.id)
    .maybeSingle();

  let streakCount = 0;
  let recentVisits: string[] = [];
  if (customer) {
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const [{ count }, { data: visitRows }] = await Promise.all([
      supabaseAdmin
        .from("visits")
        .select("id, nfc_codes!inner(merchant_id)", { count: "exact", head: true })
        .eq("customer_id", customer.id)
        .eq("nfc_codes.merchant_id", merchant.id)
        .eq("rejected", false)
        .gte("created_at", sevenDaysAgo),
      supabaseAdmin
        .from("visits")
        .select("created_at")
        .eq("customer_id", customer.id)
        .eq("campaign_id", campaign.id)
        .eq("rejected", false)
        .order("created_at", { ascending: false })
        .limit(5),
    ]);
    streakCount = count ?? 0;
    recentVisits = (visitRows ?? []).map((v) => v.created_at as string);
  }

  return (
    <TapClient
      slug={slug}
      merchant={{
        id: merchant.id,
        name: merchant.name,
        logo_url: merchant.logo_url ?? null,
      }}
      campaign={{
        id: campaign.id,
        reward_threshold: campaign.reward_threshold,
        points_per_visit: campaign.points_per_visit,
        reward_label: campaign.reward_label,
      }}
      initialPoints={customer?.points_balance ?? 0}
      streakCount={streakCount}
      recentVisits={recentVisits}
    />
  );
}
