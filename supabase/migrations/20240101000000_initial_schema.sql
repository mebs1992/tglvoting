-- Members table
CREATE TABLE members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  display_name text NOT NULL,
  team_name text,
  pin_hash text,
  pin_created_at timestamptz,
  is_commissioner boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Proposals table
CREATE TABLE proposals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text NOT NULL,
  status text NOT NULL DEFAULT 'draft',
  outcome text NOT NULL DEFAULT 'pending',
  created_by uuid REFERENCES members(id),
  opened_by uuid REFERENCES members(id),
  closed_by uuid REFERENCES members(id),
  opened_at timestamptz,
  closed_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT proposals_status_check CHECK (status IN ('draft', 'open', 'closed')),
  CONSTRAINT proposals_outcome_check CHECK (outcome IN ('pending', 'passed', 'failed'))
);

-- Votes table
CREATE TABLE votes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  proposal_id uuid NOT NULL REFERENCES proposals(id) ON DELETE CASCADE,
  member_id uuid NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  vote_value text NOT NULL,
  created_at timestamptz DEFAULT now(),
  CONSTRAINT votes_unique_member_proposal UNIQUE (proposal_id, member_id),
  CONSTRAINT votes_value_check CHECK (vote_value IN ('yes', 'no'))
);

-- Prevent vote updates via RLS (votes are immutable)
-- The application enforces immutability by only inserting, never updating

-- Audit log table
CREATE TABLE audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_member_id uuid REFERENCES members(id),
  action text NOT NULL,
  target_type text NOT NULL,
  target_id uuid,
  metadata jsonb,
  created_at timestamptz DEFAULT now()
);

-- League settings table
CREATE TABLE league_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  league_name text,
  short_name text,
  logo_url text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Indexes for common queries
CREATE INDEX idx_proposals_status ON proposals(status);
CREATE INDEX idx_votes_proposal_id ON votes(proposal_id);
CREATE INDEX idx_votes_member_id ON votes(member_id);
CREATE INDEX idx_audit_log_actor ON audit_log(actor_member_id);
