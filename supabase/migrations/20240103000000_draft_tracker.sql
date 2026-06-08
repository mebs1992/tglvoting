-- World Cup nation assignments and elimination tracking for draft order
CREATE TABLE draft_tracker_nations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id uuid NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  nation_name text NOT NULL,
  nation_code text,
  status text NOT NULL DEFAULT 'active',
  elimination_stage text,
  group_wins int NOT NULL DEFAULT 0,
  group_losses int NOT NULL DEFAULT 0,
  group_draws int NOT NULL DEFAULT 0,
  goal_differential int NOT NULL DEFAULT 0,
  eliminated_at timestamptz,
  draft_position int,
  draft_position_override int,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT draft_tracker_status_check CHECK (status IN ('active', 'eliminated')),
  CONSTRAINT draft_tracker_stage_check CHECK (
    elimination_stage IS NULL OR elimination_stage IN (
      'group_stage', 'round_of_32', 'round_of_16',
      'quarter_final', 'semi_final', 'third_place', 'final', 'champion'
    )
  ),
  CONSTRAINT draft_tracker_unique_member UNIQUE (member_id),
  CONSTRAINT draft_tracker_unique_nation UNIQUE (nation_name)
);

CREATE INDEX idx_draft_tracker_status ON draft_tracker_nations(status);
