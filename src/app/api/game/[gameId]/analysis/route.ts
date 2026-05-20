export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET(
  _req: Request,
  { params }: { params: { gameId: string } }
) {
  const supabase = createAdminClient();

  const { data: row } = await supabase
    .from('game_analysis')
    .select('*')
    .eq('game_id', params.gameId)
    .limit(1)
    .maybeSingle();

  return NextResponse.json(row ?? null);
}

export async function POST(
  request: Request,
  { params }: { params: { gameId: string } }
) {
  try {
    const authClient = await createClient();
    const { data: { user } } = await authClient.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const supabase = createAdminClient();

    const { data: game } = await supabase
      .from('games')
      .select('white_player_id, black_player_id')
      .eq('id', params.gameId)
      .limit(1)
      .maybeSingle();
    if (!game) return NextResponse.json({ error: "Not found" }, { status: 404 });
    if (game.white_player_id !== user.id && game.black_player_id !== user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { evals, accuracy, key_moments, summary } = await request.json();

    const { data: existing } = await supabase
      .from('game_analysis')
      .select('id')
      .eq('game_id', params.gameId)
      .limit(1)
      .maybeSingle();

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

    const analysisPayload = {
      stockfish_evaluations: evals ?? [],
      key_moments: keyMomentsForDb,
      ai_narrative_text: [
        summary ?? "",
        accuracy ? `Точность: белые ${accuracy.white}%, чёрные ${accuracy.black}%` : "",
      ].filter(Boolean).join("\n"),
    };

    if (existing) {
      await supabase
        .from('game_analysis')
        .update(analysisPayload)
        .eq('game_id', params.gameId);
    } else {
      await supabase.from('game_analysis').insert({
        game_id: params.gameId,
        ...analysisPayload,
      });
    }

    await supabase
      .from('games')
      .update({ analysis_status: "done" })
      .eq('id', params.gameId);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Analysis save error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
