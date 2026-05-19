import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { db, games, users, weekly_wars, faction_contributions } from "@/lib/db";
import { eq, isNull, lte, gte, and } from "drizzle-orm";
import { calculateNewRatings } from "@/lib/elo";

async function awardFactionPoints(
  winnerId: string,
  gameId: string
) {
  try {
    const now = new Date();
    const [activeWar] = await db
      .select()
      .from(weekly_wars)
      .where(
        and(
          lte(weekly_wars.start_date, now),
          gte(weekly_wars.end_date, now),
          isNull(weekly_wars.winner_faction_id)
        )
      )
      .limit(1);

    if (!activeWar) return;

    const [winner] = await db
      .select({ faction_id: users.faction_id })
      .from(users)
      .where(eq(users.id, winnerId))
      .limit(1);

    if (!winner?.faction_id) return;

    const isFactA = winner.faction_id === activeWar.faction_a_id;
    const isFactB = winner.faction_id === activeWar.faction_b_id;
    if (!isFactA && !isFactB) return;

    const points = 5;

    // Update war points
    if (isFactA) {
      await db
        .update(weekly_wars)
        .set({ faction_a_points: activeWar.faction_a_points + points })
        .where(eq(weekly_wars.id, activeWar.id));
    } else {
      await db
        .update(weekly_wars)
        .set({ faction_b_points: activeWar.faction_b_points + points })
        .where(eq(weekly_wars.id, activeWar.id));
    }

    // Record contribution
    await db.insert(faction_contributions).values({
      user_id: winnerId,
      faction_id: winner.faction_id,
      war_id: activeWar.id,
      points_contributed: points,
      games_played: 1,
      wins_in_war: 1,
    });
  } catch (e) {
    // Non-critical — log but don't fail the result save
    console.error("Faction points award error:", e);
  }
}

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

    const [game] = await db.select().from(games).where(eq(games.id, gameId)).limit(1);
    if (!game) return NextResponse.json({ error: "Игра не найдена" }, { status: 404 });
    if (game.white_player_id !== user.id && game.black_player_id !== user.id) {
      return NextResponse.json({ error: "Нет доступа" }, { status: 403 });
    }
    if (game.result) return NextResponse.json({ success: true, alreadyFinished: true });

    const [whiteUser] = await db
      .select({ id: users.id, rating: users.rating, wins: users.wins, losses: users.losses, draws: users.draws, total_games: users.total_games })
      .from(users).where(eq(users.id, game.white_player_id)).limit(1);
    const [blackUser] = await db
      .select({ id: users.id, rating: users.rating, wins: users.wins, losses: users.losses, draws: users.draws, total_games: users.total_games })
      .from(users).where(eq(users.id, game.black_player_id)).limit(1);

    if (!whiteUser || !blackUser) return NextResponse.json({ error: "Игроки не найдены" }, { status: 404 });

    let newRatings = null;
    if (game.mode === "tournament") {
      newRatings = calculateNewRatings(whiteUser.rating, blackUser.rating, result);
    }

    await db.update(games).set({
      result,
      result_reason: reason ?? (result === "draw" ? "draw" : "checkmate"),
      pgn: pgn ?? game.pgn,
      white_rating_after: newRatings?.white ?? whiteUser.rating,
      black_rating_after: newRatings?.black ?? blackUser.rating,
    }).where(eq(games.id, gameId));

    if (game.mode === "tournament") {
      await Promise.all([
        db.update(users).set({
          rating: newRatings!.white,
          total_games: whiteUser.total_games + 1,
          wins: result === "white" ? whiteUser.wins + 1 : whiteUser.wins,
          losses: result === "black" ? whiteUser.losses + 1 : whiteUser.losses,
          draws: result === "draw" ? whiteUser.draws + 1 : whiteUser.draws,
        }).where(eq(users.id, game.white_player_id)),

        db.update(users).set({
          rating: newRatings!.black,
          total_games: blackUser.total_games + 1,
          wins: result === "black" ? blackUser.wins + 1 : blackUser.wins,
          losses: result === "white" ? blackUser.losses + 1 : blackUser.losses,
          draws: result === "draw" ? blackUser.draws + 1 : blackUser.draws,
        }).where(eq(users.id, game.black_player_id)),
      ]);

      // Award faction influence points to winner (fire-and-forget, non-critical)
      if (result !== "draw") {
        const winnerId = result === "white" ? game.white_player_id : game.black_player_id;
        awardFactionPoints(winnerId, gameId);
      }
    } else {
      await Promise.all([
        db.update(users).set({ total_games: whiteUser.total_games + 1 }).where(eq(users.id, game.white_player_id)),
        db.update(users).set({ total_games: blackUser.total_games + 1 }).where(eq(users.id, game.black_player_id)),
      ]);
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
