-- League info sections (key-value store for landing page content)
CREATE TABLE league_info (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  section_key text UNIQUE NOT NULL,
  title text NOT NULL,
  content jsonb NOT NULL DEFAULT '{}',
  is_visible boolean NOT NULL DEFAULT true,
  display_order integer NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid REFERENCES members(id)
);

-- Announcements (commissioner-posted messages)
CREATE TABLE announcements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  content text NOT NULL,
  is_pinned boolean NOT NULL DEFAULT true,
  created_by uuid REFERENCES members(id) NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_league_info_section_key ON league_info(section_key);
CREATE INDEX idx_announcements_pinned ON announcements(is_pinned, created_at DESC);

-- Seed default sections
INSERT INTO league_info (section_key, title, content, display_order) VALUES
  ('buy_in', 'Buy-In', '{"amount": "", "payment_details": "", "deadline": ""}', 1),
  ('draft_day', 'Draft Day', '{"date": "", "time": "", "location": "", "notes": ""}', 2),
  ('season_schedule', 'Season Schedule', '{"events": []}', 3),
  ('prize_structure', 'Prize Structure', '{"entries": []}', 4),
  ('by_laws', 'By-Laws', '{"content": ""}', 5),
  ('external_links', 'External Links', '{"links": []}', 6);
