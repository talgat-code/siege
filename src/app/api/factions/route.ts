import { NextResponse } from "next/server";
import { db, factions } from "@/lib/db";

export async function GET() {
  try {
    const all = await db.select().from(factions);
    return NextResponse.json(all);
  } catch (error) {
    console.error("Factions fetch error:", error);
    return NextResponse.json({ error: "Ошибка загрузки фракций" }, { status: 500 });
  }
}
