export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { updateDailyQuestProgress, type MatchEventData } from "@/lib/quests/updateProgress";
import { updateStreak } from "@/lib/streaks/updateStreak";

export async function POST(request: Request) {
  const authClient = await createClient();
  const { data: { user } } = await authClient.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();

  const matchData: MatchEventData = {
    isWin:             body.isWin             ?? false,
    isRanked:          body.isRanked          ?? false,
    isVsAi:            body.isVsAi            ?? false,
    aiSkillLevel:      body.aiSkillLevel,
    opponentFactionId: body.opponentFactionId ?? null,
    userFactionId:     body.userFactionId     ?? null,
    totalMoves:        body.totalMoves        ?? 0,
    isWarWeekMatch:    body.isWarWeekMatch     ?? false,
  };

  const [, streakResult] = await Promise.all([
    updateDailyQuestProgress(user.id, { type: "match_finished", matchData }),
    updateStreak(user.id),
  ]);

  // Return today's updated quests so the client can display progress
  const today = new Date().toISOString().split("T")[0];
  const supabase = createAdminClient();
  const { data: quests } = await supabase
    .from("user_daily_quests")
    .select(
      "id, current_progress, is_completed, reward_claimed, template:daily_quest_templates!quest_template_id(title, requirement_value, reward_gold)"
    )
    .eq("user_id", user.id)
    .eq("assigned_date", today)
    .order("created_at", { ascending: true });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const questProgress = (quests ?? []).map((q: any) => ({
    id:            q.id,
    title:         q.template?.title              ?? "Задание",
    current:       q.current_progress             ?? 0,
    target:        q.template?.requirement_value  ?? 1,
    reward:        q.template?.reward_gold        ?? 0,
    isCompleted:   q.is_completed                 ?? false,
    rewardClaimed: q.reward_claimed               ?? false,
  }));

  return NextResponse.json({
    success: true,
    quests:  questProgress,
    streak: {
      current:        streakResult.current_streak,
      isNewMilestone: streakResult.isNewMilestone,
      milestone:      streakResult.milestone  ?? null,
      bonusGold:      streakResult.bonusGold  ?? null,
    },
  });
}
