export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { db, game_analysis, games } from "@/lib/db";
import { eq } from "drizzle-orm";

export async function GET(
  _req: Request,
  { params }: { params: { gameId: string } }
) {
  const [row] = await db
    .select()
    .from(game_analysis)
    .where(eq(game_analysis.game_id, params.gameId))
    .limit(1);

  return NextResponse.json(row ?? null);
}

export async function POST(
  request: Request,
  { params }: { params: { gameId: string } }
) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const [game] = await db.select().from(games).where(eq(games.id, params.gameId)).limit(1);
    if (!game) return NextResponse.json({ error: "Not found" }, { status: 404 });
    if (game.white_player_id !== user.id && game.black_player_id !== user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { evals, accuracy, key_moments, summary } = await request.json();

    const existing = await db
      .select({ id: game_analysis.id })
      .from(game_analysis)
      .where(eq(game_analysis.game_id, params.gameId))
      .limit(1);

    const keyMomentsForDb = (key_moments ?? []).map((m: {
      moveNumber: number;
      color: string;
      san: string;
      classification: string;
      loss: number;
      comment: string;
    }) => ({
      move_number: m.moveNumber,
      type: m.classification as "blunder" | "mistake" | "inaccuracy" | "brilliant",
      eval_before: 0,
      eval_after: 0,
      best_move: m.san,
    }));

    if (existing.length > 0) {
      await db
        .update(game_analysis)
        .set({
          stockfish_evaluations: evals ?? [],
          key_moments: keyMomentsForDb,
          ai_narrative_text: [
            summary ?? "",
            accuracy ? `Точность: белые ${accuracy.white}%, чёрные ${accuracy.black}%` : "",
          ].filter(Boolean).join("\n"),
        })
        .where(eq(game_analysis.game_id, params.gameId));
    } else {
      await db.insert(game_analysis).values({
        game_id: params.gameId,
        stockfish_evaluations: evals ?? [],
        key_moments: keyMomentsForDb,
        ai_narrative_text: [
          summary ?? "",
          accuracy ? `Точность: белые ${accuracy.white}%, чёрные ${accuracy.black}%` : "",
        ].filter(Boolean).join("\n"),
      });
    }

    await db.update(games)
      .set({ analysis_status: "done" })
      .where(eq(games.id, params.gameId));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Analysis save error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
