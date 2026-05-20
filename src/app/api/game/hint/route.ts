export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { db, users, games, hints } from "@/lib/db";
import { eq, sql } from "drizzle-orm";

const HINT_COST = 10;        // gold per hint
const FREE_HINTS_PER_GAME = 1; // 1 free hint per game

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { gameId, fen, moveNumber, hintType = "best_move" } = body as {
    gameId: string;
    fen: string;
    moveNumber: number;
    hintType?: "best_move" | "eval" | "plan";
  };

  if (!gameId || !fen) return NextResponse.json({ error: "gameId and fen required" }, { status: 400 });

  // Verify user is in this game
  const [game] = await db.select({
    id: games.id,
    white_player_id: games.white_player_id,
    black_player_id: games.black_player_id,
    result: games.result,
    hints_used_white: games.hints_used_white,
    hints_used_black: games.hints_used_black,
  }).from(games).where(eq(games.id, gameId)).limit(1);

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
    const [profile] = await db.select({ gold_coins: users.gold_coins })
      .from(users).where(eq(users.id, user.id)).limit(1);
    if ((profile?.gold_coins ?? 0) < HINT_COST) {
      return NextResponse.json({ error: "not_enough_gold", cost: HINT_COST }, { status: 402 });
    }
    // Deduct gold
    await db.update(users)
      .set({ gold_coins: sql`${users.gold_coins} - ${HINT_COST}` })
      .where(eq(users.id, user.id));
  }

  // Increment hint counter
  if (isWhite) {
    await db.update(games)
      .set({ hints_used_white: sql`${games.hints_used_white} + 1` })
      .where(eq(games.id, gameId));
  } else {
    await db.update(games)
      .set({ hints_used_black: sql`${games.hints_used_black} + 1` })
      .where(eq(games.id, gameId));
  }

  // Log hint usage
  await db.insert(hints).values({
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
