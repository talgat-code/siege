import { createAdminClient } from "@/lib/supabase/admin";

export interface FactionRank {
  tier:      number;
  title:     string;
  min_wins:  number;
  icon:      string;
  color:     string;
}

export interface UserRankResult {
  current:        FactionRank;
  next:           FactionRank | null;
  winsToNext:     number;
  progressPct:    number;   // 0-100
}

export async function getUserRank(factionId: string, wins: number): Promise<UserRankResult | null> {
  const supabase = createAdminClient();

  const { data: ranks } = await supabase
    .from("faction_ranks")
    .select("tier, title, min_wins, icon, color")
    .eq("faction_id", factionId)
    .order("tier", { ascending: true });

  if (!ranks || ranks.length === 0) return null;

  let current: FactionRank = ranks[0];
  let next:    FactionRank | null = null;

  for (let i = 0; i < ranks.length; i++) {
    if (wins >= ranks[i].min_wins) {
      current = ranks[i];
      next    = ranks[i + 1] ?? null;
    }
  }

  const winsToNext  = next ? Math.max(0, next.min_wins - wins) : 0;
  const rangeMin    = current.min_wins;
  const rangeMax    = next?.min_wins ?? rangeMin;
  const progressPct = next
    ? Math.min(100, Math.round(((wins - rangeMin) / (rangeMax - rangeMin)) * 100))
    : 100;

  return { current, next, winsToNext, progressPct };
}
