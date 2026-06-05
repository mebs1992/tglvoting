-- Seed 12 league members
-- Marcus is the first member and commissioner
INSERT INTO members (display_name, team_name, is_commissioner) VALUES
  ('Marcus', NULL, true),
  ('Mahs', NULL, false),
  ('Bag', NULL, false),
  ('Mang', NULL, false),
  ('Frazz', NULL, false),
  ('Dicky', NULL, false),
  ('Woody', NULL, false),
  ('Falvey', NULL, false),
  ('Tony', NULL, false),
  ('Jord', NULL, false),
  ('Hugh', NULL, false),
  ('Haz', NULL, false);

-- Seed league settings
INSERT INTO league_settings (league_name, short_name, logo_url) VALUES
  ('The Greatest League', 'TGL', '/images/tgl_logo.png');

-- Seed one sample proposal
INSERT INTO proposals (title, description, status, outcome, created_by)
SELECT
  'Change waiver priority to reverse standings',
  'Proposal to change weekly waiver priority so that lower-ranked teams receive higher priority.',
  'draft',
  'pending',
  m.id
FROM members m
WHERE m.display_name = 'Marcus'
LIMIT 1;
