"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  assignNation,
  removeNation,
  eliminateNation,
  reactivateNation,
  updateNationStats,
  overrideDraftPosition,
  syncFromApi,
  autoSync,
} from "@/app/actions/draft-tracker-actions";
import type { DraftEntryWithMember } from "@/app/actions/draft-tracker-actions";
import { STAGE_LABELS, TOTAL_PICKS } from "@/lib/draft-calculator";

interface Props {
  entries: DraftEntryWithMember[];
  members: { id: string; display_name: string; team_name: string | null }[];
  isCommissioner: boolean;
}

function flagEmoji(code: string | null): string {
  if (!code || code.length !== 2) return "";
  return String.fromCodePoint(
    ...code
      .toUpperCase()
      .split("")
      .map((c) => 0x1f1a5 + c.charCodeAt(0))
  );
}

const STAGES = Object.entries(STAGE_LABELS);

export default function DraftTrackerContent({
  entries,
  members,
  isCommissioner,
}: Props) {
  const router = useRouter();
  const [syncing, setSyncing] = useState(false);
  const [syncMsg, setSyncMsg] = useState("");
  const [autoSyncing, setAutoSyncing] = useState(true);
  const didAutoSync = useRef(false);

  useEffect(() => {
    if (didAutoSync.current) return;
    didAutoSync.current = true;
    autoSync().then((result) => {
      setAutoSyncing(false);
      if (result.success && result.updated && result.updated > 0) {
        router.refresh();
      }
    });
  }, [router]);

  async function handleSync() {
    setSyncing(true);
    setSyncMsg("");
    const result = await syncFromApi();
    if (result.success) {
      setSyncMsg(`Synced ${result.updated ?? 0} nations`);
      router.refresh();
    } else {
      setSyncMsg(result.error ?? "Sync failed");
    }
    setSyncing(false);
  }

  const determined = entries.filter(
    (e) => e.effective_position !== null
  ).length;

  const sorted = [...entries].sort((a, b) => {
    if (a.status === "active" && b.status !== "active") return -1;
    if (a.status !== "active" && b.status === "active") return 1;
    const ptsA = a.group_wins * 3 + a.group_draws;
    const ptsB = b.group_wins * 3 + b.group_draws;
    if (ptsA !== ptsB) return ptsB - ptsA;
    return b.goal_differential - a.goal_differential;
  });

  return (
    <div className="draft-tracker-page">
      {autoSyncing && (
        <div className="sync-banner">
          <div className="sync-spinner" />
          Syncing latest results&hellip;
        </div>
      )}

      {isCommissioner && (
        <div className="flex items-center justify-between mb-16">
          <button
            className="btn btn-gold"
            onClick={handleSync}
            disabled={syncing}
          >
            {syncing ? "Syncing..." : "Sync Results"}
          </button>
          {syncMsg && (
            <span
              className={`text-muted ${syncMsg.includes("fail") || syncMsg.includes("error") ? "error" : ""}`}
              style={{ fontSize: 13 }}
            >
              {syncMsg}
            </span>
          )}
        </div>
      )}

      <NationStatsTable
        entries={sorted}
        isCommissioner={isCommissioner}
        onRefresh={() => router.refresh()}
      />

      <div className="mt-24">
        <DraftBoard
          entries={entries}
          isCommissioner={isCommissioner}
          determined={determined}
          onRefresh={() => router.refresh()}
        />
      </div>

      {isCommissioner && (
        <div className="mt-24">
          <h2 className="section-title">Assign Nations</h2>
          <AssignNationForm
            entries={entries}
            members={members}
            onRefresh={() => router.refresh()}
          />
        </div>
      )}
    </div>
  );
}

function NationStatsTable({
  entries,
  isCommissioner,
  onRefresh,
}: {
  entries: DraftEntryWithMember[];
  isCommissioner: boolean;
  onRefresh: () => void;
}) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [elimId, setElimId] = useState<string | null>(null);

  if (entries.length === 0) {
    return (
      <div className="card text-center">
        <p className="text-muted">
          No nations assigned yet.
          {isCommissioner && " Use the form below to assign nations to members."}
        </p>
      </div>
    );
  }

  return (
    <div className="card" style={{ padding: 0, overflow: "hidden" }}>
      <div className="standings-table-wrap">
        <table className="standings-table">
          <thead>
            <tr>
              <th className="standings-th"></th>
              <th className="standings-th standings-th-left">Nation</th>
              <th className="standings-th standings-th-left">GM</th>
              <th className="standings-th">GP</th>
              <th className="standings-th">W</th>
              <th className="standings-th">L</th>
              <th className="standings-th">D</th>
              <th className="standings-th">GD</th>
              <th className="standings-th">Status</th>
              {isCommissioner && (
                <th className="standings-th"></th>
              )}
            </tr>
          </thead>
          <tbody>
            {entries.map((entry) => (
              <NationRow
                key={entry.id}
                entry={entry}
                isCommissioner={isCommissioner}
                isEditing={editingId === entry.id}
                isEliminating={elimId === entry.id}
                onEdit={() => {
                  setEditingId(entry.id);
                  setElimId(null);
                }}
                onEliminate={() => {
                  setElimId(entry.id);
                  setEditingId(null);
                }}
                onCancel={() => {
                  setEditingId(null);
                  setElimId(null);
                }}
                onRefresh={onRefresh}
              />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function NationRow({
  entry,
  isCommissioner,
  isEditing,
  isEliminating,
  onEdit,
  onEliminate,
  onCancel,
  onRefresh,
}: {
  entry: DraftEntryWithMember;
  isCommissioner: boolean;
  isEditing: boolean;
  isEliminating: boolean;
  onEdit: () => void;
  onEliminate: () => void;
  onCancel: () => void;
  onRefresh: () => void;
}) {
  const [w, setW] = useState(entry.group_wins.toString());
  const [l, setL] = useState(entry.group_losses.toString());
  const [d, setD] = useState(entry.group_draws.toString());
  const [gd, setGd] = useState(entry.goal_differential.toString());
  const [elimStage, setElimStage] = useState("group_stage");
  const [saving, setSaving] = useState(false);

  const isActive = entry.status === "active";
  const isChampion = entry.elimination_stage === "champion";
  const gp = entry.group_wins + entry.group_losses + entry.group_draws;

  async function saveStats() {
    setSaving(true);
    await updateNationStats(
      entry.id,
      parseInt(w) || 0,
      parseInt(l) || 0,
      parseInt(d) || 0,
      parseInt(gd) || 0
    );
    onCancel();
    onRefresh();
    setSaving(false);
  }

  async function handleEliminate() {
    setSaving(true);
    await eliminateNation(
      entry.id,
      elimStage,
      parseInt(w) || 0,
      parseInt(l) || 0,
      parseInt(d) || 0,
      parseInt(gd) || 0
    );
    onCancel();
    onRefresh();
    setSaving(false);
  }

  async function handleReactivate() {
    setSaving(true);
    await reactivateNation(entry.id);
    onRefresh();
    setSaving(false);
  }

  async function handleRemove() {
    setSaving(true);
    await removeNation(entry.id);
    onRefresh();
    setSaving(false);
  }

  if (isEditing) {
    return (
      <tr className="standings-tr">
        <td className="standings-td" colSpan={isCommissioner ? 10 : 9}>
          <div className="standings-edit-row">
            <span style={{ fontWeight: 600, marginRight: 12 }}>
              {flagEmoji(entry.nation_code)} {entry.nation_name}
            </span>
            <div className="record-inputs-inline">
              <label>W</label>
              <input className="input input-mini" type="number" min={0} value={w} onChange={(e) => setW(e.target.value)} />
              <label>L</label>
              <input className="input input-mini" type="number" min={0} value={l} onChange={(e) => setL(e.target.value)} />
              <label>D</label>
              <input className="input input-mini" type="number" min={0} value={d} onChange={(e) => setD(e.target.value)} />
              <label>GD</label>
              <input className="input input-mini" type="number" value={gd} onChange={(e) => setGd(e.target.value)} />
            </div>
            <button className="btn btn-primary btn-sm" onClick={saveStats} disabled={saving}>
              {saving ? "..." : "Save"}
            </button>
            <button className="btn btn-outline btn-sm" onClick={onCancel}>Cancel</button>
          </div>
        </td>
      </tr>
    );
  }

  if (isEliminating) {
    return (
      <tr className="standings-tr">
        <td className="standings-td" colSpan={isCommissioner ? 10 : 9}>
          <div className="standings-edit-row">
            <span style={{ fontWeight: 600, marginRight: 12 }}>
              Eliminate {flagEmoji(entry.nation_code)} {entry.nation_name}
            </span>
            <select className="select" value={elimStage} onChange={(e) => setElimStage(e.target.value)} style={{ width: "auto", padding: "4px 28px 4px 8px", fontSize: 13 }}>
              {STAGES.map(([key, label]) => (
                <option key={key} value={key}>{label}</option>
              ))}
            </select>
            <div className="record-inputs-inline">
              <label>W</label>
              <input className="input input-mini" type="number" min={0} value={w} onChange={(e) => setW(e.target.value)} />
              <label>L</label>
              <input className="input input-mini" type="number" min={0} value={l} onChange={(e) => setL(e.target.value)} />
              <label>D</label>
              <input className="input input-mini" type="number" min={0} value={d} onChange={(e) => setD(e.target.value)} />
              <label>GD</label>
              <input className="input input-mini" type="number" value={gd} onChange={(e) => setGd(e.target.value)} />
            </div>
            <button className="btn btn-no btn-sm" onClick={handleEliminate} disabled={saving}>
              {saving ? "..." : "Confirm"}
            </button>
            <button className="btn btn-outline btn-sm" onClick={onCancel}>Cancel</button>
          </div>
        </td>
      </tr>
    );
  }

  return (
    <tr className={`standings-tr ${!isActive ? "standings-tr-eliminated" : ""} ${isChampion ? "standings-tr-champion" : ""}`}>
      <td className="standings-td standings-td-flag">
        {flagEmoji(entry.nation_code)}
      </td>
      <td className="standings-td standings-td-left">
        <span className="standings-nation">{entry.nation_name}</span>
      </td>
      <td className="standings-td standings-td-left">
        <span className="standings-gm">{entry.display_name}</span>
      </td>
      <td className="standings-td standings-td-num">{gp}</td>
      <td className="standings-td standings-td-num">{entry.group_wins}</td>
      <td className="standings-td standings-td-num">{entry.group_losses}</td>
      <td className="standings-td standings-td-num">{entry.group_draws}</td>
      <td className="standings-td standings-td-num">
        <span className={entry.goal_differential > 0 ? "gd-positive" : entry.goal_differential < 0 ? "gd-negative" : ""}>
          {entry.goal_differential > 0 ? "+" : ""}{entry.goal_differential}
        </span>
      </td>
      <td className="standings-td">
        <span className={`badge ${isChampion ? "badge-champion" : isActive ? "badge-active" : "badge-eliminated"}`}>
          {isChampion
            ? "Champion"
            : isActive
              ? "Active"
              : STAGE_LABELS[entry.elimination_stage ?? ""] ?? "Eliminated"}
        </span>
      </td>
      {isCommissioner && (
        <td className="standings-td standings-td-actions">
          <button className="edit-icon-btn" onClick={onEdit} title="Edit stats">
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
              <path d="M11.013 1.427a1.75 1.75 0 012.474 0l1.086 1.086a1.75 1.75 0 010 2.474l-8.61 8.61c-.21.21-.47.364-.756.442l-3.251.93a.75.75 0 01-.927-.928l.929-3.25a1.75 1.75 0 01.442-.756l8.613-8.608zm1.414 1.06a.25.25 0 00-.354 0L3.46 11.1a.25.25 0 00-.063.108l-.558 1.953 1.953-.558a.25.25 0 00.108-.063l8.613-8.613a.25.25 0 000-.354l-1.086-1.086z" fill="currentColor" />
            </svg>
          </button>
          {isActive ? (
            <button className="edit-icon-btn" onClick={onEliminate} title="Eliminate" style={{ color: "var(--color-red)" }}>
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                <path d="M8 1a7 7 0 100 14A7 7 0 008 1zm3 8H5V7h6v1z" fill="currentColor" />
              </svg>
            </button>
          ) : (
            <button className="edit-icon-btn" onClick={handleReactivate} disabled={saving} title="Reactivate" style={{ color: "var(--color-green)" }}>
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                <path d="M8 1a7 7 0 100 14A7 7 0 008 1zm1 10H7V7.41L5.46 8.95 4.05 7.54 8 3.59l3.95 3.95-1.41 1.41L9 7.41V11z" fill="currentColor" />
              </svg>
            </button>
          )}
          <button className="edit-icon-btn" onClick={handleRemove} disabled={saving} title="Remove">
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
              <path d="M5.5 5.5v6m5-6v6m-8-8h11m-2 0l-.5 8.5a1.5 1.5 0 01-1.5 1.5h-5a1.5 1.5 0 01-1.5-1.5L3.5 3.5m3-2h3" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </td>
      )}
    </tr>
  );
}

function DraftBoard({
  entries,
  isCommissioner,
  determined,
  onRefresh,
}: {
  entries: DraftEntryWithMember[];
  isCommissioner: boolean;
  determined: number;
  onRefresh: () => void;
}) {
  const picks: (DraftEntryWithMember | null)[] = Array.from(
    { length: TOTAL_PICKS },
    () => null
  );
  for (const entry of entries) {
    if (
      entry.effective_position !== null &&
      entry.effective_position >= 1 &&
      entry.effective_position <= TOTAL_PICKS
    ) {
      picks[entry.effective_position - 1] = entry;
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <h2 className="section-title" style={{ marginBottom: 0 }}>
          2026 Draft Order
        </h2>
        <span className="badge badge-open">
          {determined} of {TOTAL_PICKS} determined
        </span>
      </div>
      <div className="draft-board">
        {picks.map((entry, i) => {
          const pickNum = i + 1;
          const isDetermined = entry !== null;
          const isChampion = entry?.elimination_stage === "champion";
          return (
            <div
              key={pickNum}
              className={`draft-pick-item ${isDetermined ? "determined" : "tbd"} ${isChampion ? "champion" : ""}`}
            >
              <span className="draft-pick-number">Pick {pickNum}</span>
              {isDetermined ? (
                <div className="draft-pick-details">
                  <span className="draft-pick-flag">
                    {flagEmoji(entry.nation_code)}
                  </span>
                  <span className="draft-pick-gm">{entry.display_name}</span>
                  <span className="draft-pick-nation">
                    {entry.nation_name}
                  </span>
                  <span
                    className={`badge ${isChampion ? "badge-champion" : "badge-eliminated"}`}
                    style={{ marginLeft: "auto", fontSize: 11 }}
                  >
                    {isChampion
                      ? "Champion"
                      : STAGE_LABELS[entry.elimination_stage ?? ""] ??
                        entry.elimination_stage}
                  </span>
                  {entry.draft_position_override !== null && (
                    <span className="override-indicator">Override</span>
                  )}
                </div>
              ) : (
                <span className="draft-pick-tbd">TBD</span>
              )}
              {isCommissioner && isDetermined && (
                <PositionOverride entry={entry} onRefresh={onRefresh} />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function PositionOverride({
  entry,
  onRefresh,
}: {
  entry: DraftEntryWithMember;
  onRefresh: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [pos, setPos] = useState(
    entry.draft_position_override?.toString() ?? ""
  );
  const [saving, setSaving] = useState(false);

  async function save() {
    setSaving(true);
    const numPos = pos.trim() === "" ? null : parseInt(pos, 10);
    if (numPos !== null && (isNaN(numPos) || numPos < 1 || numPos > 12)) {
      setSaving(false);
      return;
    }
    await overrideDraftPosition(entry.id, numPos);
    setEditing(false);
    onRefresh();
    setSaving(false);
  }

  if (!editing) {
    return (
      <button
        className="edit-icon-btn"
        onClick={(e) => {
          e.stopPropagation();
          setEditing(true);
        }}
        title="Override position"
      >
        <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
          <path
            d="M11.013 1.427a1.75 1.75 0 012.474 0l1.086 1.086a1.75 1.75 0 010 2.474l-8.61 8.61c-.21.21-.47.364-.756.442l-3.251.93a.75.75 0 01-.927-.928l.929-3.25a1.75 1.75 0 01.442-.756l8.613-8.608zm1.414 1.06a.25.25 0 00-.354 0L3.46 11.1a.25.25 0 00-.063.108l-.558 1.953 1.953-.558a.25.25 0 00.108-.063l8.613-8.613a.25.25 0 000-.354l-1.086-1.086z"
            fill="currentColor"
          />
        </svg>
      </button>
    );
  }

  return (
    <div
      className="flex gap-8 items-center"
      onClick={(e) => e.stopPropagation()}
    >
      <input
        className="input"
        style={{ width: 60, padding: "4px 8px", fontSize: 13 }}
        value={pos}
        onChange={(e) => setPos(e.target.value)}
        placeholder="#"
        type="number"
        min={1}
        max={12}
      />
      <button
        className="btn btn-primary btn-sm"
        style={{ padding: "4px 10px", fontSize: 12 }}
        onClick={save}
        disabled={saving}
      >
        Set
      </button>
      <button
        className="btn btn-outline btn-sm"
        style={{ padding: "4px 10px", fontSize: 12 }}
        onClick={() => setEditing(false)}
      >
        Cancel
      </button>
    </div>
  );
}

function AssignNationForm({
  entries,
  members,
  onRefresh,
}: {
  entries: DraftEntryWithMember[];
  members: { id: string; display_name: string; team_name: string | null }[];
  onRefresh: () => void;
}) {
  const assignedMemberIds = new Set(entries.map((e) => e.member_id));
  const unassigned = members.filter((m) => !assignedMemberIds.has(m.id));

  const [memberId, setMemberId] = useState("");
  const [nationName, setNationName] = useState("");
  const [nationCode, setNationCode] = useState("");
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");

  async function handleAssign() {
    if (!memberId || !nationName.trim()) return;
    setSaving(true);
    setMsg("");
    const result = await assignNation(
      memberId,
      nationName.trim(),
      nationCode.trim() || undefined
    );
    if (result.success) {
      setMemberId("");
      setNationName("");
      setNationCode("");
      setMsg("Nation assigned!");
      onRefresh();
    } else {
      setMsg(result.error ?? "Failed");
    }
    setSaving(false);
  }

  return (
    <div className="card">
      {unassigned.length === 0 ? (
        <p className="text-muted">All 12 members have been assigned nations.</p>
      ) : (
        <>
          <div className="assign-form-row">
            <div className="form-group" style={{ flex: 2, marginBottom: 0 }}>
              <label>Member</label>
              <select
                className="select"
                value={memberId}
                onChange={(e) => setMemberId(e.target.value)}
              >
                <option value="">Select member...</option>
                {unassigned.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.display_name}
                  </option>
                ))}
              </select>
            </div>
            <div className="form-group" style={{ flex: 2, marginBottom: 0 }}>
              <label>Nation</label>
              <input
                className="input"
                value={nationName}
                onChange={(e) => setNationName(e.target.value)}
                placeholder="e.g. Brazil"
              />
            </div>
            <div className="form-group" style={{ flex: 1, marginBottom: 0 }}>
              <label>Code</label>
              <input
                className="input"
                value={nationCode}
                onChange={(e) => setNationCode(e.target.value)}
                placeholder="BR"
                maxLength={2}
              />
            </div>
            <div style={{ alignSelf: "flex-end" }}>
              <button
                className="btn btn-primary"
                onClick={handleAssign}
                disabled={saving || !memberId || !nationName.trim()}
              >
                {saving ? "..." : "Assign"}
              </button>
            </div>
          </div>
          {msg && (
            <p
              className={`mt-8 ${msg.includes("assigned") ? "text-muted" : "error"}`}
              style={{ fontSize: 13 }}
            >
              {msg}
            </p>
          )}
        </>
      )}
    </div>
  );
}
