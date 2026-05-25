import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { redirect } from "next/navigation";
import { supabaseAdmin } from "@/lib/supabase-admin";
import MeClient, { type MerchantCard } from "./MeClient";

type VisitRow = {
  points_earned: number;
  campaigns: {
    merchant_id: string;
    reward_threshold: number;
    reward_label: string;
    points_per_visit: number;
    merchants: { id: string; name: string; slug: string } | null;
  } | null;
};

export default async function MePage() {
  // ── Auth ────────────────────────────────────────────────────────────────────
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

  if (!user) redirect("/auth");

  // ── Customer row ────────────────────────────────────────────────────────────
  const { data: customer } = await supabaseAdmin
    .from("customers")
    .select("id")
    .eq("user_id", user.id)
    .maybeSingle();

  // ── Visits + aggregation ────────────────────────────────────────────────────
  let cards: MerchantCard[] = [];

  if (customer) {
    const { data: visitRows } = await supabaseAdmin
      .from("visits")
      .select(
        `points_earned,
         campaigns (
           merchant_id,
           reward_threshold,
           reward_label,
           points_per_visit,
           merchants ( id, name, slug )
         )`
      )
      .eq("customer_id", customer.id)
      .eq("rejected", false);

    const merchantMap = new Map<string, MerchantCard>();

    for (const raw of (visitRows ?? []) as unknown as VisitRow[]) {
      const c = raw.campaigns;
      if (!c?.merchants) continue;

      const { id: merchantId, name, slug } = c.merchants;
      const existing = merchantMap.get(merchantId);

      if (!existing) {
        merchantMap.set(merchantId, {
          merchantId,
          name,
          slug,
          visitCount: 1,
          pointsEarned: raw.points_earned,
          rewardThreshold: c.reward_threshold,
          pointsPerVisit: c.points_per_visit,
          rewardLabel: c.reward_label,
        });
      } else {
        merchantMap.set(merchantId, {
          ...existing,
          visitCount: existing.visitCount + 1,
          pointsEarned: existing.pointsEarned + raw.points_earned,
        });
      }
    }

    cards = Array.from(merchantMap.values()).map((card) => {
      const visitsNeeded = Math.ceil(card.rewardThreshold / Math.max(card.pointsPerVisit, 1));
      const raw = card.visitCount % visitsNeeded;
      return {
        ...card,
        visitCount: raw === 0 && card.visitCount > 0 ? visitsNeeded : raw,
      };
    });
  }

  return <MeClient email={user.email ?? ""} cards={cards} />;
}
