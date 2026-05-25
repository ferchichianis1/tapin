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

  // ── Active campaign ───────────────────────────────────────────────────────
  const now = new Date().toISOString();
  const { data: campaign } = await supabaseAdmin
    .from("campaigns")
    .select("reward_threshold, points_per_visit")
    .eq("merchant_id", merchant.id)
    .eq("is_active", true)
    .lte("starts_at", now)
    .or(`ends_at.is.null,ends_at.gt.${now}`)
    .limit(1)
    .single();

  if (!campaign) {
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

  // ── Customer points balance ───────────────────────────────────────────────
  const { data: customer } = await supabaseAdmin
    .from("customers")
    .select("points_balance")
    .eq("user_id", user.id)
    .maybeSingle();

  return (
    <TapClient
      slug={slug}
      merchant={{
        id: merchant.id,
        name: merchant.name,
        logo_url: merchant.logo_url ?? null,
      }}
      campaign={{
        reward_threshold: campaign.reward_threshold,
        points_per_visit: campaign.points_per_visit,
      }}
      initialPoints={customer?.points_balance ?? 0}
    />
  );
}
