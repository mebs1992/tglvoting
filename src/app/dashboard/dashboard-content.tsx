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
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [voting, setVoting] = useState(false);
  const [message, setMessage] = useState("");
  const [selectedChoices, setSelectedChoices] = useState<Set<string>>(new Set());

  const proposals = initialProposals;
  const pendingCount = proposals.filter((p) => !p.hasVoted).length;

  function handleToggle(id: string) {
    if (expandedId === id) {
      setExpandedId(null);
    } else {
      setExpandedId(id);
      setMessage("");
      setSelectedChoices(new Set());
    }
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

  async function handleVote(proposalId: string, value: string | string[]) {
    if (voting) return;
    setVoting(true);
    setMessage("");

    const result = await submitVote(proposalId, value);
    if (result.success) {
      setMessage("Vote submitted!");
      setSelectedChoices(new Set());
      router.refresh();
    } else {
      setMessage(result.error ?? "Failed to submit vote");
    }
    setVoting(false);
  }

  return (
    <>
      <div className="page-hero">
        <div className="page-hero-eyebrow">League Business</div>
        <div className="page-hero-title">The Voting Floor</div>
        <div className="page-hero-sub">
          Every vote shapes the league. Make yours count.
        </div>
        <div className="page-hero-count">
          {pendingCount === 0
            ? "✅ All caught up — no votes pending"
            : `\u{1F5F3}️ ${pendingCount} vote${pendingCount === 1 ? "" : "s"} awaiting your call`}
        </div>
      </div>

      {proposals.length === 0 ? (
        <div className="card text-center">
          <p className="text-muted">No open proposals at this time. The floor is quiet&hellip; for now.</p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {proposals.map((p, index) => {
            const isExpanded = expandedId === p.id;

            return (
              <div key={p.id} className={`ballot-card ${isExpanded ? "expanded" : ""}`}>
                <div className="ballot-header" onClick={() => handleToggle(p.id)}>
                  <div className="ballot-number">#{index + 1}</div>
                  <div className="ballot-title">{p.title}</div>
                  {p.hasVoted ? (
                    <span className="ballot-chip ballot-chip-voted">&#10003; Voted</span>
                  ) : (
                    <span className="ballot-chip ballot-chip-pending">Vote Now</span>
                  )}
                  <span className="ballot-chevron">&#9660;</span>
                </div>

                {isExpanded && (
                  <div className="ballot-body">
                    <p className="ballot-desc">{p.description}</p>

                    {p.hasVoted ? (
                      <div className="ballot-voted-banner">
                        <div className="ballot-voted-stamp">&#10003;</div>
                        <div>
                          <div style={{ fontWeight: 800, fontSize: 15, color: "var(--color-green)" }}>
                            Ballot Cast
                          </div>
                          <div style={{ fontSize: 13, color: "var(--color-text-secondary)", marginTop: 2 }}>
                            Your vote is locked in. Results drop once this issue reaches an outcome.
                          </div>
                        </div>
                      </div>
                    ) : p.choices.length > 0 ? (
                      <div>
                        {p.allowMultipleSelections && (
                          <span className="ballot-multi-hint">
                            &#10003;&#10003; Pick as many as you like
                          </span>
                        )}
                        <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 18 }}>
                          {p.choices.map((c) => {
                            const isSelected = selectedChoices.has(c.id);
                            return (
                              <label
                                key={c.id}
                                className={`ballot-choice ${isSelected ? "selected" : ""}`}
                              >
                                <input
                                  type={p.allowMultipleSelections ? "checkbox" : "radio"}
                                  name={`choice-${p.id}`}
                                  checked={isSelected}
                                  onChange={() => toggleChoice(c.id, p.allowMultipleSelections)}
                                />
                                {c.label}
                              </label>
                            );
                          })}
                        </div>
                        <button
                          className="ballot-submit"
                          onClick={() => {
                            const values = Array.from(selectedChoices);
                            if (values.length === 0) return;
                            handleVote(p.id, p.allowMultipleSelections ? values : values[0]);
                          }}
                          disabled={voting || selectedChoices.size === 0}
                        >
                          {voting ? "Submitting…" : "Lock In My Vote"}
                        </button>
                      </div>
                    ) : (
                      <div className="ballot-vote-grid">
                        <button
                          className="ballot-vote-btn ballot-vote-yes"
                          onClick={() => handleVote(p.id, "yes")}
                          disabled={voting}
                        >
                          Yes
                        </button>
                        <button
                          className="ballot-vote-btn ballot-vote-no"
                          onClick={() => handleVote(p.id, "no")}
                          disabled={voting}
                        >
                          No
                        </button>
                      </div>
                    )}

                    {message && (
                      <p
                        style={{
                          marginTop: 14,
                          fontSize: 13,
                          fontWeight: 600,
                          color: message.includes("submitted")
                            ? "var(--color-green)"
                            : "var(--color-red)",
                        }}
                      >
                        {message}
                      </p>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </>
  );
}
