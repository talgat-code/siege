import { createAdminClient } from "@/lib/supabase/admin";

export interface MatchEventData {
  isWin: boolean;
  isRanked: boolean;
  isVsAi: boolean;
  aiSkillLevel?: number;          // Stockfish skill 0-20
  opponentFactionId?: string | null;
  userFactionId?: string | null;
  totalMoves: number;
  isWarWeekMatch: boolean;
}

export type QuestEvent =
  | { type: "match_finished"; matchData: MatchEventData }
  | { type: "visit_war" };

export async function updateDailyQuestProgress(
  userId: string,
  event: QuestEvent,
): Promise<void> {
  const today = new Date().toISOString().split("T")[0];
  const supabase = createAdminClient();

  const { data: quests } = await supabase
    .from("user_daily_quests")
    .select(
      "id, current_progress, template:daily_quest_templates!quest_template_id(requirement_type, requirement_value)"
    )
    .eq("user_id", userId)
    .eq("assigned_date", today)
    .eq("is_completed", false);

  if (!quests || quests.length === 0) return;

  for (const q of quests) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const tmpl = (q as any).template;
    if (!tmpl) continue;

    const reqType: string  = tmpl.requirement_type;
    const reqVal:  number  = tmpl.requirement_value;
    let   increment        = 0;

    if (event.type === "visit_war") {
      if (reqType === "visit_war") increment = 1;
    } else {
      const m = event.matchData;
      switch (reqType) {
        case "play_games":           increment = 1; break;
        case "win_games":            if (m.isWin) increment = 1; break;
        case "win_ranked":           if (m.isWin && m.isRanked) increment = 1; break;
        case "play_vs_ai":           if (m.isVsAi) increment = 1; break;
        case "play_long_game":       if (m.totalMoves >= reqVal) increment = 1; break;
        case "win_war_week":         if (m.isWin && m.isWarWeekMatch) increment = 1; break;
        case "total_moves":          increment = m.totalMoves; break;
        case "win_vs_other_faction":
          if (m.isWin && m.opponentFactionId && m.userFactionId && m.opponentFactionId !== m.userFactionId) increment = 1;
          break;
        case "win_vs_ai_min_skill":
          if (m.isWin && m.isVsAi && (m.aiSkillLevel ?? 0) >= reqVal) increment = 1;
          break;
      }
    }

    if (increment === 0) continue;

    const newProgress  = q.current_progress + increment;
    const isCompleted  = newProgress >= reqVal;

    await supabase
      .from("user_daily_quests")
      .update({
        current_progress: newProgress,
        is_completed:     isCompleted,
        completed_at:     isCompleted ? new Date().toISOString() : null,
      })
      .eq("id", q.id);
  }
}
