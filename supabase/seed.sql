-- Seed 12 league members
-- Marcus is the first member and commissioner
INSERT INTO members (display_name, team_name, is_commissioner) VALUES
  ('Marcus', NULL, true),
  ('Member 2', NULL, false),
  ('Member 3', NULL, false),
  ('Member 4', NULL, false),
  ('Member 5', NULL, false),
  ('Member 6', NULL, false),
  ('Member 7', NULL, false),
  ('Member 8', NULL, false),
  ('Member 9', NULL, false),
  ('Member 10', NULL, false),
  ('Member 11', NULL, false),
  ('Member 12', NULL, false);

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
