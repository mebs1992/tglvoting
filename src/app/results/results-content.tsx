import Link from "next/link";

interface ChoiceResult {
  id: string;
  label: string;
  count: number;
}

interface Finalised {
  id: string;
  title: string;
  outcome: string;
  isMultipleChoice?: boolean;
  requiresTieBreak?: boolean;
  yesVotes?: number;
  noVotes?: number;
  notVoted?: number;
  choiceResults?: ChoiceResult[];
  totalVoters?: number;
}

interface Pending {
  id: string;
  title: string;
  status: string;
}

export default function ResultsContent({
  finalised,
  pending,
}: {
  finalised: Finalised[];
  pending: Pending[];
}) {
  return (
    <>
      <h2 className="section-title">Finalised Votes</h2>
      {finalised.length === 0 ? (
        <div className="card">
          <p className="text-muted">No finalised votes yet. History awaits.</p>
        </div>
      ) : (
        finalised.map((p) => {
          const cardClass = p.isMultipleChoice
            ? "result-card-mc"
            : p.outcome === "passed"
              ? "result-card-passed"
              : "result-card-failed";

          return (
            <div key={p.id} className={`card result-card ${cardClass}`}>
              <div className="flex items-center justify-between mb-8">
                <h3 style={{ fontSize: 16, fontWeight: 700 }}>{p.title}</h3>
                {p.isMultipleChoice ? (
                  p.requiresTieBreak ? (
                    <span className="badge badge-tiebreak badge-lg">Tie-break Required</span>
                  ) : (
                    <span className="badge badge-draft badge-lg">Decided</span>
                  )
                ) : (
                  <span className={`badge badge-lg ${p.outcome === "passed" ? "badge-passed" : "badge-failed"}`}>
                    {p.outcome === "passed" ? "PASSED" : "FAILED"}
                  </span>
                )}
              </div>
              {p.isMultipleChoice && p.choiceResults ? (
                <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 4 }}>
                  {(() => {
                    const maxCount = Math.max(...p.choiceResults.map((cr) => cr.count), 1);
                    return p.choiceResults.map((c) => {
                      const isWinner = !p.requiresTieBreak && c.count === maxCount && c.count > 0;
                      return (
                        <div key={c.id}>
                          <div
                            className="flex items-center justify-between"
                            style={{ fontSize: 14, marginBottom: 4 }}
                          >
                            <span className={`result-choice-label ${isWinner ? "winner" : ""}`}>
                              {c.label}
                            </span>
                            <span style={{ fontWeight: 700 }}>
                              {c.count} vote{c.count !== 1 ? "s" : ""}
                            </span>
                          </div>
                          <div className="result-bar-track">
                            <div
                              className={`result-bar-fill ${isWinner ? "winner" : ""}`}
                              style={{ width: `${(c.count / maxCount) * 100}%` }}
                            />
                          </div>
                        </div>
                      );
                    });
                  })()}
                  {p.requiresTieBreak && (
                    <p className="text-muted" style={{ fontSize: 12, marginTop: 4 }}>
                      No option reached 7 votes. The commissioner will run a tie-break
                      between the top two options.
                    </p>
                  )}
                </div>
              ) : (
                <div className="stat-row">
                  <div className="stat-item">
                    <div className="stat-value" style={{ color: "var(--color-green)", fontSize: 30 }}>{p.yesVotes}</div>
                    <div className="stat-label">Yes</div>
                  </div>
                  <div className="stat-item">
                    <div className="stat-value" style={{ color: "var(--color-red)", fontSize: 30 }}>{p.noVotes}</div>
                    <div className="stat-label">No</div>
                  </div>
                  <div className="stat-item">
                    <div className="stat-value" style={{ color: "var(--color-text-secondary)", fontSize: 30 }}>{p.notVoted}</div>
                    <div className="stat-label">Not Voted</div>
                  </div>
                </div>
              )}
              <div className="mt-12">
                <Link href={`/results/${p.id}`} className="btn btn-sm btn-outline">
                  Vote Breakdown
                </Link>
              </div>
            </div>
          );
        })
      )}

      <h2 className="section-title mt-24">Awaiting Outcome</h2>
      {pending.length === 0 ? (
        <div className="card">
          <p className="text-muted">No pending proposals. The floor is quiet.</p>
        </div>
      ) : (
        pending.map((p) => (
          <div key={p.id} className="card awaiting-card">
            <div className="flex items-center justify-between">
              <h3 style={{ fontSize: 16, fontWeight: 700 }}>{p.title}</h3>
              <span className="badge badge-live">&#9679; Live</span>
            </div>
            <p className="text-muted mt-8" style={{ fontSize: 13 }}>
              Votes are still coming in. The verdict drops when an outcome is reached.
            </p>
          </div>
        ))
      )}

      <p className="text-muted mt-16 text-center" style={{ fontSize: 12 }}>
        Results are only visible once an issue reaches majority or a final outcome.
      </p>
    </>
  );
}
