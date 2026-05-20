-- Insert achievement definitions (use gen_random_uuid() to avoid uuid format issues)
INSERT INTO achievements (slug, name, description, icon, requirement_type, requirement_value, reward_gold, is_hidden)
VALUES
  -- Wins-based
  ('first-blood',    'Первая кровь',      'Одержи первую победу в рейтинговой партии',    '⚔️',  'wins',         1,   50,  false),
  ('veteran',        'Ветеран',           'Одержи 10 побед',                               '🏆',  'wins',         10,  100, false),
  ('warlord',        'Полководец',        'Одержи 50 побед',                               '👑',  'wins',         50,  300, false),
  ('conqueror',      'Завоеватель',       'Одержи 100 побед',                              '⚜️',  'wins',         100, 600, false),
  -- Games-based
  ('recruit',        'Рекрут',            'Сыграй 5 партий',                               '🎖️',  'games',        5,   30,  false),
  ('soldier',        'Солдат',            'Сыграй 25 партий',                              '🪖',  'games',        25,  80,  false),
  ('commander',      'Командир',          'Сыграй 100 партий',                             '🎯',  'games',        100, 200, false),
  -- Rating-based
  ('rising-star',    'Восходящая звезда', 'Достигни рейтинга 1400',                        '⭐',  'rating',       1400, 150, false),
  ('elite',          'Элита',             'Достигни рейтинга 1600',                        '💫',  'rating',       1600, 300, false),
  ('grandmaster',    'Гроссмейстер',      'Достигни рейтинга 1900',                        '🌟',  'rating',       1900, 700, false),
  -- Blitz
  ('blitz-warrior',  'Блиц-воин',         'Одержи 5 побед в блиц-партиях',                 '⚡',  'blitz_wins',   5,   80,  false),
  ('speed-demon',    'Демон скорости',    'Одержи 20 побед в блиц-партиях',                '🌪️',  'blitz_wins',   20,  200, false),
  -- Streak
  ('on-fire',        'В огне',            'Одержи 3 победы подряд',                        '🔥',  'streak',       3,   100, false),
  ('unstoppable',    'Неудержимый',       'Одержи 5 побед подряд',                         '💎',  'streak',       5,   250, false),
  -- Quality play
  ('flawless',       'Безупречный',       'Завершить партию без зевков',                   '✨',  'no_blunders',  1,   60,  false),
  -- Faction wars
  ('war-hero',       'Герой войны',       'Внеси вклад в победу фракции в войне недели',   '🛡️',  'faction_wins', 1,   150, false)
ON CONFLICT (slug) DO NOTHING;
