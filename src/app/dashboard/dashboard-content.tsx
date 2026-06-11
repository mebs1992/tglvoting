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

  if (proposals.length === 0) {
    return (
      <div className="card text-center">
        <p className="text-muted">No open proposals at this time.</p>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      {proposals.map((p) => {
        const isExpanded = expandedId === p.id;

        return (
          <div
            key={p.id}
            style={{
              background: "var(--color-bg-card)",
              borderRadius: "var(--radius)",
              boxShadow: isExpanded ? "var(--shadow-lg)" : "var(--shadow)",
              border: isExpanded
                ? "2px solid var(--color-gold)"
                : "1px solid var(--color-border)",
              overflow: "hidden",
              transition: "box-shadow 0.2s, border-color 0.2s",
            }}
          >
            {/* Clickable header */}
            <div
              onClick={() => handleToggle(p.id)}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "16px 20px",
                cursor: "pointer",
                gap: 12,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 12, flex: 1, minWidth: 0 }}>
                <div style={{
                  width: 10,
                  height: 10,
                  borderRadius: "50%",
                  background: p.hasVoted ? "var(--color-green)" : "var(--color-gold)",
                  flexShrink: 0,
                }} />
                <h3 style={{
                  fontSize: 16,
                  fontWeight: 600,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}>
                  {p.title}
                </h3>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
                {p.hasVoted ? (
                  <span className="badge badge-voted">Voted</span>
                ) : (
                  <span className="badge badge-pending">Pending</span>
                )}
                <span style={{
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  width: 24,
                  height: 24,
                  borderRadius: "50%",
                  fontSize: 12,
                  color: "var(--color-text-secondary)",
                  transform: isExpanded ? "rotate(180deg)" : "rotate(0deg)",
                  transition: "transform 0.2s",
                }}>
                  &#9660;
                </span>
              </div>
            </div>

            {/* Expandable voting panel */}
            {isExpanded && (
              <div style={{
                borderTop: "1px solid var(--color-border)",
                padding: "20px 24px",
                background: "linear-gradient(180deg, rgba(201, 168, 76, 0.03) 0%, transparent 100%)",
              }}>
                <p style={{
                  color: "var(--color-text-secondary)",
                  fontSize: 14,
                  lineHeight: 1.7,
                  marginBottom: 20,
                }}>
                  {p.description}
                </p>

                {p.hasVoted ? (
                  <div style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                    padding: "14px 18px",
                    background: "rgba(45, 106, 79, 0.06)",
                    borderRadius: "var(--radius-sm)",
                    border: "1px solid rgba(45, 106, 79, 0.15)",
                  }}>
                    <span style={{ fontSize: 20 }}>&#10003;</span>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: 14, color: "var(--color-green)" }}>
                        Vote Submitted
                      </div>
                      <div style={{ fontSize: 12, color: "var(--color-text-secondary)", marginTop: 2 }}>
                        Your vote is locked. Results visible once the issue reaches an outcome.
                      </div>
                    </div>
                  </div>
                ) : p.choices.length > 0 ? (
                  <div>
                    {p.allowMultipleSelections && (
                      <p style={{
                        fontSize: 13,
                        color: "var(--color-gold)",
                        fontWeight: 600,
                        marginBottom: 12,
                        textTransform: "uppercase",
                        letterSpacing: 0.5,
                      }}>
                        Select one or more options
                      </p>
                    )}
                    <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 20 }}>
                      {p.choices.map((c) => {
                        const isSelected = selectedChoices.has(c.id);
                        return (
                          <label
                            key={c.id}
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: 12,
                              padding: "12px 16px",
                              borderRadius: "var(--radius-sm)",
                              border: isSelected
                                ? "2px solid var(--color-gold)"
                                : "2px solid var(--color-border)",
                              cursor: "pointer",
                              transition: "all 0.15s",
                              background: isSelected
                                ? "rgba(201, 168, 76, 0.08)"
                                : "var(--color-bg-card)",
                              boxShadow: isSelected ? "0 0 0 1px var(--color-gold)" : "none",
                            }}
                          >
                            <input
                              type={p.allowMultipleSelections ? "checkbox" : "radio"}
                              name={`choice-${p.id}`}
                              checked={isSelected}
                              onChange={() => toggleChoice(c.id, p.allowMultipleSelections)}
                              style={{ width: 18, height: 18, accentColor: "var(--color-gold)" }}
                            />
                            <span style={{ fontSize: 15, fontWeight: 500 }}>{c.label}</span>
                          </label>
                        );
                      })}
                    </div>
                    <button
                      className="btn btn-gold"
                      style={{ width: "100%", padding: "12px 20px", fontSize: 15 }}
                      onClick={(e) => {
                        e.stopPropagation();
                        const values = Array.from(selectedChoices);
                        if (values.length === 0) return;
                        handleVote(p.id, p.allowMultipleSelections ? values : values[0]);
                      }}
                      disabled={voting || selectedChoices.size === 0}
                    >
                      {voting ? "Submitting..." : "Submit Vote"}
                    </button>
                  </div>
                ) : (
                  <div style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: 12,
                  }}>
                    <button
                      className="btn"
                      style={{
                        padding: "16px 20px",
                        fontSize: 16,
                        fontWeight: 700,
                        background: "var(--color-green)",
                        color: "#fff",
                        borderRadius: "var(--radius-sm)",
                        border: "none",
                        letterSpacing: 1,
                      }}
                      onClick={(e) => { e.stopPropagation(); handleVote(p.id, "yes"); }}
                      disabled={voting}
                    >
                      YES
                    </button>
                    <button
                      className="btn"
                      style={{
                        padding: "16px 20px",
                        fontSize: 16,
                        fontWeight: 700,
                        background: "var(--color-red)",
                        color: "#fff",
                        borderRadius: "var(--radius-sm)",
                        border: "none",
                        letterSpacing: 1,
                      }}
                      onClick={(e) => { e.stopPropagation(); handleVote(p.id, "no"); }}
                      disabled={voting}
                    >
                      NO
                    </button>
                  </div>
                )}

                {message && (
                  <p style={{
                    marginTop: 12,
                    fontSize: 13,
                    color: message.includes("submitted") ? "var(--color-green)" : "var(--color-red)",
                    fontWeight: 500,
                  }}>
                    {message}
                  </p>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
