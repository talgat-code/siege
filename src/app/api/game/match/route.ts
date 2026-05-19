export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { db, users, games, matchmaking_queue } from "@/lib/db";
import { eq, and, isNull, ne, asc } from "drizzle-orm";
import { TIME_CONTROL_MS } from "@/lib/elo";

// POST — join queue or create game if someone is waiting
export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Не авторизован" }, { status: 401 });

    const { time_control = "rapid", mode = "tournament" } = await request.json();

    if (!["blitz", "rapid", "classical"].includes(time_control)) {
      return NextResponse.json({ error: "Неверный контроль времени" }, { status: 400 });
    }

    // Clean up stale queue entries for this user
    await db.delete(matchmaking_queue).where(
      and(eq(matchmaking_queue.user_id, user.id), isNull(matchmaking_queue.game_id))
    );

    // Look for waiting opponent with same time_control
    const [waiting] = await db
      .select()
      .from(matchmaking_queue)
      .where(
        and(
          eq(matchmaking_queue.time_control, time_control as "blitz" | "rapid" | "classical"),
          eq(matchmaking_queue.mode, mode as "tournament" | "training"),
          isNull(matchmaking_queue.game_id),
          ne(matchmaking_queue.user_id, user.id)
        )
      )
      .orderBy(asc(matchmaking_queue.joined_at))
      .limit(1);

    if (waiting) {
      // Get both players' ratings
      const [whiteUser] = await db.select({ rating: users.rating })
        .from(users).where(eq(users.id, waiting.user_id)).limit(1);
      const [blackUser] = await db.select({ rating: users.rating })
        .from(users).where(eq(users.id, user.id)).limit(1);

      const initialTimeMs = TIME_CONTROL_MS[time_control];

      // Create the game
      const [game] = await db.insert(games).values({
        white_player_id: waiting.user_id,
        black_player_id: user.id,
        time_control: time_control as "blitz" | "rapid" | "classical",
        mode: mode as "tournament" | "training",
        white_time_ms: initialTimeMs,
        black_time_ms: initialTimeMs,
        white_rating_before: whiteUser?.rating ?? 1200,
        black_rating_before: blackUser?.rating ?? 1200,
        analysis_status: "pending",
      }).returning();

      // Mark the waiting player's queue entry as matched
      await db.update(matchmaking_queue)
        .set({ game_id: game.id, color: "white" })
        .where(eq(matchmaking_queue.id, waiting.id));

      // Add current player's queue entry (already matched)
      await db.insert(matchmaking_queue).values({
        user_id: user.id,
        time_control: time_control as "blitz" | "rapid" | "classical",
        mode: mode as "tournament" | "training",
        game_id: game.id,
        color: "black",
      });

      return NextResponse.json({ status: "matched", gameId: game.id, color: "black" });
    }

    // No one waiting — join queue
    const [entry] = await db.insert(matchmaking_queue).values({
      user_id: user.id,
      time_control: time_control as "blitz" | "rapid" | "classical",
      mode: mode as "tournament" | "training",
    }).returning();

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

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Не авторизован" }, { status: 401 });

    const [entry] = await db
      .select()
      .from(matchmaking_queue)
      .where(and(eq(matchmaking_queue.id, queueId), eq(matchmaking_queue.user_id, user.id)))
      .limit(1);

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

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Не авторизован" }, { status: 401 });

    await db.delete(matchmaking_queue).where(
      and(eq(matchmaking_queue.id, queueId), eq(matchmaking_queue.user_id, user.id))
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Queue leave error:", error);
    return NextResponse.json({ error: "Ошибка сервера" }, { status: 500 });
  }
}
