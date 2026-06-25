const API_BASE = "https://api.football-data.org/v4";
const COMPETITION = "WC";
const CACHE_TTL_MS = 15 * 60 * 1000;

interface CacheEntry<T> {
  data: T;
  fetchedAt: number;
}

let matchesCache: CacheEntry<ApiMatch[]> | null = null;

interface ApiScore {
  home: number | null;
  away: number | null;
}

interface ApiTeam {
  id: number;
  name: string | null;
  tla: string | null;
}

interface ApiMatch {
  id: number;
  stage: string;
  status: string;
  homeTeam: ApiTeam;
  awayTeam: ApiTeam;
  score: {
    fullTime: ApiScore;
    regularTime: ApiScore;
  };
}

interface ApiMatchesResponse {
  matches: ApiMatch[];
}

export interface NationStats {
  nationName: string;
  groupWins: number;
  groupLosses: number;
  groupDraws: number;
  goalDifferential: number;
  isEliminated: boolean;
  eliminationStage: string | null;
}

const API_STAGE_MAP: Record<string, string> = {
  GROUP_STAGE: "group_stage",
  ROUND_OF_32: "round_of_32",
  LAST_32: "round_of_32",
  LAST_16: "round_of_16",
  ROUND_OF_16: "round_of_16",
  QUARTER_FINALS: "quarter_final",
  QUARTER_FINAL: "quarter_final",
  SEMI_FINALS: "semi_final",
  SEMI_FINAL: "semi_final",
  THIRD_PLACE: "third_place",
  FINAL: "final",
};

function getApiKey(): string {
  const key = process.env.FOOTBALL_DATA_API_KEY;
  if (!key) throw new Error("FOOTBALL_DATA_API_KEY not set");
  return key;
}

async function fetchMatches(): Promise<ApiMatch[]> {
  const now = Date.now();
  if (matchesCache && now - matchesCache.fetchedAt < CACHE_TTL_MS) {
    return matchesCache.data;
  }

  const res = await fetch(`${API_BASE}/competitions/${COMPETITION}/matches`, {
    headers: { "X-Auth-Token": getApiKey() },
    cache: "no-store",
  });

  if (!res.ok) {
    throw new Error(`Football API error: ${res.status} ${res.statusText}`);
  }

  const json = (await res.json()) as ApiMatchesResponse;
  matchesCache = { data: json.matches, fetchedAt: now };
  return json.matches;
}

function normalizeTeamName(name: string | null | undefined): string {
  return (name ?? "").trim().toLowerCase();
}

export async function getNationStats(
  nationNames: string[]
): Promise<Map<string, NationStats>> {
  const matches = await fetchMatches();
  const finishedStatuses = new Set(["FINISHED", "AWARDED"]);
  const finished = matches.filter((m) => finishedStatuses.has(m.status));
  const nameSet = new Set(nationNames.map(normalizeTeamName));

  const stats = new Map<string, NationStats>();
  for (const name of nationNames) {
    stats.set(normalizeTeamName(name), {
      nationName: name,
      groupWins: 0,
      groupLosses: 0,
      groupDraws: 0,
      goalDifferential: 0,
      isEliminated: false,
      eliminationStage: null,
    });
  }

  for (const match of finished) {
    const homeNorm = normalizeTeamName(match.homeTeam.name);
    const awayNorm = normalizeTeamName(match.awayTeam.name);
    const homeScore = match.score.fullTime.home ?? 0;
    const awayScore = match.score.fullTime.away ?? 0;
    const stage = match.stage;

    const homeStats = nameSet.has(homeNorm) ? stats.get(homeNorm) : null;
    const awayStats = nameSet.has(awayNorm) ? stats.get(awayNorm) : null;

    if (stage === "GROUP_STAGE") {
      if (homeStats) {
        homeStats.goalDifferential += homeScore - awayScore;
        if (homeScore > awayScore) homeStats.groupWins++;
        else if (homeScore < awayScore) homeStats.groupLosses++;
        else homeStats.groupDraws++;
      }
      if (awayStats) {
        awayStats.goalDifferential += awayScore - homeScore;
        if (awayScore > homeScore) awayStats.groupWins++;
        else if (awayScore < homeScore) awayStats.groupLosses++;
        else awayStats.groupDraws++;
      }
    }

    const mappedStage = API_STAGE_MAP[stage];
    if (mappedStage && mappedStage !== "group_stage") {
      const regularHome = match.score.regularTime?.home ?? homeScore;
      const regularAway = match.score.regularTime?.away ?? awayScore;
      const loserNorm =
        homeScore > awayScore
          ? awayNorm
          : homeScore < awayScore
            ? homeNorm
            : regularHome > regularAway
              ? awayNorm
              : regularAway > regularHome
                ? homeNorm
                : null;
      const winnerNorm =
        loserNorm === homeNorm
          ? awayNorm
          : loserNorm === awayNorm
            ? homeNorm
            : null;

      if (loserNorm && stats.has(loserNorm)) {
        const s = stats.get(loserNorm)!;
        if (!s.isEliminated) {
          s.isEliminated = true;
          s.eliminationStage = mappedStage;
        }
      }

      if (stage === "FINAL" && winnerNorm && stats.has(winnerNorm)) {
        const s = stats.get(winnerNorm)!;
        s.isEliminated = true;
        s.eliminationStage = "champion";
      }

      if (stage === "THIRD_PLACE" && winnerNorm && stats.has(winnerNorm)) {
        const s = stats.get(winnerNorm)!;
        if (!s.isEliminated) {
          s.isEliminated = true;
          s.eliminationStage = "third_place";
        }
      }
    }
  }

  // Nations eliminated in group stage: a nation that finished all its group
  // matches but did NOT advance to the knockout rounds was eliminated in the
  // group stage. We can only make this inference once the first knockout round
  // has actually been DRAWN with real teams. Right after the group stage ends,
  // knockout fixtures exist but with placeholder/TBD (null) team names, so a
  // team that genuinely advanced (e.g. Brazil) would not yet appear in any
  // knockout match. Inferring elimination before the draw is complete would
  // wrongly eliminate advancing teams, so we wait.
  const knockoutMatches = matches.filter((m) => m.stage !== "GROUP_STAGE");

  // Rank knockout rounds so we can identify the first one (the round teams
  // advance into directly from the group stage).
  const KNOCKOUT_STAGE_RANK: Record<string, number> = {
    ROUND_OF_32: 1,
    LAST_32: 1,
    ROUND_OF_16: 2,
    LAST_16: 2,
    QUARTER_FINALS: 3,
    QUARTER_FINAL: 3,
    SEMI_FINALS: 4,
    SEMI_FINAL: 4,
    THIRD_PLACE: 5,
    FINAL: 6,
  };

  let firstKnockoutRank = Infinity;
  for (const match of knockoutMatches) {
    const rank = KNOCKOUT_STAGE_RANK[match.stage] ?? Infinity;
    if (rank < firstKnockoutRank) firstKnockoutRank = rank;
  }

  const firstRoundMatches = knockoutMatches.filter(
    (m) => (KNOCKOUT_STAGE_RANK[m.stage] ?? Infinity) === firstKnockoutRank
  );
  const firstRoundDrawn =
    firstRoundMatches.length > 0 &&
    firstRoundMatches.every((m) => m.homeTeam.name && m.awayTeam.name);

  if (firstRoundDrawn) {
    // Teams that appear (with a real name) in any knockout fixture advanced.
    const knockoutTeams = new Set<string>();
    for (const match of knockoutMatches) {
      if (match.homeTeam.name)
        knockoutTeams.add(normalizeTeamName(match.homeTeam.name));
      if (match.awayTeam.name)
        knockoutTeams.add(normalizeTeamName(match.awayTeam.name));
    }

    for (const [normName, s] of stats) {
      if (s.isEliminated) continue;
      if (knockoutTeams.has(normName)) continue;

      const groupMatches = matches.filter(
        (m) =>
          m.stage === "GROUP_STAGE" &&
          (normalizeTeamName(m.homeTeam.name) === normName ||
            normalizeTeamName(m.awayTeam.name) === normName)
      );
      const allFinished =
        groupMatches.length > 0 &&
        groupMatches.every((m) => finishedStatuses.has(m.status));

      if (allFinished) {
        s.isEliminated = true;
        s.eliminationStage = "group_stage";
      }
    }
  }

  return stats;
}
