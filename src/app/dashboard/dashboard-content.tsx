"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { submitVote } from "@/app/actions/vote-actions";

interface Proposal {
  id: string;
  title: string;
  description: string;
  status: string;
  hasVoted: boolean;
}

export default function DashboardContent({ initialProposals }: { initialProposals: Proposal[] }) {
  const router = useRouter();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [voting, setVoting] = useState(false);
  const [message, setMessage] = useState("");

  const proposals = initialProposals;
  const selected = proposals.find((p) => p.id === selectedId);

  async function handleVote(value: "yes" | "no") {
    if (!selectedId || voting) return;
    setVoting(true);
    setMessage("");

    const result = await submitVote(selectedId, value);
    if (result.success) {
      setMessage("Vote submitted!");
      router.refresh();
    } else {
      setMessage(result.error ?? "Failed to submit vote");
    }
    setVoting(false);
  }

  if (proposals.length === 0) {
    return (
      <div className="card text-center">
        <p className="text-muted">No open proposals at this time.</p>
      </div>
    );
  }

  return (
    <>
      {proposals.map((p) => (
        <div
          key={p.id}
          className="card"
          style={{ cursor: "pointer", borderLeft: selectedId === p.id ? "3px solid var(--color-gold)" : undefined }}
          onClick={() => { setSelectedId(p.id); setMessage(""); }}
        >
          <div className="flex items-center justify-between">
            <div>
              <h3 style={{ fontSize: 16, fontWeight: 600 }}>{p.title}</h3>
            </div>
            <div className="flex gap-8">
              <span className="badge badge-open">Open</span>
              {p.hasVoted ? (
                <span className="badge badge-voted">Vote Submitted</span>
              ) : (
                <span className="badge badge-pending">Not Voted</span>
              )}
            </div>
          </div>
        </div>
      ))}

      {selected && (
        <div className="card mt-16">
          <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>{selected.title}</h2>
          <p className="text-muted" style={{ lineHeight: 1.6 }}>{selected.description}</p>

          {selected.hasVoted ? (
            <div className="mt-16">
              <span className="badge badge-voted">Vote Submitted</span>
              <p className="text-muted mt-8" style={{ fontSize: 13 }}>
                Your vote has been locked. Results will be visible once the issue reaches an outcome.
              </p>
            </div>
          ) : (
            <div className="vote-buttons">
              <button
                className="btn btn-yes"
                onClick={() => handleVote("yes")}
                disabled={voting}
              >
                YES
              </button>
              <button
                className="btn btn-no"
                onClick={() => handleVote("no")}
                disabled={voting}
              >
                NO
              </button>
            </div>
          )}

          {message && (
            <p className={message.includes("submitted") ? "text-muted mt-8" : "error mt-8"}>
              {message}
            </p>
          )}
        </div>
      )}
    </>
  );
}
