export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET() {
  try {
    const authClient = await createClient();
    const { data: { user } } = await authClient.auth.getUser();
    if (!user) return NextResponse.json({ error: "Не авторизован" }, { status: 401 });

    const supabase = createAdminClient();

    const { data: profile } = await supabase
      .from('users')
      .select('id, email, username, rating, faction_id, total_games, wins, losses, draws, created_at, faction:factions!faction_id(name, slug, color)')
      .eq('id', user.id)
      .limit(1)
      .maybeSingle();

    if (!profile) return NextResponse.json({ error: "Профиль не найден" }, { status: 404 });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const faction = profile.faction as any;
    const result = {
      id: profile.id,
      email: profile.email,
      username: profile.username,
      rating: profile.rating,
      faction_id: profile.faction_id,
      total_games: profile.total_games,
      wins: profile.wins,
      losses: profile.losses,
      draws: profile.draws,
      created_at: profile.created_at,
      faction_name: faction?.name ?? null,
      faction_slug: faction?.slug ?? null,
      faction_color: faction?.color ?? null,
    };

    return NextResponse.json(result);
  } catch (error) {
    console.error("Profile fetch error:", error);
    return NextResponse.json({ error: "Ошибка сервера" }, { status: 500 });
  }
}
