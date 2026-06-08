"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  assignNation,
  removeNation,
  eliminateNation,
  reactivateNation,
  updateNationStats,
  overrideDraftPosition,
  syncFromApi,
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

  const determined = entries.filter((e) => e.effective_position !== null).length;

  return (
    <div className="draft-tracker-page">
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

      <DraftBoard
        entries={entries}
        isCommissioner={isCommissioner}
        determined={determined}
        onRefresh={() => router.refresh()}
      />

      <div className="mt-24">
        <h2 className="section-title">Nations</h2>
        <NationGrid
          entries={entries}
          isCommissioner={isCommissioner}
          onRefresh={() => router.refresh()}
        />
      </div>

      {isCommissioner && (
        <div className="mt-24">
          <h2 className="section-title">Commissioner Controls</h2>
          <CommissionerPanel
            entries={entries}
            members={members}
            onRefresh={() => router.refresh()}
          />
        </div>
      )}
    </div>
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
    if (entry.effective_position !== null && entry.effective_position >= 1 && entry.effective_position <= TOTAL_PICKS) {
      picks[entry.effective_position - 1] = entry;
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <h2 className="section-title" style={{ marginBottom: 0 }}>
          Draft Board
        </h2>
        <span className="badge badge-open">{determined} of {TOTAL_PICKS} determined</span>
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
    <div className="flex gap-8 items-center" onClick={(e) => e.stopPropagation()}>
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

function NationGrid({
  entries,
  isCommissioner,
  onRefresh,
}: {
  entries: DraftEntryWithMember[];
  isCommissioner: boolean;
  onRefresh: () => void;
}) {
  if (entries.length === 0) {
    return (
      <div className="card text-center">
        <p className="text-muted">No nations assigned yet.</p>
      </div>
    );
  }

  return (
    <div className="nation-grid">
      {entries.map((entry) => (
        <NationCard
          key={entry.id}
          entry={entry}
          isCommissioner={isCommissioner}
          onRefresh={onRefresh}
        />
      ))}
    </div>
  );
}

function NationCard({
  entry,
  isCommissioner,
  onRefresh,
}: {
  entry: DraftEntryWithMember;
  isCommissioner: boolean;
  onRefresh: () => void;
}) {
  const [editingStats, setEditingStats] = useState(false);
  const [w, setW] = useState(entry.group_wins.toString());
  const [l, setL] = useState(entry.group_losses.toString());
  const [d, setD] = useState(entry.group_draws.toString());
  const [gd, setGd] = useState(entry.goal_differential.toString());
  const [saving, setSaving] = useState(false);
  const [showElim, setShowElim] = useState(false);
  const [elimStage, setElimStage] = useState("group_stage");

  const isActive = entry.status === "active";
  const isChampion = entry.elimination_stage === "champion";

  async function saveStats() {
    setSaving(true);
    await updateNationStats(
      entry.id,
      parseInt(w) || 0,
      parseInt(l) || 0,
      parseInt(d) || 0,
      parseInt(gd) || 0
    );
    setEditingStats(false);
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
    setShowElim(false);
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

  return (
    <div
      className={`card nation-card ${isActive ? "active" : "eliminated"} ${isChampion ? "champion" : ""}`}
    >
      <div className="flex items-center justify-between" style={{ marginBottom: 8 }}>
        <span
          className={`badge ${isChampion ? "badge-champion" : isActive ? "badge-active" : "badge-eliminated"}`}
        >
          {isChampion
            ? "Champion"
            : isActive
              ? "Active"
              : STAGE_LABELS[entry.elimination_stage ?? ""] ?? "Eliminated"}
        </span>
        {entry.effective_position !== null && (
          <span className="draft-pick-number" style={{ fontSize: 12 }}>
            Pick {entry.effective_position}
          </span>
        )}
      </div>

      <div className="nation-flag-large">{flagEmoji(entry.nation_code)}</div>
      <div className="nation-name">{entry.nation_name}</div>
      <div className="nation-gm">{entry.display_name}</div>

      {(entry.group_wins > 0 ||
        entry.group_losses > 0 ||
        entry.group_draws > 0) && (
        <div className="nation-record">
          {entry.group_wins}W-{entry.group_losses}L-{entry.group_draws}D
          &middot; GD: {entry.goal_differential >= 0 ? "+" : ""}
          {entry.goal_differential}
        </div>
      )}

      {isCommissioner && !editingStats && !showElim && (
        <div className="nation-card-actions mt-8">
          <button
            className="edit-icon-btn"
            onClick={() => {
              setW(entry.group_wins.toString());
              setL(entry.group_losses.toString());
              setD(entry.group_draws.toString());
              setGd(entry.goal_differential.toString());
              setEditingStats(true);
            }}
            title="Edit stats"
          >
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
              <path
                d="M11.013 1.427a1.75 1.75 0 012.474 0l1.086 1.086a1.75 1.75 0 010 2.474l-8.61 8.61c-.21.21-.47.364-.756.442l-3.251.93a.75.75 0 01-.927-.928l.929-3.25a1.75 1.75 0 01.442-.756l8.613-8.608zm1.414 1.06a.25.25 0 00-.354 0L3.46 11.1a.25.25 0 00-.063.108l-.558 1.953 1.953-.558a.25.25 0 00.108-.063l8.613-8.613a.25.25 0 000-.354l-1.086-1.086z"
                fill="currentColor"
              />
            </svg>
          </button>
          {isActive ? (
            <button
              className="btn btn-no btn-sm"
              style={{ fontSize: 11, padding: "3px 8px" }}
              onClick={() => setShowElim(true)}
            >
              Eliminate
            </button>
          ) : (
            <button
              className="btn btn-outline btn-sm"
              style={{ fontSize: 11, padding: "3px 8px" }}
              onClick={handleReactivate}
              disabled={saving}
            >
              Reactivate
            </button>
          )}
          <button
            className="edit-icon-btn"
            onClick={handleRemove}
            title="Remove nation"
            disabled={saving}
          >
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
              <path
                d="M5.5 5.5v6m5-6v6m-8-8h11m-2 0l-.5 8.5a1.5 1.5 0 01-1.5 1.5h-5a1.5 1.5 0 01-1.5-1.5L3.5 3.5m3-2h3"
                stroke="currentColor"
                strokeWidth="1.3"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
        </div>
      )}

      {editingStats && (
        <div className="mt-8">
          <div className="record-inputs">
            <div className="form-group" style={{ marginBottom: 8 }}>
              <label style={{ fontSize: 11 }}>W</label>
              <input
                className="input"
                value={w}
                onChange={(e) => setW(e.target.value)}
                type="number"
                min={0}
                style={{ padding: "4px 6px", fontSize: 13 }}
              />
            </div>
            <div className="form-group" style={{ marginBottom: 8 }}>
              <label style={{ fontSize: 11 }}>L</label>
              <input
                className="input"
                value={l}
                onChange={(e) => setL(e.target.value)}
                type="number"
                min={0}
                style={{ padding: "4px 6px", fontSize: 13 }}
              />
            </div>
            <div className="form-group" style={{ marginBottom: 8 }}>
              <label style={{ fontSize: 11 }}>D</label>
              <input
                className="input"
                value={d}
                onChange={(e) => setD(e.target.value)}
                type="number"
                min={0}
                style={{ padding: "4px 6px", fontSize: 13 }}
              />
            </div>
          </div>
          <div className="form-group" style={{ marginBottom: 8 }}>
            <label style={{ fontSize: 11 }}>GD</label>
            <input
              className="input"
              value={gd}
              onChange={(e) => setGd(e.target.value)}
              type="number"
              style={{ padding: "4px 6px", fontSize: 13 }}
            />
          </div>
          <div className="flex gap-8">
            <button
              className="btn btn-primary btn-sm"
              style={{ fontSize: 11, padding: "3px 8px" }}
              onClick={saveStats}
              disabled={saving}
            >
              Save
            </button>
            <button
              className="btn btn-outline btn-sm"
              style={{ fontSize: 11, padding: "3px 8px" }}
              onClick={() => setEditingStats(false)}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {showElim && (
        <div className="mt-8">
          <div className="form-group" style={{ marginBottom: 8 }}>
            <label style={{ fontSize: 11 }}>Stage</label>
            <select
              className="select"
              value={elimStage}
              onChange={(e) => setElimStage(e.target.value)}
              style={{ padding: "4px 8px", fontSize: 13 }}
            >
              {STAGES.map(([key, label]) => (
                <option key={key} value={key}>
                  {label}
                </option>
              ))}
            </select>
          </div>
          <div className="record-inputs">
            <div className="form-group" style={{ marginBottom: 8 }}>
              <label style={{ fontSize: 11 }}>W</label>
              <input
                className="input"
                value={w}
                onChange={(e) => setW(e.target.value)}
                type="number"
                min={0}
                style={{ padding: "4px 6px", fontSize: 13 }}
              />
            </div>
            <div className="form-group" style={{ marginBottom: 8 }}>
              <label style={{ fontSize: 11 }}>L</label>
              <input
                className="input"
                value={l}
                onChange={(e) => setL(e.target.value)}
                type="number"
                min={0}
                style={{ padding: "4px 6px", fontSize: 13 }}
              />
            </div>
            <div className="form-group" style={{ marginBottom: 8 }}>
              <label style={{ fontSize: 11 }}>D</label>
              <input
                className="input"
                value={d}
                onChange={(e) => setD(e.target.value)}
                type="number"
                min={0}
                style={{ padding: "4px 6px", fontSize: 13 }}
              />
            </div>
          </div>
          <div className="form-group" style={{ marginBottom: 8 }}>
            <label style={{ fontSize: 11 }}>GD</label>
            <input
              className="input"
              value={gd}
              onChange={(e) => setGd(e.target.value)}
              type="number"
              style={{ padding: "4px 6px", fontSize: 13 }}
            />
          </div>
          <div className="flex gap-8">
            <button
              className="btn btn-no btn-sm"
              style={{ fontSize: 11, padding: "3px 8px" }}
              onClick={handleEliminate}
              disabled={saving}
            >
              Confirm Elimination
            </button>
            <button
              className="btn btn-outline btn-sm"
              style={{ fontSize: 11, padding: "3px 8px" }}
              onClick={() => setShowElim(false)}
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function CommissionerPanel({
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
      <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 12 }}>
        Assign Nation
      </h3>
      {unassigned.length === 0 ? (
        <p className="text-muted">All members have been assigned nations.</p>
      ) : (
        <>
          <div className="form-group">
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
          <div className="form-group">
            <label>Nation Name</label>
            <input
              className="input"
              value={nationName}
              onChange={(e) => setNationName(e.target.value)}
              placeholder="e.g. Brazil"
            />
          </div>
          <div className="form-group">
            <label>Country Code (optional, for flag)</label>
            <input
              className="input"
              value={nationCode}
              onChange={(e) => setNationCode(e.target.value)}
              placeholder="e.g. BR"
              maxLength={2}
              style={{ width: 80 }}
            />
          </div>
          <button
            className="btn btn-primary btn-sm"
            onClick={handleAssign}
            disabled={saving || !memberId || !nationName.trim()}
          >
            {saving ? "Assigning..." : "Assign Nation"}
          </button>
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
