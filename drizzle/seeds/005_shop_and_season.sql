-- Insert shop items
INSERT INTO shop_items (id, slug, name, description, item_type, price_gold, price_usd_cents, is_season_pass, sort_order)
VALUES
  -- Season Pass
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbb01', 'season-pass-1', 'Боевой Пропуск — Сезон 1', 'Доступ к эксклюзивным наградам сезона: скины, эмоции, золото, достижения', 'season_pass', NULL, 299, true, 0),
  -- Hint packs
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbb02', 'hint-pack-5',   '5 Подсказок',      'Запас из 5 подсказок Stockfish для сложных позиций',              'hint_pack', 50,   NULL, false, 10),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbb03', 'hint-pack-20',  '20 Подсказок',     'Большой запас подсказок — экономия 20%',                          'hint_pack', 160,  NULL, false, 11),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbb04', 'hint-pack-50',  '50 Подсказок',     'Профессиональный запас подсказок — экономия 30%',                 'hint_pack', 350,  NULL, false, 12),
  -- Board skins
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbb05', 'board-obsidian', 'Обсидиановая доска',  'Тёмная доска из вулканического стекла с золотыми линиями',   'board_skin', 200, NULL, false, 20),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbb06', 'board-marble',   'Мраморная доска',     'Классическая белая и серая мраморная отделка',               'board_skin', 150, NULL, false, 21),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbb07', 'board-arctic',   'Арктическая доска',   'Ледяные синие и белые клетки с морозным узором',             'board_skin', 180, NULL, false, 22),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbb08', 'board-ember',    'Огненная доска',      'Пылающие красные и оранжевые клетки',                        'board_skin', 180, NULL, false, 23),
  -- Piece skins
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbb09', 'pieces-knight',  'Рыцарский набор',     'Средневековые фигуры в стиле крестоносцев',                  'piece_skin', 250, NULL, false, 30),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbb10', 'pieces-shadow',  'Теневой набор',       'Тёмные фигуры с фиолетовым свечением',                      'piece_skin', 300, NULL, false, 31),
  -- Titles
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbb11', 'title-conqueror','Завоеватель',         'Отображается перед именем в профиле',                        'title',      300, NULL, false, 40),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbb12', 'title-shadow',   'Призрак',             'Загадочный титул для мастеров засад',                        'title',      300, NULL, false, 41),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbb13', 'title-admiral',  'Адмирал',             'Для морских стратегов',                                      'title',      300, NULL, false, 42),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbb14', 'title-warlord',  'Военачальник',        'Для тех, кто правит полем боя',                              'title',      300, NULL, false, 43)
ON CONFLICT (slug) DO NOTHING;

-- Create first season
INSERT INTO seasons (id, number, name, starts_at, ends_at, is_active, prize_description)
VALUES (
  'cccccccc-cccc-cccc-cccc-cccccccccc01',
  1,
  'Сезон Теней',
  NOW(),
  NOW() + INTERVAL '90 days',
  true,
  'Эксклюзивный скин доски "Обсидиановый Трон" + 500 золота + титул "Завоеватель Теней" для Топ-1 каждой фракции'
)
ON CONFLICT (number) DO NOTHING;
