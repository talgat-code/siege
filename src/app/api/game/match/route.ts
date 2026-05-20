export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { TIME_CONTROL_MS } from "@/lib/elo";

// POST — join queue or create game if someone is waiting
export async function POST(request: Request) {
  try {
    const authClient = await createClient();
    const { data: { user } } = await authClient.auth.getUser();
    if (!user) return NextResponse.json({ error: "Не авторизован" }, { status: 401 });

    const { time_control = "rapid", mode = "tournament" } = await request.json();

    if (!["blitz", "rapid", "classical"].includes(time_control)) {
      return NextResponse.json({ error: "Неверный контроль времени" }, { status: 400 });
    }

    const supabase = createAdminClient();

    // Clean up stale queue entries for this user
    await supabase
      .from('matchmaking_queue')
      .delete()
      .eq('user_id', user.id)
      .is('game_id', null);

    // Look for waiting opponent with same time_control
    const { data: waitingList } = await supabase
      .from('matchmaking_queue')
      .select('*')
      .eq('time_control', time_control)
      .eq('mode', mode)
      .is('game_id', null)
      .neq('user_id', user.id)
      .order('joined_at', { ascending: true })
      .limit(1);

    const waiting = waitingList?.[0] ?? null;

    if (waiting) {
      // Get both players' ratings
      const [{ data: whiteUserData }, { data: blackUserData }] = await Promise.all([
        supabase.from('users').select('rating').eq('id', waiting.user_id).limit(1).maybeSingle(),
        supabase.from('users').select('rating').eq('id', user.id).limit(1).maybeSingle(),
      ]);

      const initialTimeMs = TIME_CONTROL_MS[time_control as keyof typeof TIME_CONTROL_MS];

      // Create the game
      const { data: gameList } = await supabase.from('games').insert({
        white_player_id: waiting.user_id,
        black_player_id: user.id,
        time_control,
        mode,
        white_time_ms: initialTimeMs,
        black_time_ms: initialTimeMs,
        white_rating_before: whiteUserData?.rating ?? 1200,
        black_rating_before: blackUserData?.rating ?? 1200,
        analysis_status: "pending",
      }).select('id');

      const game = gameList?.[0];
      if (!game) throw new Error("Failed to create game");

      // Mark the waiting player's queue entry as matched
      await supabase
        .from('matchmaking_queue')
        .update({ game_id: game.id, color: "white" })
        .eq('id', waiting.id);

      // Add current player's queue entry (already matched)
      await supabase.from('matchmaking_queue').insert({
        user_id: user.id,
        time_control,
        mode,
        game_id: game.id,
        color: "black",
      });

      return NextResponse.json({ status: "matched", gameId: game.id, color: "black" });
    }

    // No one waiting — join queue
    const { data: entryList } = await supabase.from('matchmaking_queue').insert({
      user_id: user.id,
      time_control,
      mode,
    }).select('id');

    const entry = entryList?.[0];
    if (!entry) throw new Error("Failed to join queue");

    return NextResponse.json({ status: "waiting", queueId: entry.id });
  } catch (error) {
    console.error("Match error:", error);
    return NextResponse.json({ error: "Ошибка сервера" }, { status: 500 });
  }
}

// GET — poll queue entry for match result
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const queueId = searchParams.get("queueId");
    if (!queueId) return NextResponse.json({ error: "queueId required" }, { status: 400 });

    const authClient = await createClient();
    const { data: { user } } = await authClient.auth.getUser();
    if (!user) return NextResponse.json({ error: "Не авторизован" }, { status: 401 });

    const supabase = createAdminClient();

    const { data: entry } = await supabase
      .from('matchmaking_queue')
      .select('*')
      .eq('id', queueId)
      .eq('user_id', user.id)
      .limit(1)
      .maybeSingle();

    if (!entry) return NextResponse.json({ error: "Запись не найдена" }, { status: 404 });

    if (entry.game_id) {
      return NextResponse.json({
        status: "matched",
        gameId: entry.game_id,
        color: entry.color,
      });
    }

    return NextResponse.json({ status: "waiting" });
  } catch (error) {
    console.error("Queue poll error:", error);
    return NextResponse.json({ error: "Ошибка сервера" }, { status: 500 });
  }
}

// DELETE — leave queue
export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const queueId = searchParams.get("queueId");
    if (!queueId) return NextResponse.json({ error: "queueId required" }, { status: 400 });

    const authClient = await createClient();
    const { data: { user } } = await authClient.auth.getUser();
    if (!user) return NextResponse.json({ error: "Не авторизован" }, { status: 401 });

    const supabase = createAdminClient();

    await supabase
      .from('matchmaking_queue')
      .delete()
      .eq('id', queueId)
      .eq('user_id', user.id);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Queue leave error:", error);
    return NextResponse.json({ error: "Ошибка сервера" }, { status: 500 });
  }
}
