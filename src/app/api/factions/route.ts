export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET() {
  try {
    const supabase = createAdminClient();
    const { data: factions, error } = await supabase.from('factions').select('*');
    if (error) throw error;
    return NextResponse.json(factions);
  } catch (error) {
    console.error("Factions fetch error:", error);
    return NextResponse.json({ error: "Ошибка загрузки фракций" }, { status: 500 });
  }
}
