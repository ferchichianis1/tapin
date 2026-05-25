import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { redirect } from "next/navigation";
import { supabaseAdmin } from "@/lib/supabase-admin";
import ProfileClient, { type ProfileStats } from "./ProfileClient";

type VisitRow = {
  points_earned: number;
  campaigns: {
    merchant_id: string;
    reward_threshold: number;
  } | null;
};

export default async function ProfilePage() {
  const cookieStore = cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll() {},
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/auth");

  const { data: customer } = await supabaseAdmin
    .from("customers")
    .select("id")
    .eq("user_id", user.id)
    .maybeSingle();

  let stats: ProfileStats = { totalVisits: 0, merchantCount: 0, rewardsEarned: 0 };

  if (customer) {
    const { data: visitRows } = await supabaseAdmin
      .from("visits")
      .select("points_earned, campaigns(merchant_id, reward_threshold)")
      .eq("customer_id", customer.id)
      .eq("rejected", false);

    const merchantPoints = new Map<string, { points: number; threshold: number }>();
    let totalVisits = 0;

    for (const raw of (visitRows ?? []) as unknown as VisitRow[]) {
      totalVisits++;
      if (!raw.campaigns) continue;
      const { merchant_id, reward_threshold } = raw.campaigns;
      const existing = merchantPoints.get(merchant_id);
      merchantPoints.set(merchant_id, {
        points: (existing?.points ?? 0) + raw.points_earned,
        threshold: reward_threshold,
      });
    }

    let rewardsEarned = 0;
    Array.from(merchantPoints.values()).forEach(({ points, threshold }) => {
      if (threshold > 0) rewardsEarned += Math.floor(points / threshold);
    });

    stats = { totalVisits, merchantCount: merchantPoints.size, rewardsEarned };
  }

  return <ProfileClient email={user.email ?? ""} stats={stats} />;
}
