import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { db, games, users } from "@/lib/db";
import { eq } from "drizzle-orm";
import { calculateNewRatings } from "@/lib/elo";

export async function POST(
  request: Request,
  { params }: { params: { gameId: string } }
) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Не авторизован" }, { status: 401 });

    const { result, pgn, reason } = await request.json();
    const { gameId } = params;

    // Verify user is a player
    const [game] = await db.select().from(games).where(eq(games.id, gameId)).limit(1);
    if (!game) return NextResponse.json({ error: "Игра не найдена" }, { status: 404 });
    if (game.white_player_id !== user.id && game.black_player_id !== user.id) {
      return NextResponse.json({ error: "Нет доступа" }, { status: 403 });
    }
    // Idempotent — if already finished, just return success
    if (game.result) return NextResponse.json({ success: true, alreadyFinished: true });

    // Fetch current ratings
    const [whiteUser] = await db
      .select({ id: users.id, rating: users.rating, wins: users.wins, losses: users.losses, draws: users.draws, total_games: users.total_games })
      .from(users).where(eq(users.id, game.white_player_id)).limit(1);
    const [blackUser] = await db
      .select({ id: users.id, rating: users.rating, wins: users.wins, losses: users.losses, draws: users.draws, total_games: users.total_games })
      .from(users).where(eq(users.id, game.black_player_id)).limit(1);

    if (!whiteUser || !blackUser) return NextResponse.json({ error: "Игроки не найдены" }, { status: 404 });

    // Only update ELO for tournament mode
    let newRatings = null;
    if (game.mode === "tournament") {
      newRatings = calculateNewRatings(whiteUser.rating, blackUser.rating, result);
    }

    // Save game result
    await db.update(games).set({
      result,
      result_reason: reason ?? (result === "draw" ? "draw" : "checkmate"),
      pgn: pgn ?? game.pgn,
      white_rating_after: newRatings?.white ?? whiteUser.rating,
      black_rating_after: newRatings?.black ?? blackUser.rating,
    }).where(eq(games.id, gameId));

    // Update player stats
    if (game.mode === "tournament") {
      await db.update(users).set({
        rating: newRatings!.white,
        total_games: whiteUser.total_games + 1,
        wins: result === "white" ? whiteUser.wins + 1 : whiteUser.wins,
        losses: result === "black" ? whiteUser.losses + 1 : whiteUser.losses,
        draws: result === "draw" ? whiteUser.draws + 1 : whiteUser.draws,
      }).where(eq(users.id, game.white_player_id));

      await db.update(users).set({
        rating: newRatings!.black,
        total_games: blackUser.total_games + 1,
        wins: result === "black" ? blackUser.wins + 1 : blackUser.wins,
        losses: result === "white" ? blackUser.losses + 1 : blackUser.losses,
        draws: result === "draw" ? blackUser.draws + 1 : blackUser.draws,
      }).where(eq(users.id, game.black_player_id));
    } else {
      // Training mode — update game count only
      await db.update(users).set({ total_games: whiteUser.total_games + 1 })
        .where(eq(users.id, game.white_player_id));
      await db.update(users).set({ total_games: blackUser.total_games + 1 })
        .where(eq(users.id, game.black_player_id));
    }

    return NextResponse.json({
      success: true,
      whiteRatingChange: newRatings?.whiteChange ?? 0,
      blackRatingChange: newRatings?.blackChange ?? 0,
    });
  } catch (error) {
    console.error("Result save error:", error);
    return NextResponse.json({ error: "Ошибка сервера" }, { status: 500 });
  }
}
