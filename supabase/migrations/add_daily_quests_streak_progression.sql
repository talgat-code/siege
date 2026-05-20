-- ═══════════════════════════════════════════════════════════════════════
-- SIEGE — Daily Quests / Streak / Faction Progression
--
-- КАК НАКАТИТЬ:
--   Supabase Dashboard → SQL Editor → New query → вставить всё → Run
--
-- ЧТО ДЕЛАЕТ:
--   1. Добавляет колонку category в существующую таблицу achievements
--   2. Добавляет UNIQUE constraint на user_achievements(user_id, achievement_id)
--   3. Создаёт 5 новых таблиц: daily_quest_templates, user_daily_quests,
--      user_streaks, faction_ranks, gold_transactions
--   4. Настраивает RLS policies на новые таблицы
--   5. Наполняет справочники: 12 quest templates, 20 faction ranks,
--      9 новых achievements (quest/streak/faction система)
--
-- НЕ ТРОГАЕТ: users, games, factions, regions, weekly_wars,
--             achievements (кроме +1 колонки), user_achievements (кроме +1 constraint)
-- ═══════════════════════════════════════════════════════════════════════


-- ─── 0. Патч существующих таблиц ────────────────────────────────────────

-- Добавить category к achievements (по умолчанию 'general' для старых строк)
ALTER TABLE achievements
  ADD COLUMN IF NOT EXISTS category TEXT NOT NULL DEFAULT 'general';

-- Уникальность для user_achievements — безопасно при повторном запуске
ALTER TABLE user_achievements
  DROP CONSTRAINT IF EXISTS user_achievements_user_achievement_unique;
ALTER TABLE user_achievements
  ADD CONSTRAINT user_achievements_user_achievement_unique
  UNIQUE (user_id, achievement_id);


-- ─── 1. daily_quest_templates ───────────────────────────────────────────

CREATE TABLE IF NOT EXISTS daily_quest_templates (
  id                    UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  slug                  TEXT        NOT NULL UNIQUE,
  title                 TEXT        NOT NULL,
  description           TEXT        NOT NULL,
  difficulty            TEXT        NOT NULL CHECK (difficulty IN ('easy', 'medium', 'hard')),
  requirement_type      TEXT        NOT NULL,
  requirement_value     INTEGER     NOT NULL DEFAULT 1,
  reward_gold           INTEGER     NOT NULL DEFAULT 0,
  reward_faction_points INTEGER     NOT NULL DEFAULT 0,
  reward_pass_xp        INTEGER     NOT NULL DEFAULT 0,
  is_active             BOOLEAN     NOT NULL DEFAULT true,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);


-- ─── 2. user_daily_quests ───────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS user_daily_quests (
  id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  quest_template_id UUID        NOT NULL REFERENCES daily_quest_templates(id),
  assigned_date     DATE        NOT NULL,
  current_progress  INTEGER     NOT NULL DEFAULT 0,
  is_completed      BOOLEAN     NOT NULL DEFAULT false,
  completed_at      TIMESTAMPTZ,
  reward_claimed    BOOLEAN     NOT NULL DEFAULT false,
  reward_claimed_at TIMESTAMPTZ,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, quest_template_id, assigned_date)
);

CREATE INDEX IF NOT EXISTS idx_user_daily_quests_user_date
  ON user_daily_quests (user_id, assigned_date);


-- ─── 3. user_streaks ────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS user_streaks (
  user_id           UUID    PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  current_streak    INTEGER NOT NULL DEFAULT 0,
  longest_streak    INTEGER NOT NULL DEFAULT 0,
  last_active_date  DATE,
  total_active_days INTEGER NOT NULL DEFAULT 0,
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);


-- ─── 4. faction_ranks ───────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS faction_ranks (
  id         UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  faction_id UUID    NOT NULL REFERENCES factions(id) ON DELETE CASCADE,
  tier       INTEGER NOT NULL CHECK (tier BETWEEN 1 AND 5),
  title      TEXT    NOT NULL,
  min_wins   INTEGER NOT NULL DEFAULT 0,
  icon       TEXT    NOT NULL DEFAULT '⚔',
  color      TEXT    NOT NULL DEFAULT '#C9A84C',
  UNIQUE (faction_id, tier)
);


-- ─── 5. gold_transactions ───────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS gold_transactions (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  amount        INTEGER     NOT NULL,
  source        TEXT        NOT NULL,
  reference_id  TEXT,
  balance_after INTEGER     NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_gold_tx_user_created
  ON gold_transactions (user_id, created_at DESC);


-- ═══════════════════════════════════════════════════════════════════════
-- RLS POLICIES
-- ═══════════════════════════════════════════════════════════════════════

-- daily_quest_templates: публичное чтение
ALTER TABLE daily_quest_templates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "quest_templates_read_all"
  ON daily_quest_templates FOR SELECT USING (true);

-- user_daily_quests
ALTER TABLE user_daily_quests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "user_quests_read_own"
  ON user_daily_quests FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "user_quests_insert_own"
  ON user_daily_quests FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "user_quests_update_own"
  ON user_daily_quests FOR UPDATE USING (auth.uid() = user_id);

-- user_streaks
ALTER TABLE user_streaks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "streaks_read_own"
  ON user_streaks FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "streaks_insert_own"
  ON user_streaks FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "streaks_update_own"
  ON user_streaks FOR UPDATE USING (auth.uid() = user_id);

-- faction_ranks: публичное чтение
ALTER TABLE faction_ranks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ranks_read_all"
  ON faction_ranks FOR SELECT USING (true);

-- gold_transactions
ALTER TABLE gold_transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "gold_tx_read_own"
  ON gold_transactions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "gold_tx_insert_own"
  ON gold_transactions FOR INSERT WITH CHECK (auth.uid() = user_id);


-- ═══════════════════════════════════════════════════════════════════════
-- SEEDS
-- ═══════════════════════════════════════════════════════════════════════

-- ─── daily_quest_templates (12 шаблонов) ────────────────────────────────

INSERT INTO daily_quest_templates
  (slug, title, description, difficulty, requirement_type, requirement_value,
   reward_gold, reward_faction_points, reward_pass_xp)
VALUES
  -- Easy (4 штуки)
  ('play_one_game',
   'Первый ход',
   'Сыграй одну партию — любую, любым результатом',
   'easy', 'play_games', 1, 20, 0, 10),

  ('make_30_moves',
   'Терпение',
   'Сделай суммарно 30 ходов за день',
   'easy', 'total_moves', 30, 20, 0, 10),

  ('visit_war_map',
   'Разведка',
   'Открой страницу Войны',
   'easy', 'visit_war', 1, 20, 0, 10),

  ('play_vs_ai',
   'Тренировочный бой',
   'Сыграй одну партию против ИИ',
   'easy', 'play_vs_ai', 1, 20, 0, 10),

  -- Medium (5 штук)
  ('win_one_game',
   'Первая кровь',
   'Победи в одной партии',
   'medium', 'win_games', 1, 50, 10, 25),

  ('play_three_games',
   'Боевое дежурство',
   'Сыграй 3 партии за день',
   'medium', 'play_games', 3, 50, 10, 25),

  ('win_vs_other_fac',
   'Врагу не сдаётся',
   'Победи игрока другой фракции',
   'medium', 'win_vs_other_faction', 1, 50, 10, 25),

  ('win_vs_ai_amateur',
   'Превзойти Солдата',
   'Победи ИИ уровня Солдат или выше (skill ≥ 5)',
   'medium', 'win_vs_ai_min_skill', 5, 50, 10, 25),

  ('play_full_game',
   'До конца',
   'Сыграй партию длиной 30+ ходов',
   'medium', 'play_long_game', 30, 50, 10, 25),

  -- Hard (3 штуки)
  ('win_two_ranked',
   'Завоеватель',
   'Выиграй 2 рейтинговые партии за день',
   'hard', 'win_ranked', 2, 100, 25, 50),

  ('win_vs_ai_veteran',
   'Превзойти Ветерана',
   'Победи ИИ уровня Ветеран или выше (skill ≥ 10)',
   'hard', 'win_vs_ai_min_skill', 10, 100, 25, 50),

  ('win_in_war_week',
   'Воин Войны Недели',
   'Победи в партии за активный фронт недели',
   'hard', 'win_war_week', 1, 100, 25, 50)

ON CONFLICT (slug) DO NOTHING;


-- ─── faction_ranks (5 тиров × 4 фракции = 20 строк) ────────────────────
--
-- Faction UUIDs (hardcoded из seed 001_factions_and_regions.sql):
--   northern-horde   11111111-1111-1111-1111-111111111101
--   iron-empire      11111111-1111-1111-1111-111111111102
--   sea-republic     11111111-1111-1111-1111-111111111103
--   shadow-guild     11111111-1111-1111-1111-111111111104
--
-- Цвета взяты из migration 003 (UPDATE factions SET color):
--   northern-horde → #E05540
--   iron-empire    → #4A7FA5
--   sea-republic   → #2A9D6E
--   shadow-guild   → #7C4DAA

INSERT INTO faction_ranks (faction_id, tier, title, min_wins, icon, color) VALUES
  -- Северная Орда
  ('11111111-1111-1111-1111-111111111101', 1, 'Воин',        0,   '⚔', '#E05540'),
  ('11111111-1111-1111-1111-111111111101', 2, 'Сотник',      5,   '⚔', '#E05540'),
  ('11111111-1111-1111-1111-111111111101', 3, 'Тысячник',    20,  '🛡', '#E05540'),
  ('11111111-1111-1111-1111-111111111101', 4, 'Хан',         50,  '👑', '#C9A84C'),
  ('11111111-1111-1111-1111-111111111101', 5, 'Великий Хан', 100, '🔥', '#FF6B2B'),
  -- Железная Империя
  ('11111111-1111-1111-1111-111111111102', 1, 'Легионер',    0,   '⚔', '#4A7FA5'),
  ('11111111-1111-1111-1111-111111111102', 2, 'Центурион',   5,   '⚔', '#4A7FA5'),
  ('11111111-1111-1111-1111-111111111102', 3, 'Трибун',      20,  '🛡', '#4A7FA5'),
  ('11111111-1111-1111-1111-111111111102', 4, 'Генерал',     50,  '👑', '#C9A84C'),
  ('11111111-1111-1111-1111-111111111102', 5, 'Архистратиг', 100, '🔥', '#FF6B2B'),
  -- Морская Республика
  ('11111111-1111-1111-1111-111111111103', 1, 'Юнга',        0,   '⚓', '#2A9D6E'),
  ('11111111-1111-1111-1111-111111111103', 2, 'Матрос',      5,   '⚓', '#2A9D6E'),
  ('11111111-1111-1111-1111-111111111103', 3, 'Боцман',      20,  '🛡', '#2A9D6E'),
  ('11111111-1111-1111-1111-111111111103', 4, 'Капитан',     50,  '👑', '#C9A84C'),
  ('11111111-1111-1111-1111-111111111103', 5, 'Адмирал',     100, '🔥', '#FF6B2B'),
  -- Гильдия Теней
  ('11111111-1111-1111-1111-111111111104', 1, 'Послушник',   0,   '👁', '#7C4DAA'),
  ('11111111-1111-1111-1111-111111111104', 2, 'Шёпот',       5,   '👁', '#7C4DAA'),
  ('11111111-1111-1111-1111-111111111104', 3, 'Палач',       20,  '🛡', '#7C4DAA'),
  ('11111111-1111-1111-1111-111111111104', 4, 'Архонт',      50,  '👑', '#C9A84C'),
  ('11111111-1111-1111-1111-111111111104', 5, 'Безымянный',  100, '🔥', '#FF6B2B')

ON CONFLICT (faction_id, tier) DO NOTHING;


-- ─── achievements — новые (quest/streak/faction система) ─────────────────
--
-- ВАЖНО: используем column 'name' и 'requirement_type'/'requirement_value'
-- как в существующей схеме (не 'title'/'criteria_type').
-- ON CONFLICT (slug) DO NOTHING — не трогает существующие 16 строк.

INSERT INTO achievements
  (slug, name, description, icon, requirement_type, requirement_value, reward_gold, is_hidden, category)
VALUES
  -- Streak
  ('dedicated_3',  'Преданный',           'Играй 3 дня подряд',                   '🔥', 'streak',       3,    50, false, 'streak'),
  ('dedicated_7',  'Неделя славы',        'Играй 7 дней подряд',                  '🔥', 'streak',       7,   200, false, 'streak'),
  ('dedicated_30', 'Месяц войны',         'Играй 30 дней подряд',                 '🔥', 'streak',       30, 1000, false, 'streak'),
  -- Faction rank
  ('rank_warrior', 'Воин фракции',        'Достигни 2-го ранга своей фракции',    '⚔',  'wins',          5,  100, false, 'faction'),
  ('rank_officer', 'Офицер фракции',      'Достигни 3-го ранга своей фракции',    '🛡', 'wins',         20,  250, false, 'faction'),
  ('rank_general', 'Полководец фракции',  'Достигни 4-го ранга своей фракции',    '👑', 'wins',         50,  500, false, 'faction'),
  ('rank_legend',  'Легенда фракции',     'Достигни максимального ранга фракции', '🔥', 'wins',        100, 1000, false, 'faction'),
  -- Daily quests
  ('daily_quester','Дисциплина',          'Выполни 7 daily quests за неделю',     '📋', 'games',         7,  200, false, 'streak'),
  -- Special
  ('gold_hoarder', 'Скряга',              'Накопи 1000 ◈',                        '💰', 'rating',     1000,  100, true,  'special')

ON CONFLICT (slug) DO NOTHING;
