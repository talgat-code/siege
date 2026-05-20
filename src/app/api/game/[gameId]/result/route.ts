export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { calculateNewRatings } from "@/lib/elo";

async function awardFactionPoints(winnerId: string) {
  try {
    const supabase = createAdminClient();
    const now = new Date().toISOString();

    const { data: activeWarList } = await supabase
      .from('weekly_wars')
      .select('*')
      .lte('start_date', now)
      .gte('end_date', now)
      .is('winner_faction_id', null)
      .limit(1);

    const activeWar = activeWarList?.[0] ?? null;
    if (!activeWar) return;

    const { data: winner } = await supabase
      .from('users')
      .select('faction_id')
      .eq('id', winnerId)
      .limit(1)
      .maybeSingle();

    if (!winner?.faction_id) return;

    const isFactA = winner.faction_id === activeWar.faction_a_id;
    const isFactB = winner.faction_id === activeWar.faction_b_id;
    if (!isFactA && !isFactB) return;

    const points = 5;

    // Update war points
    if (isFactA) {
      await supabase
        .from('weekly_wars')
        .update({ faction_a_points: activeWar.faction_a_points + points })
        .eq('id', activeWar.id);
    } else {
      await supabase
        .from('weekly_wars')
        .update({ faction_b_points: activeWar.faction_b_points + points })
        .eq('id', activeWar.id);
    }

    // Record contribution
    await supabase.from('faction_contributions').insert({
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
    const authClient = await createClient();
    const { data: { user } } = await authClient.auth.getUser();
    if (!user) return NextResponse.json({ error: "Не авторизован" }, { status: 401 });

    const { result, pgn, reason } = await request.json();
    const { gameId } = params;

    const supabase = createAdminClient();

    const { data: game } = await supabase
      .from('games')
      .select('*')
      .eq('id', gameId)
      .limit(1)
      .maybeSingle();
    if (!game) return NextResponse.json({ error: "Игра не найдена" }, { status: 404 });
    if (game.white_player_id !== user.id && game.black_player_id !== user.id) {
      return NextResponse.json({ error: "Нет доступа" }, { status: 403 });
    }
    if (game.result) return NextResponse.json({ success: true, alreadyFinished: true });

    const [{ data: whiteUser }, { data: blackUser }] = await Promise.all([
      supabase
        .from('users')
        .select('id, rating, wins, losses, draws, total_games')
        .eq('id', game.white_player_id)
        .limit(1)
        .maybeSingle(),
      supabase
        .from('users')
        .select('id, rating, wins, losses, draws, total_games')
        .eq('id', game.black_player_id)
        .limit(1)
        .maybeSingle(),
    ]);

    if (!whiteUser || !blackUser) return NextResponse.json({ error: "Игроки не найдены" }, { status: 404 });

    let newRatings = null;
    if (game.mode === "tournament") {
      newRatings = calculateNewRatings(whiteUser.rating, blackUser.rating, result);
    }

    await supabase.from('games').update({
      result,
      result_reason: reason ?? (result === "draw" ? "draw" : "checkmate"),
      pgn: pgn ?? game.pgn,
      white_rating_after: newRatings?.white ?? whiteUser.rating,
      black_rating_after: newRatings?.black ?? blackUser.rating,
    }).eq('id', gameId);

    if (game.mode === "tournament") {
      await Promise.all([
        supabase.from('users').update({
          rating: newRatings!.white,
          total_games: whiteUser.total_games + 1,
          wins: result === "white" ? whiteUser.wins + 1 : whiteUser.wins,
          losses: result === "black" ? whiteUser.losses + 1 : whiteUser.losses,
          draws: result === "draw" ? whiteUser.draws + 1 : whiteUser.draws,
        }).eq('id', game.white_player_id),

        supabase.from('users').update({
          rating: newRatings!.black,
          total_games: blackUser.total_games + 1,
          wins: result === "black" ? blackUser.wins + 1 : blackUser.wins,
          losses: result === "white" ? blackUser.losses + 1 : blackUser.losses,
          draws: result === "draw" ? blackUser.draws + 1 : blackUser.draws,
        }).eq('id', game.black_player_id),
      ]);

      // Award faction influence points to winner (fire-and-forget, non-critical)
      if (result !== "draw") {
        const winnerId = result === "white" ? game.white_player_id : game.black_player_id;
        awardFactionPoints(winnerId);
      }
    } else {
      await Promise.all([
        supabase.from('users').update({ total_games: whiteUser.total_games + 1 }).eq('id', game.white_player_id),
        supabase.from('users').update({ total_games: blackUser.total_games + 1 }).eq('id', game.black_player_id),
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
