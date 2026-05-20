export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(request: Request) {
  const authClient = await createClient();
  const { data: { user } } = await authClient.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let questId: string;
  try {
    ({ questId } = await request.json());
  } catch {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }
  if (!questId) return NextResponse.json({ error: "Missing questId" }, { status: 400 });

  const supabase = createAdminClient();

  const { data: quest } = await supabase
    .from("user_daily_quests")
    .select("id, user_id, is_completed, reward_claimed, template:daily_quest_templates!quest_template_id(reward_gold)")
    .eq("id", questId)
    .single();

  if (!quest) return NextResponse.json({ error: "Quest not found" }, { status: 404 });
  if (quest.user_id !== user.id) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  if (!quest.is_completed) return NextResponse.json({ error: "Quest not completed" }, { status: 400 });
  if (quest.reward_claimed) return NextResponse.json({ error: "Already claimed" }, { status: 400 });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const rewardGold: number = (quest as any).template?.reward_gold ?? 0;

  const { data: userRow } = await supabase
    .from("users")
    .select("gold_coins")
    .eq("id", user.id)
    .single();

  if (!userRow) return NextResponse.json({ error: "User not found" }, { status: 404 });

  const newBalance = (userRow.gold_coins ?? 0) + rewardGold;

  await Promise.all([
    supabase.from("users").update({ gold_coins: newBalance }).eq("id", user.id),
    supabase.from("gold_transactions").insert({
      user_id:      user.id,
      amount:       rewardGold,
      source:       "daily_quest",
      reference_id: quest.id,
      balance_after: newBalance,
    }),
    supabase.from("user_daily_quests").update({
      reward_claimed:    true,
      reward_claimed_at: new Date().toISOString(),
    }).eq("id", quest.id),
  ]);

  return NextResponse.json({ success: true, newBalance, addedGold: rewardGold });
}
