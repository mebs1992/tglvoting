-- Add multiple choice support to proposals
ALTER TABLE proposals ADD COLUMN allow_multiple_selections boolean NOT NULL DEFAULT false;

-- Choices for multiple-choice proposals
CREATE TABLE proposal_choices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  proposal_id uuid NOT NULL REFERENCES proposals(id) ON DELETE CASCADE,
  label text NOT NULL,
  display_order integer NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX idx_proposal_choices_proposal_id ON proposal_choices(proposal_id);

-- Relax votes constraints to support custom choice values and multi-select
ALTER TABLE votes DROP CONSTRAINT votes_value_check;
ALTER TABLE votes DROP CONSTRAINT votes_unique_member_proposal;
ALTER TABLE votes ADD CONSTRAINT votes_unique_member_proposal_value UNIQUE (proposal_id, member_id, vote_value);
