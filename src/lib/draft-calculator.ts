export interface NationEntry {
  id: string;
  member_id: string;
  nation_name: string;
  status: "active" | "eliminated";
  elimination_stage: string | null;
  group_wins: number;
  group_losses: number;
  group_draws: number;
  goal_differential: number;
  eliminated_at: string | null;
  draft_position: number | null;
  draft_position_override: number | null;
}

export const STAGE_ORDER: Record<string, number> = {
  group_stage: 1,
  round_of_32: 2,
  round_of_16: 3,
  quarter_final: 4,
  semi_final: 5,
  third_place: 6,
  final: 7,
  champion: 8,
};

export const STAGE_LABELS: Record<string, string> = {
  group_stage: "Group Stage",
  round_of_32: "Round of 32",
  round_of_16: "Round of 16",
  quarter_final: "Quarter-Final",
  semi_final: "Semi-Final",
  third_place: "Third Place",
  final: "Final",
  champion: "Champion",
};

export const TOTAL_PICKS = 12;

export function calculateDraftPositions(
  nations: NationEntry[]
): Map<string, number> {
  const eliminated = nations.filter(
    (n) => n.status === "eliminated" && n.elimination_stage
  );

  eliminated.sort((a, b) => {
    const stageA = STAGE_ORDER[a.elimination_stage!] ?? 0;
    const stageB = STAGE_ORDER[b.elimination_stage!] ?? 0;
    if (stageA !== stageB) return stageA - stageB;

    const pointsA = a.group_wins * 3 + a.group_draws;
    const pointsB = b.group_wins * 3 + b.group_draws;
    if (pointsA !== pointsB) return pointsA - pointsB;

    if (a.goal_differential !== b.goal_differential)
      return a.goal_differential - b.goal_differential;

    const timeA = a.eliminated_at ? new Date(a.eliminated_at).getTime() : 0;
    const timeB = b.eliminated_at ? new Date(b.eliminated_at).getTime() : 0;
    return timeA - timeB;
  });

  const positions = new Map<string, number>();
  eliminated.forEach((nation, index) => {
    positions.set(nation.id, TOTAL_PICKS - index);
  });

  return positions;
}

export function getEffectivePosition(
  nation: NationEntry,
  calculated: Map<string, number>
): number | null {
  if (nation.draft_position_override !== null)
    return nation.draft_position_override;
  return calculated.get(nation.id) ?? null;
}
