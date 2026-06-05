import Link from "next/link";

interface Breakdown {
  proposal: { id: string; title: string; outcome: string };
  restricted: boolean;
  yesVoters?: string[];
  noVoters?: string[];
  notVoted?: string[];
  yesCount?: number;
  noCount?: number;
  notVotedCount?: number;
}

export default function BreakdownContent({ data }: { data: Breakdown | null }) {
  if (!data) {
    return (
      <div className="card text-center">
        <p className="text-muted">Proposal not found.</p>
        <Link href="/results" className="btn btn-sm btn-outline mt-16">
          Back to Results
        </Link>
      </div>
    );
  }

  if (data.restricted) {
    return (
      <div className="card text-center">
        <p className="text-muted">Results are hidden until this vote reaches an outcome.</p>
        <Link href="/results" className="btn btn-sm btn-outline mt-16">
          Back to Results
        </Link>
      </div>
    );
  }

  const isPassed = data.proposal.outcome === "passed";

  return (
    <>
      <Link href="/results" className="text-muted" style={{ fontSize: 13 }}>
        &larr; Back to Results
      </Link>

      <div className="card mt-16">
        <div className="flex items-center justify-between mb-8">
          <h1 style={{ fontSize: 20, fontWeight: 700 }}>{data.proposal.title}</h1>
          <span className={`badge ${isPassed ? "badge-passed" : "badge-failed"}`}>
            {isPassed ? "PASSED" : "FAILED"}
          </span>
        </div>

        <div className="stat-row">
          <div className="stat-item">
            <div className="stat-value" style={{ color: "var(--color-green)" }}>{data.yesCount}</div>
            <div className="stat-label">Yes</div>
          </div>
          <div className="stat-item">
            <div className="stat-value" style={{ color: "var(--color-red)" }}>{data.noCount}</div>
            <div className="stat-label">No</div>
          </div>
          <div className="stat-item">
            <div className="stat-value" style={{ color: "var(--color-text-secondary)" }}>{data.notVotedCount}</div>
            <div className="stat-label">Not Voted</div>
          </div>
        </div>
      </div>

      <div className="card mt-16">
        <div className="voter-section">
          <div className="voter-section-title" style={{ color: "var(--color-green)" }}>
            YES Voters ({data.yesCount})
          </div>
          <ul className="voter-list">
            {(data.yesVoters ?? []).map((name) => (
              <li key={name}>{name}</li>
            ))}
            {(data.yesVoters ?? []).length === 0 && <li className="text-muted">None</li>}
          </ul>
        </div>

        <div className="voter-section">
          <div className="voter-section-title" style={{ color: "var(--color-red)" }}>
            NO Voters ({data.noCount})
          </div>
          <ul className="voter-list">
            {(data.noVoters ?? []).map((name) => (
              <li key={name}>{name}</li>
            ))}
            {(data.noVoters ?? []).length === 0 && <li className="text-muted">None</li>}
          </ul>
        </div>

        <div className="voter-section">
          <div className="voter-section-title" style={{ color: "var(--color-text-secondary)" }}>
            Not Voted ({data.notVotedCount})
          </div>
          <ul className="voter-list">
            {(data.notVoted ?? []).map((name) => (
              <li key={name}>{name}</li>
            ))}
            {(data.notVoted ?? []).length === 0 && <li className="text-muted">None</li>}
          </ul>
        </div>
      </div>
    </>
  );
}
