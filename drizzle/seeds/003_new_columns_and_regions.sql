-- Update faction colors to match new dark fantasy theme
UPDATE factions SET color = '#E05540' WHERE slug = 'northern-horde';
UPDATE factions SET color = '#4A7FA5' WHERE slug = 'iron-empire';
UPDATE factions SET color = '#2A9D6E' WHERE slug = 'sea-republic';
UPDATE factions SET color = '#7C4DAA' WHERE slug = 'shadow-guild';

-- Update faction lore descriptions
UPDATE factions SET lore_description = 'Непобедимые воины севера. Их тактика — неустанная агрессия и давление. Они не защищают позиции — они их сжигают.'
  WHERE slug = 'northern-horde';
UPDATE factions SET lore_description = 'Древняя держава на железной дисциплине. Каждый ход — манёвр армий. Каждая пешка — солдат, павший за империю.'
  WHERE slug = 'iron-empire';
UPDATE factions SET lore_description = 'Торговцы и стратеги видят доску как карту морских путей. Гибкие, быстрые, непредсказуемые — они везде и нигде.'
  WHERE slug = 'sea-republic';
UPDATE factions SET lore_description = 'Мастера позиционной игры. Они ждут ошибки врага, растворяясь во тьме. Терпение — их оружие, тень — их дом.'
  WHERE slug = 'shadow-guild';

-- Add 4 new fantasy regions
INSERT INTO regions (id, name, slug, owner_faction_id, contested, x_coord, y_coord, lore_description)
VALUES
  ('22222222-2222-2222-2222-222222222213', 'Ледяной Пик',    'frost-peak',    '11111111-1111-1111-1111-111111111101', false, 30.0, 5.0,  'Вечные льды крайнего севера. Родина Северной Орды.'),
  ('22222222-2222-2222-2222-222222222214', 'Пепельное Болото','ember-marsh',   '11111111-1111-1111-1111-111111111104', false, 12.0, 72.0, 'Топи, полные ядовитых испарений. Здесь прячутся лазутчики.'),
  ('22222222-2222-2222-2222-222222222215', 'Хрустальный Берег','crystal-shore','11111111-1111-1111-1111-111111111103', false, 85.0, 52.0, 'Стеклянные скалы, где разбиваются волны. Порт Республики.'),
  ('22222222-2222-2222-2222-222222222216', 'Хребет Дракона',  'dragon-spine',  NULL,                                    true,  58.0, 80.0, 'Горная гряда, где никто не правил. Горячая точка сезона.')
ON CONFLICT (slug) DO NOTHING;

-- Update neighbors for existing regions to include new ones
UPDATE regions SET neighbors = '["22222222-2222-2222-2222-222222222202","22222222-2222-2222-2222-222222222203","22222222-2222-2222-2222-222222222213"]'::jsonb
  WHERE slug = 'arktania';

UPDATE regions SET neighbors = '["22222222-2222-2222-2222-222222222207","22222222-2222-2222-2222-222222222208","22222222-2222-2222-2222-222222222214"]'::jsonb
  WHERE slug = 'black-rocks';

UPDATE regions SET neighbors = '["22222222-2222-2222-2222-222222222205","22222222-2222-2222-2222-222222222211","22222222-2222-2222-2222-222222222215"]'::jsonb
  WHERE slug = 'hope-port';

UPDATE regions SET neighbors = '["22222222-2222-2222-2222-222222222212","22222222-2222-2222-2222-222222222211","22222222-2222-2222-2222-222222222216"]'::jsonb
  WHERE slug = 'gold-valley';

-- Set neighbors for new regions
UPDATE regions SET neighbors = '["22222222-2222-2222-2222-222222222201","22222222-2222-2222-2222-222222222202"]'::jsonb
  WHERE slug = 'frost-peak';

UPDATE regions SET neighbors = '["22222222-2222-2222-2222-222222222207","22222222-2222-2222-2222-222222222208"]'::jsonb
  WHERE slug = 'ember-marsh';

UPDATE regions SET neighbors = '["22222222-2222-2222-2222-222222222206","22222222-2222-2222-2222-222222222211"]'::jsonb
  WHERE slug = 'crystal-shore';

UPDATE regions SET neighbors = '["22222222-2222-2222-2222-222222222209","22222222-2222-2222-2222-222222222211"]'::jsonb
  WHERE slug = 'dragon-spine';

-- Update faction territory counts
UPDATE factions SET current_territory_count = (
  SELECT COUNT(*) FROM regions WHERE owner_faction_id = factions.id
);
