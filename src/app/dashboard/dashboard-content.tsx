"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { submitVote } from "@/app/actions/vote-actions";

interface Choice {
  id: string;
  label: string;
}

interface Proposal {
  id: string;
  title: string;
  description: string;
  status: string;
  hasVoted: boolean;
  allowMultipleSelections: boolean;
  choices: Choice[];
}

export default function DashboardContent({ initialProposals }: { initialProposals: Proposal[] }) {
  const router = useRouter();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [voting, setVoting] = useState(false);
  const [message, setMessage] = useState("");
  const [selectedChoices, setSelectedChoices] = useState<Set<string>>(new Set());

  const proposals = initialProposals;
  const selected = proposals.find((p) => p.id === selectedId);

  function handleSelectProposal(id: string) {
    setSelectedId(id);
    setMessage("");
    setSelectedChoices(new Set());
  }

  function toggleChoice(choiceId: string, allowMultiple: boolean) {
    setSelectedChoices((prev) => {
      const next = new Set(prev);
      if (next.has(choiceId)) {
        next.delete(choiceId);
      } else {
        if (!allowMultiple) next.clear();
        next.add(choiceId);
      }
      return next;
    });
  }

  async function handleVote(value: string | string[]) {
    if (!selectedId || voting) return;
    setVoting(true);
    setMessage("");

    const result = await submitVote(selectedId, value);
    if (result.success) {
      setMessage("Vote submitted!");
      setSelectedChoices(new Set());
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
          onClick={() => handleSelectProposal(p.id)}
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
          ) : selected.choices.length > 0 ? (
            <div className="mt-16">
              {selected.allowMultipleSelections && (
                <p className="text-muted mb-8" style={{ fontSize: 13 }}>
                  Select one or more options:
                </p>
              )}
              <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 16 }}>
                {selected.choices.map((c) => (
                  <label
                    key={c.id}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 10,
                      padding: "10px 14px",
                      borderRadius: 8,
                      border: selectedChoices.has(c.id)
                        ? "2px solid var(--color-gold)"
                        : "2px solid var(--color-border)",
                      cursor: "pointer",
                      transition: "border-color 0.2s",
                      background: selectedChoices.has(c.id) ? "rgba(196, 164, 75, 0.08)" : "transparent",
                    }}
                  >
                    <input
                      type={selected.allowMultipleSelections ? "checkbox" : "radio"}
                      name={`choice-${selected.id}`}
                      checked={selectedChoices.has(c.id)}
                      onChange={() => toggleChoice(c.id, selected.allowMultipleSelections)}
                      style={{ width: 18, height: 18, accentColor: "var(--color-gold)" }}
                    />
                    <span style={{ fontSize: 15, fontWeight: 500 }}>{c.label}</span>
                  </label>
                ))}
              </div>
              <button
                className="btn btn-primary"
                onClick={() => {
                  const values = Array.from(selectedChoices);
                  if (values.length === 0) return;
                  handleVote(selected.allowMultipleSelections ? values : values[0]);
                }}
                disabled={voting || selectedChoices.size === 0}
              >
                {voting ? "Submitting..." : "Submit Vote"}
              </button>
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
