export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";

const MIGRATION_SQL = `
-- 1. Add category to achievements
ALTER TABLE achievements ADD COLUMN IF NOT EXISTS category TEXT NOT NULL DEFAULT 'general';

-- 2. Unique constraint on user_achievements
ALTER TABLE user_achievements DROP CONSTRAINT IF EXISTS user_achievements_user_achievement_unique;
ALTER TABLE user_achievements ADD CONSTRAINT user_achievements_user_achievement_unique UNIQUE (user_id, achievement_id);

-- 3. daily_quest_templates
CREATE TABLE IF NOT EXISTS daily_quest_templates (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug                  TEXT NOT NULL UNIQUE,
  title                 TEXT NOT NULL,
  description           TEXT NOT NULL,
  difficulty            TEXT NOT NULL CHECK (difficulty IN ('easy','medium','hard')),
  requirement_type      TEXT NOT NULL,
  requirement_value     INTEGER NOT NULL DEFAULT 1,
  reward_gold           INTEGER NOT NULL DEFAULT 0,
  reward_faction_points INTEGER NOT NULL DEFAULT 0,
  reward_pass_xp        INTEGER NOT NULL DEFAULT 0,
  is_active             BOOLEAN NOT NULL DEFAULT true
);

-- 4. user_daily_quests
CREATE TABLE IF NOT EXISTS user_daily_quests (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  quest_template_id UUID NOT NULL REFERENCES daily_quest_templates(id),
  assigned_date     DATE NOT NULL,
  current_progress  INTEGER NOT NULL DEFAULT 0,
  is_completed      BOOLEAN NOT NULL DEFAULT false,
  completed_at      TIMESTAMPTZ,
  reward_claimed    BOOLEAN NOT NULL DEFAULT false,
  reward_claimed_at TIMESTAMPTZ,
  UNIQUE (user_id, quest_template_id, assigned_date)
);

-- 5. user_streaks
CREATE TABLE IF NOT EXISTS user_streaks (
  user_id           UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  current_streak    INTEGER NOT NULL DEFAULT 0,
  longest_streak    INTEGER NOT NULL DEFAULT 0,
  last_active_date  DATE,
  total_active_days INTEGER NOT NULL DEFAULT 0,
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 6. faction_ranks
CREATE TABLE IF NOT EXISTS faction_ranks (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  faction_id UUID NOT NULL REFERENCES factions(id) ON DELETE CASCADE,
  tier       INTEGER NOT NULL,
  title      TEXT NOT NULL,
  min_wins   INTEGER NOT NULL DEFAULT 0,
  icon       TEXT NOT NULL DEFAULT '⚔',
  color      TEXT NOT NULL DEFAULT '#C9A84C',
  UNIQUE (faction_id, tier)
);

-- 7. gold_transactions
CREATE TABLE IF NOT EXISTS gold_transactions (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  amount        INTEGER NOT NULL,
  source        TEXT NOT NULL,
  reference_id  TEXT,
  balance_after INTEGER NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── SEEDS ──────────────────────────────────────────────

-- Quest templates
INSERT INTO daily_quest_templates
  (slug, title, description, difficulty, requirement_type, requirement_value, reward_gold, reward_faction_points, reward_pass_xp)
VALUES
  ('play_one_game',     'Первый ход',         'Сыграй одну партию — любую, любым результатом', 'easy',   'play_games',          1, 20,  0, 10),
  ('make_30_moves',     'Терпение',           'Сделай суммарно 30 ходов за день',               'easy',   'make_moves',         30, 20,  0, 10),
  ('visit_war_map',     'Разведка',           'Открой страницу Войны',                           'easy',   'visit_war',           1, 20,  0, 10),
  ('play_vs_ai',        'Тренировочный бой',  'Сыграй одну партию против ИИ',                   'easy',   'play_vs_ai',          1, 20,  0, 10),
  ('win_one_game',      'Первая кровь',       'Победи в одной партии',                           'medium', 'win_games',           1, 50, 10, 25),
  ('play_three_games',  'Боевое дежурство',   'Сыграй 3 партии за день',                         'medium', 'play_games',          3, 50, 10, 25),
  ('win_vs_other_fac',  'Врагу не сдаётся',  'Победи игрока другой фракции',                    'medium', 'win_vs_other_faction', 1, 50, 10, 25),
  ('win_vs_ai_amateur', 'Превзойти Солдата',  'Победи ИИ уровня Солдат или выше',               'medium', 'win_vs_ai_min_skill',  5, 50, 10, 25),
  ('play_full_game',    'До конца',           'Сыграй партию длиной 30+ ходов',                  'medium', 'play_long_game',      30, 50, 10, 25),
  ('win_two_ranked',    'Завоеватель',        'Выиграй 2 рейтинговые партии за день',             'hard',   'win_ranked',           2,100, 25, 50),
  ('win_vs_ai_veteran', 'Превзойти Ветерана', 'Победи ИИ уровня Ветеран или выше',               'hard',   'win_vs_ai_min_skill', 10,100, 25, 50),
  ('win_in_war_week',   'Воин Войны Недели',  'Победи в партии за активный фронт недели',        'hard',   'win_war_week',          1,100, 25, 50)
ON CONFLICT (slug) DO NOTHING;

-- Faction ranks
INSERT INTO faction_ranks (faction_id, tier, title, min_wins, icon, color)
SELECT f.id, v.tier, v.title, v.min_wins, v.icon, v.color
FROM factions f
JOIN (VALUES
  ('northern-horde', 1, 'Воин',        0,   '⚔', '#C97C2A'),
  ('northern-horde', 2, 'Сотник',      5,   '⚔', '#C97C2A'),
  ('northern-horde', 3, 'Тысячник',    20,  '🛡', '#A05A15'),
  ('northern-horde', 4, 'Хан',         50,  '👑', '#C9A84C'),
  ('northern-horde', 5, 'Великий Хан', 100, '🔥', '#FF6B2B'),
  ('iron-empire',    1, 'Легионер',    0,   '⚔', '#7A8FA6'),
  ('iron-empire',    2, 'Центурион',   5,   '⚔', '#7A8FA6'),
  ('iron-empire',    3, 'Трибун',      20,  '🛡', '#5A7090'),
  ('iron-empire',    4, 'Генерал',     50,  '👑', '#C9A84C'),
  ('iron-empire',    5, 'Архистратиг', 100, '🔥', '#FF6B2B'),
  ('sea-republic',   1, 'Юнга',        0,   '⚓', '#3D8B9E'),
  ('sea-republic',   2, 'Матрос',      5,   '⚓', '#3D8B9E'),
  ('sea-republic',   3, 'Боцман',      20,  '🛡', '#2A6B7E'),
  ('sea-republic',   4, 'Капитан',     50,  '👑', '#C9A84C'),
  ('sea-republic',   5, 'Адмирал',     100, '🔥', '#FF6B2B'),
  ('shadow-guild',   1, 'Послушник',   0,   '👁', '#8B5CF6'),
  ('shadow-guild',   2, 'Шёпот',       5,   '👁', '#8B5CF6'),
  ('shadow-guild',   3, 'Палач',       20,  '🛡', '#6D42C7'),
  ('shadow-guild',   4, 'Архонт',      50,  '👑', '#C9A84C'),
  ('shadow-guild',   5, 'Безымянный',  100, '🔥', '#FF6B2B')
) AS v(slug, tier, title, min_wins, icon, color) ON (f.slug = v.slug)
ON CONFLICT (faction_id, tier) DO NOTHING;

-- Achievements (16)
INSERT INTO achievements (slug, name, description, icon, requirement_type, requirement_value, reward_gold, is_hidden, category)
VALUES
  ('first_win',       'Первая победа',       'Одержи свою первую победу',               '🏆', 'wins',         1,    50, false, 'matches'),
  ('win_streak_5',    'Пять подряд',         'Выиграй 5 партий подряд',                 '⚡', 'streak',        5,   100, false, 'matches'),
  ('dedicated_3',     'Преданный',           'Играй 3 дня подряд',                      '🔥', 'streak',        3,    50, false, 'streak'),
  ('dedicated_7',     'Неделя славы',        'Играй 7 дней подряд',                     '🔥', 'streak',        7,   200, false, 'streak'),
  ('dedicated_30',    'Месяц войны',         'Играй 30 дней подряд',                    '🔥', 'streak',       30,  1000, false, 'streak'),
  ('rank_warrior',    'Воин',                'Достигни 2-го ранга своей фракции',        '⚔', 'wins',          5,   100, false, 'faction'),
  ('rank_officer',    'Офицер',              'Достигни 3-го ранга своей фракции',        '🛡', 'wins',         20,   250, false, 'faction'),
  ('rank_general',    'Полководец',          'Достигни 4-го ранга своей фракции',        '👑', 'wins',         50,   500, false, 'faction'),
  ('rank_legend',     'Легенда',             'Достигни максимального ранга фракции',     '🔥', 'wins',        100,  1000, false, 'faction'),
  ('beat_ai_amateur', 'Превзойти Солдата',   'Победи ИИ уровня Солдат',                 '🤖', 'faction_wins',  1,    50, false, 'matches'),
  ('beat_ai_veteran', 'Превзойти Ветерана',  'Победи ИИ уровня Ветеран',                '🤖', 'faction_wins',  2,   100, false, 'matches'),
  ('beat_ai_master',  'Превзойти Мастера',   'Победи ИИ уровня Полководец',             '🤖', 'faction_wins',  3,   250, false, 'matches'),
  ('beat_ai_legend',  'Превзойти Легенду',   'Победи ИИ уровня Гроссмейстер',           '🤖', 'faction_wins',  4,   700, false, 'matches'),
  ('war_winner',      'Завоеватель',         'Победи в партии Войны Недели',             '⚔', 'faction_wins',  1,   200, false, 'faction'),
  ('daily_quester',   'Дисциплина',          'Выполни 7 daily quests за неделю',         '📋', 'games',         7,   200, false, 'streak'),
  ('gold_hoarder',    'Скряга',              'Накопи 1000 золота',                       '💰', 'rating',     1000,   100, true,  'special')
ON CONFLICT (slug) DO NOTHING;
`;

export async function POST(request: Request) {
  const auth = request.headers.get("authorization");
  if (!process.env.CRON_SECRET || auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = process.env.DATABASE_URL!;
  const isProd = process.env.NODE_ENV === "production";
  const ssl = isProd ? { rejectUnauthorized: false } : false;

  let connectionConfig: object;
  if (url.includes("[") && url.includes("]:")) {
    const match = url.match(/postgresql:\/\/([^:]+):([^@]+)@\[([^\]]+)\]:(\d+)\/(.+)/);
    if (match) {
      const [, user, password, host, port, database] = match;
      connectionConfig = { user, password, host, port: Number(port), database, ssl };
    } else {
      connectionConfig = { connectionString: url, ssl };
    }
  } else {
    connectionConfig = { connectionString: url, ssl };
  }

  const { Pool } = await import("pg");
  const pool = new Pool(connectionConfig as object);

  try {
    await pool.query(MIGRATION_SQL);
    await pool.end();
    return NextResponse.json({ success: true, message: "Migration applied" });
  } catch (error) {
    console.error("Migration error:", error);
    await pool.end().catch(() => {});
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
