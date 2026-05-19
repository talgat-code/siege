export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { db, games } from "@/lib/db";
import { eq } from "drizzle-orm";

export async function POST(
  request: Request,
  { params }: { params: { gameId: string } }
) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Не авторизован" }, { status: 401 });

    const { pgn, white_time_ms, black_time_ms } = await request.json();
    const { gameId } = params;

    // Verify user is a player in this game
    const [game] = await db.select().from(games).where(eq(games.id, gameId)).limit(1);
    if (!game) return NextResponse.json({ error: "Игра не найдена" }, { status: 404 });
    if (game.white_player_id !== user.id && game.black_player_id !== user.id) {
      return NextResponse.json({ error: "Нет доступа" }, { status: 403 });
    }
    if (game.result) return NextResponse.json({ error: "Игра завершена" }, { status: 400 });

    await db.update(games)
      .set({ pgn, white_time_ms, black_time_ms, last_move_at: new Date() })
      .where(eq(games.id, gameId));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Move save error:", error);
    return NextResponse.json({ error: "Ошибка сервера" }, { status: 500 });
  }
}
