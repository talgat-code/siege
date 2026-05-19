import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { db, users, factions } from "@/lib/db";
import { eq } from "drizzle-orm";

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Не авторизован" }, { status: 401 });

    const [profile] = await db
      .select({
        id: users.id,
        email: users.email,
        username: users.username,
        rating: users.rating,
        faction_id: users.faction_id,
        total_games: users.total_games,
        wins: users.wins,
        losses: users.losses,
        draws: users.draws,
        created_at: users.created_at,
        faction_name: factions.name,
        faction_slug: factions.slug,
        faction_color: factions.color,
      })
      .from(users)
      .leftJoin(factions, eq(users.faction_id, factions.id))
      .where(eq(users.id, user.id))
      .limit(1);

    if (!profile) return NextResponse.json({ error: "Профиль не найден" }, { status: 404 });

    return NextResponse.json(profile);
  } catch (error) {
    console.error("Profile fetch error:", error);
    return NextResponse.json({ error: "Ошибка сервера" }, { status: 500 });
  }
}
