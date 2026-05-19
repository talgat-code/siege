export const dynamic = "force-dynamic";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { db, games, users, factions } from "@/lib/db";
import { eq } from "drizzle-orm";
import { OnlineChessBoard } from "@/components/chess/OnlineChessBoard";
import { AnalysisPanel } from "@/components/chess/AnalysisPanel";
import { Badge } from "@/components/ui/badge";

const TIME_CONTROL_LABELS: Record<string, string> = {
  blitz: "Блиц 5+0",
  rapid: "Рапид 10+0",
  classical: "Классика 30+0",
};

const MODE_LABELS: Record<string, string> = {
  tournament: "Турнирная",
  training: "Тренировочная",
};

export default async function GameRoomPage({
  params,
}: {
  params: { gameId: string };
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [game] = await db.select().from(games).where(eq(games.id, params.gameId)).limit(1);
  if (!game) notFound();

  // Check user is a player
  const isWhite = game.white_player_id === user.id;
  const isBlack = game.black_player_id === user.id;
  if (!isWhite && !isBlack) redirect("/play");

  const myColor = isWhite ? "white" : "black";

  // Fetch player profiles
  const [whiteProfile] = await db
    .select({ username: users.username, faction_color: factions.color })
    .from(users)
    .leftJoin(factions, eq(users.faction_id, factions.id))
    .where(eq(users.id, game.white_player_id))
    .limit(1);

  const [blackProfile] = await db
    .select({ username: users.username, faction_color: factions.color })
    .from(users)
    .leftJoin(factions, eq(users.faction_id, factions.id))
    .where(eq(users.id, game.black_player_id))
    .limit(1);

  const myUsername = myColor === "white"
    ? (whiteProfile?.username ?? "Игрок 1")
    : (blackProfile?.username ?? "Игрок 2");
  const opponentUsername = myColor === "white"
    ? (blackProfile?.username ?? "Соперник")
    : (whiteProfile?.username ?? "Соперник");
  const myFactionColor = myColor === "white"
    ? whiteProfile?.faction_color ?? undefined
    : blackProfile?.faction_color ?? undefined;

  const initialData = {
    pgn: game.pgn,
    time_control: game.time_control,
    mode: game.mode,
    white_time_ms: game.white_time_ms,
    black_time_ms: game.black_time_ms,
    white_player_id: game.white_player_id,
    black_player_id: game.black_player_id,
    result: game.result ?? null,
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-6">
      {/* Header */}
      <div className="mb-5 flex items-center gap-3">
        <h1 className="text-lg font-bold">Партия</h1>
        <Badge variant="secondary">{TIME_CONTROL_LABELS[game.time_control]}</Badge>
        <Badge variant={game.mode === "tournament" ? "default" : "secondary"}>
          {MODE_LABELS[game.mode]}
        </Badge>
      </div>

      <div className="flex gap-8">
        <OnlineChessBoard
          gameId={params.gameId}
          myColor={myColor}
          myUsername={myUsername}
          opponentUsername={opponentUsername}
          myFactionColor={myFactionColor ?? undefined}
          initialData={initialData}
        />

        {/* Side info */}
        <div className="hidden flex-1 lg:block space-y-4">
          <div className="rounded-xl border bg-card p-4">
            <h3 className="mb-3 text-sm font-semibold text-muted-foreground uppercase tracking-wide">
              Игроки
            </h3>
            <div className="space-y-3">
              {[
                { label: "Белые", username: whiteProfile?.username, color: whiteProfile?.faction_color },
                { label: "Чёрные", username: blackProfile?.username, color: blackProfile?.faction_color },
              ].map((p) => (
                <div key={p.label} className="flex items-center gap-2">
                  <div
                    className="h-2 w-2 rounded-full"
                    style={{ backgroundColor: p.color ?? "#888" }}
                  />
                  <span className="text-sm">
                    <span className="text-muted-foreground">{p.label}: </span>
                    <span className="font-medium">{p.username ?? "—"}</span>
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-xl border bg-card p-4">
            <h3 className="mb-2 text-sm font-semibold text-muted-foreground uppercase tracking-wide">
              Контроль времени
            </h3>
            <p className="text-sm">{TIME_CONTROL_LABELS[game.time_control]}</p>
            <p className="mt-1 text-xs text-muted-foreground">
              {MODE_LABELS[game.mode]} партия
            </p>
          </div>

          {/* Analysis panel — only for finished games with PGN */}
          {game.result && game.pgn && (
            <div className="rounded-xl border bg-card p-4">
              <h3 className="mb-3 text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                Анализ партии
              </h3>
              <AnalysisPanel pgn={game.pgn} gameId={params.gameId} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
