"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  createProposal,
  editProposal,
  openProposal,
  closeProposal,
  resetMemberPin,
  updateMember,
  setCommissioner,
  getProposalVotingRecord,
} from "@/app/actions/commissioner-actions";

interface ProposalChoice {
  id: string;
  label: string;
  display_order: number;
}

interface Proposal {
  id: string;
  title: string;
  description: string;
  status: string;
  outcome: string;
  allow_multiple_selections: boolean;
  created_at: string;
  opened_at: string | null;
  closed_at: string | null;
  choices: ProposalChoice[];
}

interface MemberInfo {
  id: string;
  display_name: string;
  team_name: string | null;
  is_commissioner: boolean;
  pin_created_at: string | null;
}

interface VotingRecord {
  proposal: { id: string; title: string; status: string; outcome: string };
  votes: { memberName: string; voteValue: string; votedAt: string }[];
  notVoted: string[];
}

interface TrackerProposal {
  id: string;
  title: string;
  votedCount: number;
  totalMembers: number;
  voted: { name: string; votedAt: string }[];
  notVoted: string[];
}

type Tab = "tracker" | "proposals" | "members";

export default function CommissionerContent({
  initialProposals,
  initialMembers,
  initialTracker,
}: {
  initialProposals: Proposal[];
  initialMembers: MemberInfo[];
  initialTracker: TrackerProposal[];
}) {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("tracker");
  const [msg, setMsg] = useState("");
  const [error, setError] = useState("");

  const proposals = initialProposals;
  const members = initialMembers;
  const tracker = initialTracker;

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formTitle, setFormTitle] = useState("");
  const [formDesc, setFormDesc] = useState("");
  const [formChoices, setFormChoices] = useState<string[]>([]);
  const [formAllowMultiple, setFormAllowMultiple] = useState(false);

  const [votingRecord, setVotingRecord] = useState<VotingRecord | null>(null);

  const [editingMemberId, setEditingMemberId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editTeam, setEditTeam] = useState("");

  function clearMsg() {
    setMsg("");
    setError("");
  }

  async function handleCreateOrEdit() {
    clearMsg();
    if (!formTitle.trim() || !formDesc.trim()) {
      setError("Title and description are required");
      return;
    }
    const validChoices = formChoices.filter((c) => c.trim() !== "");
    if (validChoices.length === 1) {
      setError("Add at least 2 choices, or remove all choices for a Yes/No vote");
      return;
    }

    if (editingId) {
      const res = await editProposal(editingId, formTitle, formDesc, validChoices, formAllowMultiple);
      if (res.success) setMsg("Proposal updated");
      else setError(res.error ?? "Failed");
    } else {
      const res = await createProposal(formTitle, formDesc, validChoices, formAllowMultiple);
      if (res.success) setMsg("Proposal created");
      else setError(res.error ?? "Failed");
    }

    setShowForm(false);
    setEditingId(null);
    setFormTitle("");
    setFormDesc("");
    setFormChoices([]);
    setFormAllowMultiple(false);
    router.refresh();
  }

  function startEdit(p: Proposal) {
    setEditingId(p.id);
    setFormTitle(p.title);
    setFormDesc(p.description);
    setFormChoices(p.choices.map((c) => c.label));
    setFormAllowMultiple(p.allow_multiple_selections);
    setShowForm(true);
    clearMsg();
  }

  async function handleOpen(id: string) {
    clearMsg();
    const res = await openProposal(id);
    if (res.success) setMsg("Proposal opened");
    else setError(res.error ?? "Failed");
    router.refresh();
  }

  async function handleClose(id: string) {
    clearMsg();
    const res = await closeProposal(id);
    if (res.success) setMsg("Proposal closed");
    else setError(res.error ?? "Failed");
    router.refresh();
  }

  async function handleViewRecord(id: string) {
    const data = await getProposalVotingRecord(id);
    setVotingRecord(data as VotingRecord | null);
  }

  async function handleResetPin(id: string) {
    clearMsg();
    if (!confirm("Reset this member's PIN?")) return;
    const res = await resetMemberPin(id);
    if (res.success) setMsg("PIN reset");
    else setError(res.error ?? "Failed");
    router.refresh();
  }

  async function handleUpdateMember() {
    if (!editingMemberId) return;
    clearMsg();
    const res = await updateMember(editingMemberId, editName, editTeam);
    if (res.success) setMsg("Member updated");
    else setError(res.error ?? "Failed");
    setEditingMemberId(null);
    router.refresh();
  }

  async function handleToggleCommissioner(id: string, current: boolean) {
    clearMsg();
    const action = current ? "Remove" : "Grant";
    if (!confirm(`${action} commissioner privileges?`)) return;
    const res = await setCommissioner(id, !current);
    if (res.success) setMsg(`Commissioner privileges ${current ? "removed" : "granted"}`);
    else setError(res.error ?? "Failed");
    router.refresh();
  }

  return (
    <>
      <div className="tabs">
        <button className={`tab ${tab === "tracker" ? "active" : ""}`} onClick={() => setTab("tracker")}>
          Vote Tracker
        </button>
        <button className={`tab ${tab === "proposals" ? "active" : ""}`} onClick={() => setTab("proposals")}>
          Proposals
        </button>
        <button className={`tab ${tab === "members" ? "active" : ""}`} onClick={() => setTab("members")}>
          Members
        </button>
      </div>

      {msg && <p style={{ color: "var(--color-green)", fontSize: 14, marginBottom: 12 }}>{msg}</p>}
      {error && <p className="error mb-8">{error}</p>}

      {tab === "tracker" && (
        <>
          {tracker.length === 0 ? (
            <div className="card text-center">
              <p className="text-muted">No open proposals. Open a proposal to start tracking votes.</p>
            </div>
          ) : (
            tracker.map((t) => (
              <div key={t.id} className="card">
                <div className="flex items-center justify-between mb-8">
                  <h3 style={{ fontSize: 16, fontWeight: 600 }}>{t.title}</h3>
                  <span style={{ fontSize: 14, fontWeight: 700, color: "var(--color-navy)" }}>
                    {t.votedCount} / {t.totalMembers} voted
                  </span>
                </div>

                <div style={{
                  height: 6,
                  background: "var(--color-border)",
                  borderRadius: 3,
                  overflow: "hidden",
                  marginBottom: 16,
                }}>
                  <div style={{
                    height: "100%",
                    width: `${(t.votedCount / t.totalMembers) * 100}%`,
                    background: t.votedCount === t.totalMembers ? "var(--color-green)" : "var(--color-gold)",
                    borderRadius: 3,
                    transition: "width 0.3s",
                  }} />
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 600, color: "var(--color-green)", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 6 }}>
                      Voted ({t.voted.length})
                    </div>
                    {t.voted.length === 0 ? (
                      <p className="text-muted" style={{ fontSize: 13 }}>No votes yet</p>
                    ) : (
                      <ul className="voter-list">
                        {t.voted.map((v) => (
                          <li key={v.name} style={{ fontSize: 13, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                            <span>{v.name}</span>
                            <span className="text-muted" style={{ fontSize: 11 }}>
                              {new Date(v.votedAt).toLocaleDateString()}
                            </span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 600, color: "var(--color-red)", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 6 }}>
                      Not Voted ({t.notVoted.length})
                    </div>
                    {t.notVoted.length === 0 ? (
                      <p className="text-muted" style={{ fontSize: 13 }}>Everyone has voted!</p>
                    ) : (
                      <ul className="voter-list">
                        {t.notVoted.map((name) => (
                          <li key={name} style={{ fontSize: 13, color: "var(--color-red)" }}>{name}</li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
          <p className="text-muted mt-16 text-center" style={{ fontSize: 12 }}>
            Only participation is shown — individual votes are not revealed here.
          </p>
        </>
      )}

      {tab === "proposals" && (
        <>
          <button
            className="btn btn-gold mb-16"
            onClick={() => { setShowForm(true); setEditingId(null); setFormTitle(""); setFormDesc(""); setFormChoices([]); setFormAllowMultiple(false); clearMsg(); }}
          >
            + Create Proposal
          </button>

          {showForm && (
            <div className="card mb-16">
              <h3 className="section-title">{editingId ? "Edit Proposal" : "New Proposal"}</h3>
              <div className="form-group">
                <label>Title</label>
                <input className="input" value={formTitle} onChange={(e) => setFormTitle(e.target.value)} />
              </div>
              <div className="form-group">
                <label>Description</label>
                <textarea className="input" value={formDesc} onChange={(e) => setFormDesc(e.target.value)} />
              </div>

              <div className="form-group">
                <label>Answer Choices <span className="text-muted" style={{ fontSize: 12, fontWeight: 400 }}>(leave empty for Yes/No)</span></label>
                {formChoices.map((choice, i) => (
                  <div key={i} className="flex gap-8 mb-8" style={{ alignItems: "center" }}>
                    <input
                      className="input"
                      style={{ flex: 1 }}
                      placeholder={`Choice ${i + 1}`}
                      value={choice}
                      onChange={(e) => {
                        const updated = [...formChoices];
                        updated[i] = e.target.value;
                        setFormChoices(updated);
                      }}
                    />
                    <button
                      className="btn btn-sm btn-outline"
                      style={{ borderColor: "var(--color-red)", color: "var(--color-red)", flexShrink: 0 }}
                      onClick={() => {
                        const updated = formChoices.filter((_, idx) => idx !== i);
                        setFormChoices(updated);
                        if (updated.length === 0) setFormAllowMultiple(false);
                      }}
                    >
                      Remove
                    </button>
                  </div>
                ))}
                <button
                  className="btn btn-sm btn-outline"
                  onClick={() => setFormChoices([...formChoices, ""])}
                >
                  + Add Choice
                </button>
              </div>

              {formChoices.length >= 2 && (
                <div className="form-group">
                  <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
                    <input
                      type="checkbox"
                      checked={formAllowMultiple}
                      onChange={(e) => setFormAllowMultiple(e.target.checked)}
                      style={{ width: 16, height: 16 }}
                    />
                    Allow multiple selections
                  </label>
                  <span className="text-muted" style={{ fontSize: 12 }}>
                    Members can select more than one answer
                  </span>
                </div>
              )}

              <div className="flex gap-8">
                <button className="btn btn-primary" onClick={handleCreateOrEdit}>
                  {editingId ? "Save Changes" : "Create"}
                </button>
                <button className="btn btn-outline" onClick={() => { setShowForm(false); setEditingId(null); }}>
                  Cancel
                </button>
              </div>
            </div>
          )}

          {proposals.map((p) => (
            <div key={p.id} className="card">
              <div className="flex items-center justify-between mb-8">
                <h3 style={{ fontSize: 16, fontWeight: 600 }}>{p.title}</h3>
                <div className="flex gap-8">
                  <span className={`badge badge-${p.status}`}>{p.status}</span>
                  {p.outcome !== "pending" && (
                    <span className={`badge ${p.outcome === "passed" ? "badge-passed" : "badge-failed"}`}>
                      {p.outcome}
                    </span>
                  )}
                </div>
              </div>
              <p className="text-muted" style={{ fontSize: 13 }}>{p.description}</p>
              {p.choices.length > 0 && (
                <div style={{ fontSize: 12, marginTop: 6, color: "var(--color-text-secondary)" }}>
                  Choices: {p.choices.map((c) => c.label).join(", ")}
                  {p.allow_multiple_selections && (
                    <span style={{ marginLeft: 8, color: "var(--color-gold)", fontWeight: 600 }}>
                      (Multi-select)
                    </span>
                  )}
                </div>
              )}
              <div className="flex gap-8 mt-12 flex-wrap">
                {p.status === "draft" && (
                  <>
                    <button className="btn btn-sm btn-primary" onClick={() => handleOpen(p.id)}>Open</button>
                    <button className="btn btn-sm btn-outline" onClick={() => startEdit(p)}>Edit</button>
                  </>
                )}
                {p.status === "open" && (
                  <>
                    <button className="btn btn-sm btn-outline" onClick={() => startEdit(p)}>Edit</button>
                    <button className="btn btn-sm btn-no" onClick={() => handleClose(p.id)}>Close</button>
                  </>
                )}
                <button className="btn btn-sm btn-outline" onClick={() => handleViewRecord(p.id)}>
                  Voting Record
                </button>
              </div>
            </div>
          ))}

          {votingRecord && (
            <div className="card mt-16" style={{ borderColor: "var(--color-gold)" }}>
              <div className="flex items-center justify-between mb-8">
                <h3 style={{ fontSize: 16, fontWeight: 600 }}>
                  Voting Record: {votingRecord.proposal.title}
                </h3>
                <button className="btn btn-sm btn-outline" onClick={() => setVotingRecord(null)}>Close</button>
              </div>
              <div className="flex gap-8 mb-8">
                <span className={`badge badge-${votingRecord.proposal.status}`}>{votingRecord.proposal.status}</span>
                {votingRecord.proposal.outcome !== "pending" && (
                  <span className={`badge ${votingRecord.proposal.outcome === "passed" ? "badge-passed" : "badge-failed"}`}>
                    {votingRecord.proposal.outcome}
                  </span>
                )}
              </div>
              <table style={{ width: "100%", fontSize: 14, borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ borderBottom: "1px solid var(--color-border)" }}>
                    <th style={{ textAlign: "left", padding: "6px 0" }}>Member</th>
                    <th style={{ textAlign: "left", padding: "6px 0" }}>Vote</th>
                    <th style={{ textAlign: "left", padding: "6px 0" }}>Time</th>
                  </tr>
                </thead>
                <tbody>
                  {votingRecord.votes.map((v, i) => (
                    <tr key={i} style={{ borderBottom: "1px solid var(--color-border)" }}>
                      <td style={{ padding: "6px 0" }}>{v.memberName}</td>
                      <td style={{ padding: "6px 0" }}>
                        <span style={{ color: v.voteValue === "yes" ? "var(--color-green)" : "var(--color-red)", fontWeight: 600 }}>
                          {v.voteValue.toUpperCase()}
                        </span>
                      </td>
                      <td style={{ padding: "6px 0" }} className="text-muted">
                        {new Date(v.votedAt).toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {votingRecord.notVoted.length > 0 && (
                <div className="mt-12">
                  <span className="text-muted" style={{ fontSize: 13 }}>
                    Not voted: {votingRecord.notVoted.join(", ")}
                  </span>
                </div>
              )}
            </div>
          )}
        </>
      )}

      {tab === "members" && (
        <>
          {members.map((m) => (
            <div key={m.id} className="card">
              {editingMemberId === m.id ? (
                <div>
                  <div className="form-group">
                    <label>Display Name</label>
                    <input className="input" value={editName} onChange={(e) => setEditName(e.target.value)} />
                  </div>
                  <div className="form-group">
                    <label>Team Name</label>
                    <input className="input" value={editTeam} onChange={(e) => setEditTeam(e.target.value)} />
                  </div>
                  <div className="flex gap-8">
                    <button className="btn btn-sm btn-primary" onClick={handleUpdateMember}>Save</button>
                    <button className="btn btn-sm btn-outline" onClick={() => setEditingMemberId(null)}>Cancel</button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-between">
                  <div>
                    <span style={{ fontWeight: 600 }}>{m.display_name}</span>
                    {m.team_name && <span className="text-muted" style={{ marginLeft: 8 }}>({m.team_name})</span>}
                    {m.is_commissioner && (
                      <span className="badge" style={{ marginLeft: 8, background: "var(--color-gold)", color: "var(--color-navy)", fontSize: 10 }}>
                        Commissioner
                      </span>
                    )}
                    {!m.pin_created_at && (
                      <span className="text-muted" style={{ marginLeft: 8, fontSize: 12 }}>No PIN</span>
                    )}
                  </div>
                  <div className="flex gap-8 flex-wrap">
                    <button
                      className="btn btn-sm btn-outline"
                      onClick={() => { setEditingMemberId(m.id); setEditName(m.display_name); setEditTeam(m.team_name ?? ""); }}
                    >
                      Edit
                    </button>
                    {m.pin_created_at && (
                      <button className="btn btn-sm btn-outline" onClick={() => handleResetPin(m.id)}>
                        Reset PIN
                      </button>
                    )}
                    <button
                      className="btn btn-sm btn-outline"
                      style={m.is_commissioner ? { borderColor: "var(--color-red)", color: "var(--color-red)" } : { borderColor: "var(--color-gold)", color: "var(--color-gold)" }}
                      onClick={() => handleToggleCommissioner(m.id, m.is_commissioner)}
                    >
                      {m.is_commissioner ? "Remove Commissioner" : "Grant Commissioner"}
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </>
      )}
    </>
  );
}
