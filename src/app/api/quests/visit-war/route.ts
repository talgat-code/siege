export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { updateDailyQuestProgress } from "@/lib/quests/updateProgress";

export async function POST() {
  const authClient = await createClient();
  const { data: { user } } = await authClient.auth.getUser();
  if (!user) return NextResponse.json({ ok: false });

  await updateDailyQuestProgress(user.id, { type: "visit_war" });

  return NextResponse.json({ ok: true });
}
