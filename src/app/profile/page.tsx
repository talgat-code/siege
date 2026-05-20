export const dynamic = "force-dynamic";
import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { DailyQuestsPanel, type QuestProgress } from "@/components/profile/DailyQuestsPanel";
import { AchievementCard } from "@/components/profile/AchievementCard";
import { assignDailyQuests } from "@/lib/quests/assignDailyQuests";

function streakDays(n: number): string {
  const mod10  = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return "день";
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) return "дня";
  return "дней";
}

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
    .select('id, username, email, rating, gold_coins, faction_id, total_games, wins, losses, draws, created_at, faction:factions!faction_id(name, slug, color, lore_description)')
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
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const factionId: string | null = (profileRaw as any).faction_id ?? null;
  const profile = {
    ...profileRaw,
    faction_id:   factionId,
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
    { data: allAchievements },
    { data: questsData },
    { data: streakData },
    { data: unlockedAchData },
    { data: factionRanksData },
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
      .from('achievements')
      .select('id, slug, name, description, icon, reward_gold, category')
      .eq('is_hidden', false)
      .order('category')
      .order('name'),

    supabase
      .from('user_daily_quests')
      .select('id, current_progress, is_completed, reward_claimed, template:daily_quest_templates!quest_template_id(title, description, requirement_value, reward_gold)')
      .eq('user_id', user.id)
      .eq('assigned_date', todayUTC)
      .order('created_at', { ascending: true }),

    supabase
      .from('user_streaks')
      .select('current_streak, longest_streak')
      .eq('user_id', user.id)
      .maybeSingle(),

    supabase
      .from('user_achievements')
      .select('achievement_id')
      .eq('user_id', user.id),

    factionId
      ? supabase
          .from('faction_ranks')
          .select('tier, title, min_wins, icon, color')
          .eq('faction_id', factionId)
          .order('tier', { ascending: true })
      : Promise.resolve({ data: [] as { tier: number; title: string; min_wins: number; icon: string; color: string }[] }),
  ]);

  const dna = dnaStatsData?.[0] ?? null;

  // Unlocked achievement ID set
  const unlockedIds = new Set((unlockedAchData ?? []).map((ua) => (ua as { achievement_id: string }).achievement_id));

  // Faction rank calculation
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let currentRank: any = null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let nextRank:    any = null;
  let progressPct  = 0;
  let winsToNext   = 0;

  const ranks = factionRanksData ?? [];
  if (ranks.length > 0) {
    const wins = profile.wins ?? 0;
    currentRank = ranks[0];
    for (let i = 0; i < ranks.length; i++) {
      if (wins >= ranks[i].min_wins) {
        currentRank = ranks[i];
        nextRank    = ranks[i + 1] ?? null;
      }
    }
    if (nextRank) {
      winsToNext   = Math.max(0, nextRank.min_wins - wins);
      const range  = nextRank.min_wins - (currentRank?.min_wins ?? 0);
      progressPct  = range > 0 ? Math.min(100, Math.round(((wins - (currentRank?.min_wins ?? 0)) / range) * 100)) : 100;
    } else {
      progressPct = 100;
    }
  }

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
            <div className="flex flex-wrap items-center gap-3">
              <h1
                className="font-cinzel font-bold"
                style={{ fontSize: "1.6rem", letterSpacing: "0.08em", color: "#EDE8DA" }}
              >
                {profile.username}
              </h1>
              {streakData && streakData.current_streak > 0 && (
                <span
                  className={streakData.current_streak >= 3 ? "streak-badge-pulse" : ""}
                  style={{
                    display:         "inline-flex",
                    alignItems:      "center",
                    gap:             "4px",
                    fontSize:        "0.75rem",
                    fontWeight:      500,
                    color:           "#D97706",
                    backgroundColor: "rgba(217,119,6,0.15)",
                    border:          "1px solid rgba(217,119,6,0.4)",
                    borderRadius:    "12px",
                    padding:         "4px 10px",
                    whiteSpace:      "nowrap",
                  }}
                >
                  🔥 {streakData.current_streak} {streakDays(streakData.current_streak)} подряд
                </span>
              )}
            </div>
            {/* Rank + Faction line */}
            {profile.faction_name && (
              <div className="mt-1.5 flex flex-wrap items-center gap-2">
                {currentRank && (
                  <span style={{ fontSize: "0.82rem", color: currentRank.color ?? fc }}>
                    {currentRank.icon}
                  </span>
                )}
                <span
                  className="font-cinzel"
                  style={{ fontSize: "0.72rem", letterSpacing: "0.06em", color: currentRank?.color ?? fc, fontWeight: 600 }}
                >
                  {currentRank?.title ?? profile.faction_name}
                </span>
                <span style={{ fontSize: "0.65rem", color: "#686880" }}>•</span>
                <span
                  className="font-cinzel"
                  style={{ fontSize: "0.65rem", letterSpacing: "0.1em", color: `${fc}cc`, textTransform: "uppercase" }}
                >
                  {profile.faction_name}
                </span>
              </div>
            )}

            {/* Gold + Year */}
            <div className="mt-2 flex flex-wrap items-center gap-3">
              {(profile.gold_coins ?? 0) >= 0 && (
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
                  {profile.gold_coins ?? 0} ◈ золота
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

        {/* ── Progression block ───────────────────────────────── */}
        {currentRank && (
          <div
            className="mb-8 rounded-xl p-5"
            style={{ background: "#111827", border: "1px solid rgba(201,168,76,0.12)" }}
          >
            <h2
              className="font-cinzel font-bold mb-4"
              style={{ fontSize: "0.72rem", letterSpacing: "0.2em", color: "#C9A84C", textTransform: "uppercase" }}
            >
              ◈ Прогресс фракции
            </h2>

            {nextRank ? (
              <>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span style={{ fontSize: "0.75rem", color: currentRank.color }}>{currentRank.icon}</span>
                    <span className="font-cinzel" style={{ fontSize: "0.72rem", color: "#B8B8C8" }}>
                      {currentRank.title}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-cinzel" style={{ fontSize: "0.65rem", color: "#686880" }}>
                      до {nextRank.title}: {winsToNext} побед
                    </span>
                    <span style={{ fontSize: "0.75rem", color: nextRank.color }}>{nextRank.icon}</span>
                    <span className="font-cinzel" style={{ fontSize: "0.72rem", color: "#686880" }}>
                      {nextRank.title}
                    </span>
                  </div>
                </div>
                <div className="h-2 rounded-full overflow-hidden" style={{ background: "#1C2333" }}>
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${progressPct}%`,
                      background: `linear-gradient(to right, ${currentRank.color}80, ${currentRank.color})`,
                    }}
                  />
                </div>
                <p style={{ fontSize: "0.62rem", color: "#686880", marginTop: "6px", textAlign: "right" }}>
                  {profile.wins} / {nextRank.min_wins} побед
                </p>
              </>
            ) : (
              <div className="flex items-center gap-3">
                <span style={{ fontSize: "1.4rem" }}>🔥</span>
                <div>
                  <p className="font-cinzel font-bold" style={{ fontSize: "0.82rem", color: "#C9A84C" }}>
                    {currentRank.title}
                  </p>
                  <p style={{ fontSize: "0.7rem", color: "#686880" }}>Максимальный ранг достигнут</p>
                </div>
              </div>
            )}

            {/* Battle Pass placeholder */}
            <div
              className="mt-4 flex items-center justify-between rounded-lg px-4 py-3"
              style={{ background: "#1C2333", border: "1px solid rgba(255,255,255,0.06)" }}
            >
              <div>
                <p className="font-cinzel" style={{ fontSize: "0.65rem", letterSpacing: "0.1em", color: "#686880" }}>
                  СКОРО
                </p>
                <p className="font-cinzel font-bold" style={{ fontSize: "0.72rem", color: "#B8B8C8" }}>
                  Боевой Пропуск
                </p>
              </div>
              <a
                href="/shop"
                className="font-cinzel rounded px-3 py-1.5"
                style={{
                  fontSize: "0.6rem",
                  letterSpacing: "0.08em",
                  color: "#C9A84C",
                  border: "1px solid rgba(201,168,76,0.3)",
                  background: "rgba(201,168,76,0.06)",
                  textDecoration: "none",
                }}
              >
                Узнать больше
              </a>
            </div>
          </div>
        )}

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
        {(allAchievements ?? []).length > 0 && (
          <div
            className="mb-8 rounded-xl p-5"
            style={{ background: "#111827", border: "1px solid rgba(255,255,255,0.06)" }}
          >
            <div className="flex items-center justify-between mb-5">
              <h2
                className="font-cinzel font-bold"
                style={{ fontSize: "0.72rem", letterSpacing: "0.2em", color: "#B8B8C8", textTransform: "uppercase" }}
              >
                Достижения
              </h2>
              <span style={{ fontSize: "0.65rem", color: "#686880" }}>
                {unlockedIds.size} / {(allAchievements ?? []).length}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
              {(allAchievements ?? []).map((a: any) => (
                <AchievementCard
                  key={a.id}
                  icon={a.icon ?? "🏆"}
                  name={a.name}
                  description={a.description}
                  rewardGold={a.reward_gold ?? 0}
                  unlocked={unlockedIds.has(a.id)}
                />
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
