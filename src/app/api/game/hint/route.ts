export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

const HINT_COST = 10;        // gold per hint
const FREE_HINTS_PER_GAME = 1; // 1 free hint per game

export async function POST(req: NextRequest) {
  const authClient = await createClient();
  const { data: { user } } = await authClient.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { gameId, fen, moveNumber, hintType = "best_move" } = body as {
    gameId: string;
    fen: string;
    moveNumber: number;
    hintType?: "best_move" | "eval" | "plan";
  };

  if (!gameId || !fen) return NextResponse.json({ error: "gameId and fen required" }, { status: 400 });

  const supabase = createAdminClient();

  // Verify user is in this game
  const { data: game } = await supabase
    .from('games')
    .select('id, white_player_id, black_player_id, result, hints_used_white, hints_used_black')
    .eq('id', gameId)
    .limit(1)
    .maybeSingle();

  if (!game) return NextResponse.json({ error: "Game not found" }, { status: 404 });
  if (game.white_player_id !== user.id && game.black_player_id !== user.id) {
    return NextResponse.json({ error: "Not your game" }, { status: 403 });
  }
  if (game.result) return NextResponse.json({ error: "Game already finished" }, { status: 400 });

  const isWhite = game.white_player_id === user.id;
  const hintsUsed = isWhite ? (game.hints_used_white ?? 0) : (game.hints_used_black ?? 0);

  // Determine cost (first hint free)
  const isFree = hintsUsed < FREE_HINTS_PER_GAME;
  const cost = isFree ? 0 : HINT_COST;

  if (!isFree) {
    const { data: profile } = await supabase
      .from('users')
      .select('gold_coins')
      .eq('id', user.id)
      .limit(1)
      .maybeSingle();
    if ((profile?.gold_coins ?? 0) < HINT_COST) {
      return NextResponse.json({ error: "not_enough_gold", cost: HINT_COST }, { status: 402 });
    }
    // Deduct gold (read-then-write)
    await supabase
      .from('users')
      .update({ gold_coins: (profile!.gold_coins ?? 0) - HINT_COST })
      .eq('id', user.id);
  }

  // Increment hint counter (read-then-write)
  if (isWhite) {
    await supabase
      .from('games')
      .update({ hints_used_white: (game.hints_used_white ?? 0) + 1 })
      .eq('id', gameId);
  } else {
    await supabase
      .from('games')
      .update({ hints_used_black: (game.hints_used_black ?? 0) + 1 })
      .eq('id', gameId);
  }

  // Log hint usage
  await supabase.from('hints').insert({
    user_id: user.id,
    game_id: gameId,
    hint_type: hintType,
    move_number: moveNumber,
    cost_gold: cost,
  });

  return NextResponse.json({
    ok: true,
    isFree,
    cost,
    hintsUsedAfter: hintsUsed + 1,
    freeHintsPerGame: FREE_HINTS_PER_GAME,
  });
}
