export type ProposalOutcome = "passed" | "failed" | "pending";

export const MAJORITY_THRESHOLD = 7;

export interface OutcomeResult {
  yesVotes: number;
  noVotes: number;
  totalVotes: number;
  notVoted: number;
  requiredYesToPass: number;
  blockingNoVotes: number;
  outcome: ProposalOutcome;
}

export function calculateOutcome(
  yesVotes: number,
  noVotes: number,
): ProposalOutcome {
  if (yesVotes >= MAJORITY_THRESHOLD) return "passed";
  if (noVotes >= 6) return "failed";
  return "pending";
}

export function getOutcomeDetails(
  yesVotes: number,
  noVotes: number,
  totalMembers = 12,
): OutcomeResult {
  const totalVotes = yesVotes + noVotes;
  return {
    yesVotes,
    noVotes,
    totalVotes,
    notVoted: totalMembers - totalVotes,
    requiredYesToPass: 7,
    blockingNoVotes: 6,
    outcome: calculateOutcome(yesVotes, noVotes),
  };
}
