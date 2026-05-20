export const dynamic = "force-dynamic";
import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { DailyQuestsPanel, type QuestProgress } from "@/components/profile/DailyQuestsPanel";
import { assignDailyQuests } from "@/lib/quests/assignDailyQuests";

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
  const authClient = await createClient();
  const { data: { user } } = await authClient.auth.getUser();
  if (!user) redirect("/login");

  const supabase = createAdminClient();

  // Fetch profile — select only stable base columns to avoid crashes on schema drift
  const { data: profileRaw, error: profileError } = await supabase
    .from('users')
    .select('id, username, email, rating, gold_coins, total_games, wins, losses, draws, created_at, faction:factions!faction_id(name, slug, color, lore_description)')
    .eq('id', user.id)
    .limit(1)
    .maybeSingle();

  if (profileError) {
    // Likely schema mismatch — try minimal select as fallback
    const { data: minimal } = await supabase
      .from('users')
      .select('id, username, email, rating, faction_id')
      .eq('id', user.id)
      .limit(1)
      .maybeSingle();
    if (!minimal) redirect("/login");
    // Redirect to avoid partial render — user exists but profile page can't load fully
    redirect("/");
  }

  if (!profileRaw) redirect("/login");

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const factionJoin = profileRaw.faction as any;
  const profile = {
    ...profileRaw,
    faction_name: factionJoin?.name ?? null,
    faction_slug: factionJoin?.slug ?? null,
    faction_color: factionJoin?.color ?? null,
    faction_lore: factionJoin?.lore_description ?? null,
  };

  // Assign today's quests (idempotent — no-op if already assigned)
  await assignDailyQuests(user.id);

  const todayUTC = new Date().toISOString().split("T")[0];

  const [
    { data: recentGames },
    { data: dnaStatsData },
    { data: achievementsData },
    { data: questsData },
  ] = await Promise.all([
    supabase
      .from('games')
      .select('id, white_player_id, black_player_id, result, result_reason, time_control, mode, played_at, white_rating_before, black_rating_before, white_rating_after, black_rating_after')
      .or(`white_player_id.eq.${user.id},black_player_id.eq.${user.id}`)
      .order('played_at', { ascending: false })
      .limit(10),

    supabase
      .from('player_stats')
      .select('*')
      .eq('user_id', user.id)
      .limit(1),

    supabase
      .from('user_achievements')
      .select('unlocked_at, achievement:achievements!achievement_id(slug, name, icon, description)')
      .eq('user_id', user.id)
      .order('unlocked_at', { ascending: false })
      .limit(8),

    supabase
      .from('user_daily_quests')
      .select('id, current_progress, is_completed, reward_claimed, template:daily_quest_templates!quest_template_id(title, description, requirement_value, reward_gold)')
      .eq('user_id', user.id)
      .eq('assigned_date', todayUTC)
      .order('created_at', { ascending: true }),
  ]);

  const dna = dnaStatsData?.[0] ?? null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const unlockedAchievements = (achievementsData ?? []).map((ua: any) => ({
    slug: ua.achievement?.slug,
    name: ua.achievement?.name,
    icon: ua.achievement?.icon,
    description: ua.achievement?.description,
    unlocked_at: ua.unlocked_at,
  }));

  const winRate = profile.total_games > 0
    ? Math.round((profile.wins / profile.total_games) * 100)
    : 0;
  const joinedYear = new Date(profile.created_at).getFullYear();
  const fc = profile.faction_color ?? "#C9A84C";

  // Map DB rows → QuestProgress for the panel
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const dailyQuests: QuestProgress[] = (questsData ?? []).map((q: any) => ({
    id:           q.id,
    title:        q.template?.title        ?? "Задание",
    desc:         q.template?.description  ?? "",
    current:      q.current_progress       ?? 0,
    target:       q.template?.requirement_value ?? 1,
    reward:       q.template?.reward_gold  ?? 0,
    isCompleted:  q.is_completed           ?? false,
    rewardClaimed: q.reward_claimed        ?? false,
  }));

  return (
    <div style={{ background: "#0B0F1A", minHeight: "100vh" }}>
      <div className="mx-auto max-w-4xl px-4 py-10">

        {/* ── Header ───────────────────────────────────────────── */}
        <div className="mb-8 flex items-start gap-6">
          {/* Avatar */}
          <div
            className="flex h-20 w-20 shrink-0 items-center justify-center rounded-xl text-3xl font-black font-cinzel"
            style={{
              backgroundColor: `${fc}18`,
              color: fc,
              border: `1px solid ${fc}40`,
            }}
          >
            {profile.username[0].toUpperCase()}
          </div>

          <div className="flex-1">
            <h1
              className="font-cinzel font-bold"
              style={{ fontSize: "1.6rem", letterSpacing: "0.08em", color: "#EDE8DA" }}
            >
              {profile.username}
            </h1>
            <div className="mt-2 flex flex-wrap items-center gap-3">
              {profile.faction_name && (
                <span
                  className="font-cinzel rounded px-2 py-0.5"
                  style={{
                    fontSize: "0.6rem",
                    letterSpacing: "0.15em",
                    textTransform: "uppercase",
                    color: fc,
                    backgroundColor: `${fc}15`,
                    border: `1px solid ${fc}30`,
                  }}
                >
                  {profile.faction_name}
                </span>
              )}
              {(profile.gold_coins ?? 0) > 0 && (
                <span
                  className="font-cinzel rounded px-2 py-0.5"
                  style={{
                    fontSize: "0.6rem",
                    letterSpacing: "0.12em",
                    color: "#C9A84C",
                    backgroundColor: "rgba(201,168,76,0.1)",
                    border: "1px solid rgba(201,168,76,0.25)",
                  }}
                >
                  {profile.gold_coins} ◈ золота
                </span>
              )}
              <span style={{ fontSize: "0.78rem", color: "#686880" }}>С {joinedYear} года</span>
            </div>
            {profile.faction_lore && (
              <p
                className="font-crimson mt-2 line-clamp-2"
                style={{ fontSize: "0.9rem", color: "#686880", fontStyle: "italic" }}
              >
                {profile.faction_lore}
              </p>
            )}
          </div>

          {/* Rating */}
          <div className="text-right">
            <div
              className="font-cinzel font-black"
              style={{ fontSize: "3.2rem", color: fc, lineHeight: 1 }}
            >
              {profile.rating}
            </div>
            <p
              className="font-cinzel mt-1"
              style={{ fontSize: "0.58rem", letterSpacing: "0.18em", color: "#686880", textTransform: "uppercase" }}
            >
              Рейтинг ELO
            </p>
          </div>
        </div>

        <div className="lunar-rule mb-8" />

        {/* ── Stats grid ───────────────────────────────────────── */}
        <div className="mb-8 grid grid-cols-2 gap-4 sm:grid-cols-4">
          {[
            { label: "Партий", value: profile.total_games, color: "#EDE8DA" },
            { label: "Побед", value: profile.wins, color: "#2A9D6E" },
            { label: "Поражений", value: profile.losses, color: "#E05540" },
            { label: "Ничьих", value: profile.draws, color: "#7BA7C7" },
          ].map((stat) => (
            <div
              key={stat.label}
              className="rounded-xl p-5 text-center"
              style={{ background: "#111827", border: "1px solid rgba(255,255,255,0.06)" }}
            >
              <p
                className="font-cinzel font-bold"
                style={{ fontSize: "2rem", color: stat.color }}
              >
                {stat.value}
              </p>
              <p
                className="font-cinzel mt-1"
                style={{ fontSize: "0.58rem", letterSpacing: "0.15em", color: "#686880", textTransform: "uppercase" }}
              >
                {stat.label}
              </p>
            </div>
          ))}
        </div>

        {/* ── Daily quests ────────────────────────────────────── */}
        <DailyQuestsPanel quests={dailyQuests} />

        {/* ── Win rate bar ────────────────────────────────────── */}
        {profile.total_games > 0 && (
          <div
            className="mb-8 rounded-xl p-5"
            style={{ background: "#111827", border: "1px solid rgba(255,255,255,0.06)" }}
          >
            <div className="mb-3 flex justify-between items-center">
              <span className="font-cinzel" style={{ fontSize: "0.68rem", letterSpacing: "0.15em", color: "#B8B8C8", textTransform: "uppercase" }}>
                Процент побед
              </span>
              <span className="font-cinzel font-bold" style={{ color: "#2A9D6E", fontSize: "0.9rem" }}>
                {winRate}%
              </span>
            </div>
            <div className="flex h-2 overflow-hidden rounded-full" style={{ background: "#1C2333" }}>
              <div
                className="h-full rounded-full transition-all"
                style={{ width: `${winRate}%`, background: `linear-gradient(to right, #2A9D6E, #C9A84C)` }}
              />
            </div>
          </div>
        )}

        {/* ── Chess DNA ───────────────────────────────────────── */}
        {dna && (
          <div
            className="mb-8 rounded-xl p-5"
            style={{ background: "#111827", border: "1px solid rgba(201,168,76,0.12)" }}
          >
            <h2
              className="font-cinzel mb-5 font-bold"
              style={{ fontSize: "0.72rem", letterSpacing: "0.2em", color: "#C9A84C", textTransform: "uppercase" }}
            >
              ◈ Chess DNA
            </h2>

            {dna.dna_description_text && (
              <p
                className="font-crimson mb-5 leading-relaxed"
                style={{ fontSize: "1rem", color: "#B8B8C8", fontStyle: "italic" }}
              >
                {dna.dna_description_text}
              </p>
            )}

            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
              {[
                { label: "Тактика", value: dna.tactical_win_rate, color: "#E05540" },
                { label: "Позиция", value: dna.positional_win_rate, color: "#4A7FA5" },
                { label: "Агрессия", value: dna.aggression_score, color: "#C9A84C" },
              ].map((metric) => (
                <div key={metric.label}>
                  <div className="mb-1 flex justify-between">
                    <span style={{ fontSize: "0.7rem", color: "#B8B8C8" }}>{metric.label}</span>
                    <span style={{ fontSize: "0.7rem", color: metric.color, fontWeight: "bold" }}>
                      {Math.round(metric.value * 100)}%
                    </span>
                  </div>
                  <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "#1C2333" }}>
                    <div
                      className="h-full rounded-full"
                      style={{ width: `${metric.value * 100}%`, background: metric.color }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Achievements ────────────────────────────────────── */}
        {unlockedAchievements.length > 0 && (
          <div
            className="mb-8 rounded-xl p-5"
            style={{ background: "#111827", border: "1px solid rgba(255,255,255,0.06)" }}
          >
            <h2
              className="font-cinzel mb-5 font-bold"
              style={{ fontSize: "0.72rem", letterSpacing: "0.2em", color: "#B8B8C8", textTransform: "uppercase" }}
            >
              Достижения
            </h2>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
              {unlockedAchievements.map((a: any) => (
                <div
                  key={a.slug}
                  className="rounded-lg p-3 text-center"
                  style={{ background: "#1C2333", border: "1px solid rgba(201,168,76,0.1)" }}
                  title={a.description}
                >
                  <div className="mb-1 text-2xl">{a.icon}</div>
                  <p
                    className="font-cinzel"
                    style={{ fontSize: "0.58rem", letterSpacing: "0.08em", color: "#B8B8C8" }}
                  >
                    {a.name}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Recent games ────────────────────────────────────── */}
        <div
          className="rounded-xl overflow-hidden"
          style={{ border: "1px solid rgba(255,255,255,0.06)" }}
        >
          <div
            className="px-5 py-3"
            style={{ background: "#111827", borderBottom: "1px solid rgba(255,255,255,0.06)" }}
          >
            <h2
              className="font-cinzel font-bold"
              style={{ fontSize: "0.72rem", letterSpacing: "0.2em", color: "#B8B8C8", textTransform: "uppercase" }}
            >
              Последние партии
            </h2>
          </div>

          <div style={{ background: "#0B0F1A" }}>
            {(recentGames ?? []).length === 0 ? (
              <div className="py-10 text-center">
                <p style={{ color: "#686880" }}>Партий пока нет.</p>
                <Link
                  href="/play"
                  className="mt-3 inline-block font-cinzel"
                  style={{ fontSize: "0.7rem", letterSpacing: "0.1em", color: "#C9A84C" }}
                >
                  Найти соперника →
                </Link>
              </div>
            ) : (
              <div>
                {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                {(recentGames ?? []).map((game: any, i: number) => {
                  const isWhite = game.white_player_id === user.id;
                  const myResult =
                    game.result === null ? "—" :
                    game.result === "draw" ? "½" :
                    (game.result === "white") === isWhite ? "✓" : "✗";
                  const myResultColor =
                    myResult === "✓" ? "#2A9D6E" :
                    myResult === "✗" ? "#E05540" :
                    myResult === "½" ? "#7BA7C7" : "#686880";

                  const ratingBefore = isWhite ? game.white_rating_before : game.black_rating_before;
                  const ratingAfter = isWhite ? game.white_rating_after : game.black_rating_after;
                  const ratingDelta = ratingAfter != null && ratingBefore != null
                    ? ratingAfter - ratingBefore : null;

                  return (
                    <Link
                      key={game.id}
                      href={`/play/${game.id}`}
                      className="game-history-row flex items-center justify-between px-5 py-3 transition-colors"
                      style={{
                        borderTop: i > 0 ? "1px solid rgba(255,255,255,0.04)" : "none",
                      }}
                    >
                      <div className="flex items-center gap-4">
                        <span
                          className="font-cinzel font-bold w-5 text-center"
                          style={{ fontSize: "1.1rem", color: myResultColor }}
                        >
                          {myResult}
                        </span>
                        <div>
                          <p style={{ fontSize: "0.85rem", color: "#EDE8DA", fontWeight: 500 }}>
                            {game.result ? RESULT_LABELS[game.result] : "В процессе"}
                            {game.result_reason === "resign" && " (сдача)"}
                            {game.result_reason === "timeout" && " (время)"}
                          </p>
                          <p style={{ fontSize: "0.72rem", color: "#686880" }}>
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
                          className="font-cinzel font-bold"
                          style={{
                            fontSize: "0.85rem",
                            color: ratingDelta >= 0 ? "#2A9D6E" : "#E05540",
                          }}
                        >
                          {ratingDelta > 0 ? "+" : ""}{ratingDelta}
                        </span>
                      )}
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
