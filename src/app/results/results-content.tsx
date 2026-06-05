import Link from "next/link";

interface Finalised {
  id: string;
  title: string;
  outcome: string;
  yesVotes: number;
  noVotes: number;
  notVoted: number;
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
          <p className="text-muted">No finalised votes yet.</p>
        </div>
      ) : (
        finalised.map((p) => (
          <div key={p.id} className="card">
            <div className="flex items-center justify-between mb-8">
              <h3 style={{ fontSize: 16, fontWeight: 600 }}>{p.title}</h3>
              <span className={`badge ${p.outcome === "passed" ? "badge-passed" : "badge-failed"}`}>
                {p.outcome === "passed" ? "PASSED" : "FAILED"}
              </span>
            </div>
            <div className="stat-row">
              <div className="stat-item">
                <div className="stat-value" style={{ color: "var(--color-green)" }}>{p.yesVotes}</div>
                <div className="stat-label">Yes</div>
              </div>
              <div className="stat-item">
                <div className="stat-value" style={{ color: "var(--color-red)" }}>{p.noVotes}</div>
                <div className="stat-label">No</div>
              </div>
              <div className="stat-item">
                <div className="stat-value" style={{ color: "var(--color-text-secondary)" }}>{p.notVoted}</div>
                <div className="stat-label">Not Voted</div>
              </div>
            </div>
            <div className="mt-12">
              <Link href={`/results/${p.id}`} className="btn btn-sm btn-outline">
                Vote Breakdown
              </Link>
            </div>
          </div>
        ))
      )}

      <h2 className="section-title mt-24">Awaiting Outcome</h2>
      {pending.length === 0 ? (
        <div className="card">
          <p className="text-muted">No pending proposals.</p>
        </div>
      ) : (
        pending.map((p) => (
          <div key={p.id} className="card">
            <div className="flex items-center justify-between">
              <h3 style={{ fontSize: 16, fontWeight: 600 }}>{p.title}</h3>
              <span className="badge badge-open">Open</span>
            </div>
            <p className="text-muted mt-8" style={{ fontSize: 13 }}>
              Needs more votes to finalise.
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
