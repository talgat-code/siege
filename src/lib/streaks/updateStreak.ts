import { createAdminClient } from "@/lib/supabase/admin";

interface MilestoneReward {
  gold:            number;
  achievementSlug: string | null;
}

const MILESTONES: Record<number, MilestoneReward> = {
  3:  { gold: 50,   achievementSlug: "dedicated_3"  },
  7:  { gold: 200,  achievementSlug: "dedicated_7"  },
  14: { gold: 500,  achievementSlug: null            },
  30: { gold: 1000, achievementSlug: "dedicated_30" },
};

export interface StreakResult {
  current_streak:  number;
  longest_streak:  number;
  isNewMilestone:  boolean;
  milestone?:      number;
  bonusGold?:      number;
}

export async function updateStreak(userId: string): Promise<StreakResult> {
  const today = new Date().toISOString().split("T")[0]; // UTC date YYYY-MM-DD
  const supabase = createAdminClient();

  const { data: streak } = await supabase
    .from("user_streaks")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();

  // Already active today — no-op
  if (streak?.last_active_date === today) {
    return { current_streak: streak.current_streak, longest_streak: streak.longest_streak, isNewMilestone: false };
  }

  const d = new Date();
  d.setUTCDate(d.getUTCDate() - 1);
  const yesterday = d.toISOString().split("T")[0];

  let newStreak: number;
  let newLongest: number;

  if (!streak) {
    newStreak  = 1;
    newLongest = 1;
    await supabase.from("user_streaks").insert({
      user_id:          userId,
      current_streak:   1,
      longest_streak:   1,
      last_active_date: today,
      total_active_days: 1,
    });
  } else {
    newStreak  = streak.last_active_date === yesterday ? streak.current_streak + 1 : 1;
    newLongest = Math.max(streak.longest_streak, newStreak);
    await supabase.from("user_streaks").update({
      current_streak:    newStreak,
      longest_streak:    newLongest,
      last_active_date:  today,
      total_active_days: streak.total_active_days + 1,
      updated_at:        new Date().toISOString(),
    }).eq("user_id", userId);
  }

  const milestone = MILESTONES[newStreak];
  if (!milestone) {
    return { current_streak: newStreak, longest_streak: newLongest, isNewMilestone: false };
  }

  // Award milestone gold
  const { data: userRow } = await supabase
    .from("users")
    .select("gold_coins")
    .eq("id", userId)
    .single();

  const newBalance = (userRow?.gold_coins ?? 0) + milestone.gold;

  await Promise.all([
    supabase.from("users").update({ gold_coins: newBalance }).eq("id", userId),
    supabase.from("gold_transactions").insert({
      user_id:      userId,
      amount:       milestone.gold,
      source:       "streak_milestone",
      reference_id: `streak_${newStreak}`,
      balance_after: newBalance,
    }),
  ]);

  // Unlock achievement
  if (milestone.achievementSlug) {
    const { data: ach } = await supabase
      .from("achievements")
      .select("id")
      .eq("slug", milestone.achievementSlug)
      .maybeSingle();

    if (ach) {
      await supabase.from("user_achievements").upsert(
        { user_id: userId, achievement_id: ach.id },
        { onConflict: "user_id,achievement_id", ignoreDuplicates: true }
      );
    }
  }

  return { current_streak: newStreak, longest_streak: newLongest, isNewMilestone: true, milestone: newStreak, bonusGold: milestone.gold };
}
