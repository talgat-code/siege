import { createAdminClient } from "@/lib/supabase/admin";

export async function assignDailyQuests(userId: string): Promise<void> {
  const today = new Date().toISOString().split("T")[0]; // YYYY-MM-DD UTC
  const supabase = createAdminClient();

  const { data: existing } = await supabase
    .from("user_daily_quests")
    .select("id")
    .eq("user_id", userId)
    .eq("assigned_date", today)
    .limit(1);

  if (existing && existing.length > 0) return;

  const { data: templates } = await supabase
    .from("daily_quest_templates")
    .select("id, difficulty")
    .eq("is_active", true);

  if (!templates || templates.length === 0) return;

  const pick = <T>(arr: T[]) => arr[Math.floor(Math.random() * arr.length)];
  const byDiff = (d: string) => templates.filter((t) => t.difficulty === d);

  const easy   = pick(byDiff("easy"));
  const medium = pick(byDiff("medium"));
  const hard   = pick(byDiff("hard"));

  if (!easy || !medium || !hard) return;

  await supabase.from("user_daily_quests").insert([
    { user_id: userId, quest_template_id: easy.id,   assigned_date: today },
    { user_id: userId, quest_template_id: medium.id, assigned_date: today },
    { user_id: userId, quest_template_id: hard.id,   assigned_date: today },
  ]);
}
