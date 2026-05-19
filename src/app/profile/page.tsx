export const dynamic = "force-dynamic";
import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { db, users, factions, games } from "@/lib/db";
import { eq, or, desc } from "drizzle-orm";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const RESULT_LABELS: Record<string, string> = {
  white: "Победа белых",
  black: "Победа чёрных",
  draw: "Ничья",
};

const TIME_CONTROL_LABELS: Record<string, string> = {
  blitz: "⚡ Блиц",
  rapid: "🏃 Рапид",
  classical: "🏛️ Классика",
};

export default async function ProfilePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [profile] = await db
    .select({
      id: users.id,
      username: users.username,
      email: users.email,
      rating: users.rating,
      total_games: users.total_games,
      wins: users.wins,
      losses: users.losses,
      draws: users.draws,
      created_at: users.created_at,
      faction_name: factions.name,
      faction_slug: factions.slug,
      faction_color: factions.color,
      faction_lore: factions.lore_description,
    })
    .from(users)
    .leftJoin(factions, eq(users.faction_id, factions.id))
    .where(eq(users.id, user.id))
    .limit(1);

  if (!profile) redirect("/login");

  // Fetch recent games (last 10)
  const recentGames = await db
    .select({
      id: games.id,
      white_player_id: games.white_player_id,
      black_player_id: games.black_player_id,
      result: games.result,
      result_reason: games.result_reason,
      time_control: games.time_control,
      mode: games.mode,
      played_at: games.played_at,
      white_rating_before: games.white_rating_before,
      black_rating_before: games.black_rating_before,
      white_rating_after: games.white_rating_after,
      black_rating_after: games.black_rating_after,
    })
    .from(games)
    .where(or(eq(games.white_player_id, user.id), eq(games.black_player_id, user.id)))
    .orderBy(desc(games.played_at))
    .limit(10);

  const winRate = profile.total_games > 0
    ? Math.round((profile.wins / profile.total_games) * 100)
    : 0;

  const joinedYear = new Date(profile.created_at).getFullYear();

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      {/* Header */}
      <div className="mb-8 flex items-start gap-6">
        {/* Avatar */}
        <div
          className="flex h-20 w-20 shrink-0 items-center justify-center rounded-2xl text-3xl font-black"
          style={{
            backgroundColor: `${profile.faction_color ?? "#888"}22`,
            color: profile.faction_color ?? "#888",
            border: `2px solid ${profile.faction_color ?? "#888"}44`,
          }}
        >
          {profile.username[0].toUpperCase()}
        </div>

        <div className="flex-1">
          <h1 className="text-3xl font-bold">{profile.username}</h1>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            {profile.faction_name && (
              <Badge
                className="text-xs"
                style={{
                  backgroundColor: `${profile.faction_color}22`,
                  color: profile.faction_color ?? undefined,
                  borderColor: `${profile.faction_color}44`,
                }}
              >
                {profile.faction_name}
              </Badge>
            )}
            <span className="text-sm text-muted-foreground">С {joinedYear} года</span>
          </div>
          {profile.faction_lore && (
            <p className="mt-2 text-sm text-muted-foreground line-clamp-2">
              {profile.faction_lore}
            </p>
          )}
        </div>

        {/* Rating */}
        <div className="text-right">
          <div
            className="text-5xl font-black"
            style={{ color: profile.faction_color ?? "hsl(var(--primary))" }}
          >
            {profile.rating}
          </div>
          <p className="text-sm text-muted-foreground">Рейтинг ELO</p>
        </div>
      </div>

      {/* Stats */}
      <div className="mb-8 grid grid-cols-2 gap-4 sm:grid-cols-4">
        {[
          { label: "Партий", value: profile.total_games },
          { label: "Побед", value: profile.wins, color: "text-green-400" },
          { label: "Поражений", value: profile.losses, color: "text-destructive" },
          { label: "Ничьих", value: profile.draws, color: "text-yellow-400" },
        ].map((stat) => (
          <Card key={stat.label}>
            <CardContent className="pt-6 text-center">
              <p className={`text-3xl font-bold ${stat.color ?? ""}`}>{stat.value}</p>
              <p className="mt-1 text-sm text-muted-foreground">{stat.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Win rate bar */}
      {profile.total_games > 0 && (
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="text-base">Процент побед</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-3">
              <div className="flex h-3 flex-1 overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-green-500 transition-all"
                  style={{ width: `${winRate}%` }}
                />
              </div>
              <span className="text-sm font-bold">{winRate}%</span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recent games */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Последние партии</CardTitle>
        </CardHeader>
        <CardContent>
          {recentGames.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground">
              <p>Партий пока нет.</p>
              <Link href="/play" className="mt-2 inline-block text-sm text-primary hover:underline">
                Найти соперника →
              </Link>
            </div>
          ) : (
            <div className="space-y-2">
              {recentGames.map((game) => {
                const isWhite = game.white_player_id === user.id;
                const myResult =
                  game.result === null ? "—" :
                  game.result === "draw" ? "½" :
                  (game.result === "white") === isWhite ? "✓" : "✗";
                const myResultClass =
                  myResult === "✓" ? "text-green-400" :
                  myResult === "✗" ? "text-destructive" :
                  myResult === "½" ? "text-yellow-400" : "text-muted-foreground";

                const ratingBefore = isWhite ? game.white_rating_before : game.black_rating_before;
                const ratingAfter = isWhite ? game.white_rating_after : game.black_rating_after;
                const ratingDelta = ratingAfter != null && ratingBefore != null
                  ? ratingAfter - ratingBefore
                  : null;

                return (
                  <Link
                    key={game.id}
                    href={`/play/${game.id}`}
                    className="flex items-center justify-between rounded-lg border border-border p-3 hover:bg-accent/50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <span className={`text-xl font-bold w-6 text-center ${myResultClass}`}>
                        {myResult}
                      </span>
                      <div>
                        <p className="text-sm font-medium">
                          {game.result ? RESULT_LABELS[game.result] : "В процессе"}
                          {game.result_reason === "resign" && " (сдача)"}
                          {game.result_reason === "timeout" && " (время)"}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {TIME_CONTROL_LABELS[game.time_control] ?? game.time_control}
                          {" · "}
                          {game.mode === "tournament" ? "Рейтинговая" : "Тренировка"}
                          {" · "}
                          {new Date(game.played_at).toLocaleDateString("ru-RU")}
                        </p>
                      </div>
                    </div>
                    {ratingDelta !== null && game.mode === "tournament" && (
                      <span
                        className={`text-sm font-bold ${ratingDelta >= 0 ? "text-green-400" : "text-destructive"}`}
                      >
                        {ratingDelta > 0 ? "+" : ""}{ratingDelta}
                      </span>
                    )}
                  </Link>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
