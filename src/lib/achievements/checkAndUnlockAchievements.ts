import { createAdminClient } from "@/lib/supabase/admin";

// Checks static-stat achievements (wins / games / rating / gold) and unlocks any
// that the user now qualifies for. Idempotent — safe to call after every game.
// Streak achievements are handled separately by updateStreak.
// Skips: blitz_wins, no_blunders, faction_wins, streak (need dedicated tracking).
const SKIP_TYPES = new Set(["streak", "blitz_wins", "no_blunders", "faction_wins"]);

export async function checkAndUnlockAchievements(userId: string): Promise<void> {
  const supabase = createAdminClient();

  const [{ data: userRow }, { data: allAch }, { data: unlocked }] = await Promise.all([
    supabase
      .from("users")
      .select("wins, total_games, rating, gold_coins")
      .eq("id", userId)
      .limit(1)
      .maybeSingle(),
    supabase
      .from("achievements")
      .select("id, slug, requirement_type, requirement_value"),
    supabase
      .from("user_achievements")
      .select("achievement_id")
      .eq("user_id", userId),
  ]);

  if (!userRow || !allAch) return;

  const unlockedIds = new Set((unlocked ?? []).map((r) => r.achievement_id));

  const toUnlock: { user_id: string; achievement_id: string; unlocked_at: string }[] = [];
  const now = new Date().toISOString();

  for (const ach of allAch) {
    if (unlockedIds.has(ach.id)) continue;
    if (SKIP_TYPES.has(ach.requirement_type)) continue;

    let qualifies = false;

    if (ach.requirement_type === "wins") {
      qualifies = (userRow.wins ?? 0) >= ach.requirement_value;
    } else if (ach.requirement_type === "games") {
      qualifies = (userRow.total_games ?? 0) >= ach.requirement_value;
    } else if (ach.requirement_type === "rating") {
      // gold_hoarder reuses requirement_type='rating' but checks gold_coins
      if (ach.slug === "gold_hoarder") {
        qualifies = (userRow.gold_coins ?? 0) >= ach.requirement_value;
      } else {
        qualifies = (userRow.rating ?? 0) >= ach.requirement_value;
      }
    }

    if (qualifies) {
      toUnlock.push({ user_id: userId, achievement_id: ach.id, unlocked_at: now });
    }
  }

  if (toUnlock.length === 0) return;

  await supabase
    .from("user_achievements")
    .upsert(toUnlock, { onConflict: "user_id,achievement_id", ignoreDuplicates: true });
}
