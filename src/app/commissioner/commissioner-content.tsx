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

interface Proposal {
  id: string;
  title: string;
  description: string;
  status: string;
  outcome: string;
  created_at: string;
  opened_at: string | null;
  closed_at: string | null;
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

type Tab = "proposals" | "members";

export default function CommissionerContent({
  initialProposals,
  initialMembers,
}: {
  initialProposals: Proposal[];
  initialMembers: MemberInfo[];
}) {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("proposals");
  const [msg, setMsg] = useState("");
  const [error, setError] = useState("");

  const proposals = initialProposals;
  const members = initialMembers;

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formTitle, setFormTitle] = useState("");
  const [formDesc, setFormDesc] = useState("");

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

    if (editingId) {
      const res = await editProposal(editingId, formTitle, formDesc);
      if (res.success) setMsg("Proposal updated");
      else setError(res.error ?? "Failed");
    } else {
      const res = await createProposal(formTitle, formDesc);
      if (res.success) setMsg("Proposal created");
      else setError(res.error ?? "Failed");
    }

    setShowForm(false);
    setEditingId(null);
    setFormTitle("");
    setFormDesc("");
    router.refresh();
  }

  function startEdit(p: Proposal) {
    setEditingId(p.id);
    setFormTitle(p.title);
    setFormDesc(p.description);
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
        <button className={`tab ${tab === "proposals" ? "active" : ""}`} onClick={() => setTab("proposals")}>
          Proposals
        </button>
        <button className={`tab ${tab === "members" ? "active" : ""}`} onClick={() => setTab("members")}>
          Members
        </button>
      </div>

      {msg && <p style={{ color: "var(--color-green)", fontSize: 14, marginBottom: 12 }}>{msg}</p>}
      {error && <p className="error mb-8">{error}</p>}

      {tab === "proposals" && (
        <>
          <button
            className="btn btn-gold mb-16"
            onClick={() => { setShowForm(true); setEditingId(null); setFormTitle(""); setFormDesc(""); clearMsg(); }}
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
