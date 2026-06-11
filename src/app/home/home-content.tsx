"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  updateSection,
  createAnnouncement,
  updateAnnouncement,
  deleteAnnouncement,
  toggleSectionVisibility,
} from "@/app/actions/league-info-actions";
import type {
  LeagueInfoSection,
  Announcement,
  PassedRule,
} from "@/app/actions/league-info-actions";

interface HomeContentProps {
  sections: LeagueInfoSection[];
  announcements: Announcement[];
  passedRules: PassedRule[];
  isCommissioner: boolean;
}

export default function HomeContent({
  sections,
  announcements,
  passedRules,
  isCommissioner,
}: HomeContentProps) {
  const router = useRouter();

  const getSection = (key: string) =>
    sections.find((s) => s.section_key === key);

  return (
    <div className="home-page">
      <div className="page-hero">
        <div className="page-hero-eyebrow">League Headquarters</div>
        <div className="page-hero-title">The Greatest League</div>
        <div className="page-hero-sub">
          Twelve GMs. One trophy. No excuses.
        </div>
      </div>

      <AnnouncementsSection
        announcements={announcements}
        isCommissioner={isCommissioner}
        onRefresh={() => router.refresh()}
      />

      <div className="home-grid">
        <BuyInSection
          section={getSection("buy_in")}
          isCommissioner={isCommissioner}
          onRefresh={() => router.refresh()}
        />
        <DraftDaySection
          section={getSection("draft_day")}
          isCommissioner={isCommissioner}
          onRefresh={() => router.refresh()}
        />
      </div>

      <SeasonScheduleSection
        section={getSection("season_schedule")}
        isCommissioner={isCommissioner}
        onRefresh={() => router.refresh()}
      />

      <PrizeStructureSection
        section={getSection("prize_structure")}
        isCommissioner={isCommissioner}
        onRefresh={() => router.refresh()}
      />

      <PassedRulesSection passedRules={passedRules} />

      <ByLawsSection
        section={getSection("by_laws")}
        isCommissioner={isCommissioner}
        onRefresh={() => router.refresh()}
      />

      <ExternalLinksSection
        section={getSection("external_links")}
        isCommissioner={isCommissioner}
        onRefresh={() => router.refresh()}
      />
    </div>
  );
}

function EditButton({ onClick }: { onClick: () => void }) {
  return (
    <button className="edit-icon-btn" onClick={onClick} title="Edit">
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
        <path
          d="M11.013 1.427a1.75 1.75 0 012.474 0l1.086 1.086a1.75 1.75 0 010 2.474l-8.61 8.61c-.21.21-.47.364-.756.442l-3.251.93a.75.75 0 01-.927-.928l.929-3.25a1.75 1.75 0 01.442-.756l8.613-8.608zm1.414 1.06a.25.25 0 00-.354 0L3.46 11.1a.25.25 0 00-.063.108l-.558 1.953 1.953-.558a.25.25 0 00.108-.063l8.613-8.613a.25.25 0 000-.354l-1.086-1.086z"
          fill="currentColor"
        />
      </svg>
    </button>
  );
}

function VisibilityToggle({
  sectionKey,
  isVisible,
  onRefresh,
}: {
  sectionKey: string;
  isVisible: boolean;
  onRefresh: () => void;
}) {
  const [saving, setSaving] = useState(false);

  async function toggle() {
    setSaving(true);
    await toggleSectionVisibility(sectionKey, !isVisible);
    onRefresh();
    setSaving(false);
  }

  return (
    <button
      className="visibility-toggle"
      onClick={toggle}
      disabled={saving}
      title={isVisible ? "Hide section" : "Show section"}
    >
      {isVisible ? (
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
          <path
            d="M8 3C4.364 3 1.258 5.073.15 8c1.108 2.927 4.214 5 7.85 5s6.742-2.073 7.85-5c-1.108-2.927-4.214-5-7.85-5zm0 8.333A3.335 3.335 0 014.667 8 3.335 3.335 0 018 4.667 3.335 3.335 0 0111.333 8 3.335 3.335 0 018 11.333zM8 6a2 2 0 100 4 2 2 0 000-4z"
            fill="currentColor"
          />
        </svg>
      ) : (
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
          <path
            d="M13.359 11.238C14.802 9.881 15.85 8 15.85 8c-1.108-2.927-4.214-5-7.85-5-1.166 0-2.273.233-3.276.653m-2.06 1.402C1.326 6.364.15 8 .15 8c1.108 2.927 4.214 5 7.85 5 1.194 0 2.327-.247 3.347-.687M5.76 10.24a3 3 0 014.48-4.48M1 1l14 14"
            stroke="currentColor"
            strokeWidth="1.3"
            strokeLinecap="round"
          />
        </svg>
      )}
    </button>
  );
}

function SectionHeader({
  title,
  section,
  isCommissioner,
  onEdit,
  onRefresh,
}: {
  title: string;
  section?: LeagueInfoSection;
  isCommissioner: boolean;
  onEdit: () => void;
  onRefresh: () => void;
}) {
  return (
    <div className="section-header-row">
      <h2 className="section-title" style={{ marginBottom: 0 }}>
        {title}
      </h2>
      {isCommissioner && (
        <div className="section-header-actions">
          {section && (
            <VisibilityToggle
              sectionKey={section.section_key}
              isVisible={section.is_visible}
              onRefresh={onRefresh}
            />
          )}
          <EditButton onClick={onEdit} />
        </div>
      )}
    </div>
  );
}

function AnnouncementsSection({
  announcements,
  isCommissioner,
  onRefresh,
}: {
  announcements: Announcement[];
  isCommissioner: boolean;
  onRefresh: () => void;
}) {
  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [saving, setSaving] = useState(false);

  async function handleCreate() {
    if (!title.trim()) return;
    setSaving(true);
    await createAnnouncement(title, content);
    setAdding(false);
    setTitle("");
    setContent("");
    onRefresh();
    setSaving(false);
  }

  async function handleUpdate(id: string) {
    if (!title.trim()) return;
    setSaving(true);
    await updateAnnouncement(id, title, content);
    setEditingId(null);
    setTitle("");
    setContent("");
    onRefresh();
    setSaving(false);
  }

  async function handleDelete(id: string) {
    setSaving(true);
    await deleteAnnouncement(id);
    onRefresh();
    setSaving(false);
  }

  function startEdit(a: Announcement) {
    setEditingId(a.id);
    setTitle(a.title);
    setContent(a.content);
    setAdding(false);
  }

  function cancelEdit() {
    setEditingId(null);
    setAdding(false);
    setTitle("");
    setContent("");
  }

  if (announcements.length === 0 && !isCommissioner) return null;

  return (
    <div className="home-section">
      <div className="section-header-row">
        <h2 className="section-title" style={{ marginBottom: 0 }}>
          Announcements
        </h2>
        {isCommissioner && !adding && !editingId && (
          <button
            className="btn btn-gold btn-sm"
            onClick={() => {
              setAdding(true);
              setTitle("");
              setContent("");
            }}
          >
            + New
          </button>
        )}
      </div>

      {(adding || editingId) && (
        <div className="card mt-12">
          <div className="form-group">
            <label>Title</label>
            <input
              className="input"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Announcement title"
            />
          </div>
          <div className="form-group">
            <label>Message</label>
            <textarea
              className="input"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Announcement details..."
              rows={3}
            />
          </div>
          <div className="flex gap-8">
            <button
              className="btn btn-primary btn-sm"
              disabled={saving || !title.trim()}
              onClick={() =>
                editingId ? handleUpdate(editingId) : handleCreate()
              }
            >
              {saving ? "Saving..." : editingId ? "Update" : "Post"}
            </button>
            <button
              className="btn btn-outline btn-sm"
              onClick={cancelEdit}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {announcements.length === 0 && !adding ? (
        <p className="text-muted mt-8">
          No announcements yet.
        </p>
      ) : (
        announcements.map((a) => (
          <div key={a.id} className="announcement-card card mt-12">
            <div className="flex items-center justify-between">
              <h3 style={{ fontSize: 15, fontWeight: 700 }}>{a.title}</h3>
              {isCommissioner && !editingId && (
                <div className="flex gap-8">
                  <EditButton onClick={() => startEdit(a)} />
                  <button
                    className="edit-icon-btn"
                    onClick={() => handleDelete(a.id)}
                    title="Delete"
                    disabled={saving}
                  >
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
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
            </div>
            <p
              className="text-muted mt-8"
              style={{ lineHeight: 1.6, whiteSpace: "pre-wrap" }}
            >
              {a.content}
            </p>
            <p
              className="text-muted mt-8"
              style={{ fontSize: 12, opacity: 0.6 }}
            >
              Posted by {a.creator_name} &middot;{" "}
              {new Date(a.created_at).toLocaleDateString()}
            </p>
          </div>
        ))
      )}
    </div>
  );
}

function BuyInSection({
  section,
  isCommissioner,
  onRefresh,
}: {
  section?: LeagueInfoSection;
  isCommissioner: boolean;
  onRefresh: () => void;
}) {
  const c = (section?.content ?? {}) as {
    amount?: string;
    payment_details?: string;
    deadline?: string;
  };
  const [editing, setEditing] = useState(false);
  const [amount, setAmount] = useState(c.amount ?? "");
  const [details, setDetails] = useState(c.payment_details ?? "");
  const [deadline, setDeadline] = useState(c.deadline ?? "");
  const [saving, setSaving] = useState(false);

  if (section && !section.is_visible && !isCommissioner) return null;

  async function save() {
    setSaving(true);
    await updateSection("buy_in", {
      amount,
      payment_details: details,
      deadline,
    });
    setEditing(false);
    onRefresh();
    setSaving(false);
  }

  const isEmpty = !c.amount && !c.payment_details && !c.deadline;

  return (
    <div
      className={`card home-info-card ${
        section && !section.is_visible ? "section-hidden" : ""
      }`}
    >
      <SectionHeader
        title="Buy-In"
        section={section}
        isCommissioner={isCommissioner}
        onEdit={() => {
          setAmount(c.amount ?? "");
          setDetails(c.payment_details ?? "");
          setDeadline(c.deadline ?? "");
          setEditing(true);
        }}
        onRefresh={onRefresh}
      />

      {editing ? (
        <div className="mt-12">
          <div className="form-group">
            <label>Amount</label>
            <input
              className="input"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="e.g. $200"
            />
          </div>
          <div className="form-group">
            <label>Payment Details</label>
            <input
              className="input"
              value={details}
              onChange={(e) => setDetails(e.target.value)}
              placeholder="e.g. BSB/Account, PayPal, etc."
            />
          </div>
          <div className="form-group">
            <label>Deadline</label>
            <input
              className="input"
              value={deadline}
              onChange={(e) => setDeadline(e.target.value)}
              placeholder="e.g. August 1st, 2024"
            />
          </div>
          <div className="flex gap-8">
            <button
              className="btn btn-primary btn-sm"
              onClick={save}
              disabled={saving}
            >
              {saving ? "Saving..." : "Save"}
            </button>
            <button
              className="btn btn-outline btn-sm"
              onClick={() => setEditing(false)}
            >
              Cancel
            </button>
          </div>
        </div>
      ) : isEmpty && isCommissioner ? (
        <p className="text-muted mt-8">Click edit to set buy-in details.</p>
      ) : isEmpty ? (
        <p className="text-muted mt-8">Details coming soon.</p>
      ) : (
        <div className="mt-12">
          {c.amount && (
            <div className="info-row">
              <span className="info-label">Amount</span>
              <span className="info-value">{c.amount}</span>
            </div>
          )}
          {c.payment_details && (
            <div className="info-row">
              <span className="info-label">Payment</span>
              <span className="info-value">{c.payment_details}</span>
            </div>
          )}
          {c.deadline && (
            <div className="info-row">
              <span className="info-label">Deadline</span>
              <span className="info-value">{c.deadline}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function DraftDaySection({
  section,
  isCommissioner,
  onRefresh,
}: {
  section?: LeagueInfoSection;
  isCommissioner: boolean;
  onRefresh: () => void;
}) {
  const c = (section?.content ?? {}) as {
    date?: string;
    time?: string;
    location?: string;
    notes?: string;
  };
  const [editing, setEditing] = useState(false);
  const [date, setDate] = useState(c.date ?? "");
  const [time, setTime] = useState(c.time ?? "");
  const [location, setLocation] = useState(c.location ?? "");
  const [notes, setNotes] = useState(c.notes ?? "");
  const [saving, setSaving] = useState(false);

  if (section && !section.is_visible && !isCommissioner) return null;

  async function save() {
    setSaving(true);
    await updateSection("draft_day", { date, time, location, notes });
    setEditing(false);
    onRefresh();
    setSaving(false);
  }

  const isEmpty = !c.date && !c.time && !c.location;

  return (
    <div
      className={`card home-info-card ${
        section && !section.is_visible ? "section-hidden" : ""
      }`}
    >
      <SectionHeader
        title="Draft Day"
        section={section}
        isCommissioner={isCommissioner}
        onEdit={() => {
          setDate(c.date ?? "");
          setTime(c.time ?? "");
          setLocation(c.location ?? "");
          setNotes(c.notes ?? "");
          setEditing(true);
        }}
        onRefresh={onRefresh}
      />

      {editing ? (
        <div className="mt-12">
          <div className="form-group">
            <label>Date</label>
            <input
              className="input"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              placeholder="e.g. September 3rd, 2024"
            />
          </div>
          <div className="form-group">
            <label>Time</label>
            <input
              className="input"
              value={time}
              onChange={(e) => setTime(e.target.value)}
              placeholder="e.g. 7:00 PM AEST"
            />
          </div>
          <div className="form-group">
            <label>Location</label>
            <input
              className="input"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="e.g. Marcus's Place / Online via Sleeper"
            />
          </div>
          <div className="form-group">
            <label>Notes</label>
            <textarea
              className="input"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Any additional details..."
              rows={2}
            />
          </div>
          <div className="flex gap-8">
            <button
              className="btn btn-primary btn-sm"
              onClick={save}
              disabled={saving}
            >
              {saving ? "Saving..." : "Save"}
            </button>
            <button
              className="btn btn-outline btn-sm"
              onClick={() => setEditing(false)}
            >
              Cancel
            </button>
          </div>
        </div>
      ) : isEmpty && isCommissioner ? (
        <p className="text-muted mt-8">Click edit to set draft day details.</p>
      ) : isEmpty ? (
        <p className="text-muted mt-8">Details coming soon.</p>
      ) : (
        <div className="mt-12">
          {c.date && (
            <div className="info-row">
              <span className="info-label">Date</span>
              <span className="info-value">{c.date}</span>
            </div>
          )}
          {c.time && (
            <div className="info-row">
              <span className="info-label">Time</span>
              <span className="info-value">{c.time}</span>
            </div>
          )}
          {c.location && (
            <div className="info-row">
              <span className="info-label">Location</span>
              <span className="info-value">{c.location}</span>
            </div>
          )}
          {c.notes && (
            <p
              className="text-muted mt-8"
              style={{ whiteSpace: "pre-wrap", lineHeight: 1.6 }}
            >
              {c.notes}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

function SeasonScheduleSection({
  section,
  isCommissioner,
  onRefresh,
}: {
  section?: LeagueInfoSection;
  isCommissioner: boolean;
  onRefresh: () => void;
}) {
  const c = (section?.content ?? {}) as {
    events?: { name: string; date: string }[];
  };
  const events = c.events ?? [];
  const [editing, setEditing] = useState(false);
  const [editEvents, setEditEvents] = useState(events);
  const [saving, setSaving] = useState(false);

  if (section && !section.is_visible && !isCommissioner) return null;

  function addEvent() {
    setEditEvents([...editEvents, { name: "", date: "" }]);
  }

  function removeEvent(i: number) {
    setEditEvents(editEvents.filter((_, idx) => idx !== i));
  }

  function updateEvent(i: number, field: "name" | "date", value: string) {
    const updated = [...editEvents];
    updated[i] = { ...updated[i], [field]: value };
    setEditEvents(updated);
  }

  async function save() {
    setSaving(true);
    const cleaned = editEvents.filter((e) => e.name.trim() || e.date.trim());
    await updateSection("season_schedule", { events: cleaned });
    setEditing(false);
    onRefresh();
    setSaving(false);
  }

  return (
    <div
      className={`home-section ${
        section && !section.is_visible ? "section-hidden" : ""
      }`}
    >
      <SectionHeader
        title="Season Schedule"
        section={section}
        isCommissioner={isCommissioner}
        onEdit={() => {
          setEditEvents(events.length > 0 ? [...events] : [{ name: "", date: "" }]);
          setEditing(true);
        }}
        onRefresh={onRefresh}
      />

      {editing ? (
        <div className="card mt-12">
          {editEvents.map((ev, i) => (
            <div key={i} className="schedule-edit-row">
              <input
                className="input"
                value={ev.name}
                onChange={(e) => updateEvent(i, "name", e.target.value)}
                placeholder="Event name"
                style={{ flex: 2 }}
              />
              <input
                className="input"
                value={ev.date}
                onChange={(e) => updateEvent(i, "date", e.target.value)}
                placeholder="Date"
                style={{ flex: 1 }}
              />
              <button
                className="edit-icon-btn"
                onClick={() => removeEvent(i)}
                title="Remove"
              >
                &times;
              </button>
            </div>
          ))}
          <div className="flex gap-8 mt-12">
            <button className="btn btn-outline btn-sm" onClick={addEvent}>
              + Add Date
            </button>
          </div>
          <div className="flex gap-8 mt-12">
            <button
              className="btn btn-primary btn-sm"
              onClick={save}
              disabled={saving}
            >
              {saving ? "Saving..." : "Save"}
            </button>
            <button
              className="btn btn-outline btn-sm"
              onClick={() => setEditing(false)}
            >
              Cancel
            </button>
          </div>
        </div>
      ) : events.length === 0 ? (
        <p className="text-muted mt-8">
          {isCommissioner
            ? "Click edit to add key season dates."
            : "Schedule coming soon."}
        </p>
      ) : (
        <div className="schedule-list mt-12">
          {events.map((ev, i) => (
            <div key={i} className="schedule-item">
              <span className="schedule-date">{ev.date}</span>
              <span className="schedule-name">{ev.name}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function PrizeStructureSection({
  section,
  isCommissioner,
  onRefresh,
}: {
  section?: LeagueInfoSection;
  isCommissioner: boolean;
  onRefresh: () => void;
}) {
  const c = (section?.content ?? {}) as {
    entries?: { place: string; amount: string; description?: string }[];
  };
  const entries = c.entries ?? [];
  const [editing, setEditing] = useState(false);
  const [editEntries, setEditEntries] = useState(entries);
  const [saving, setSaving] = useState(false);

  if (section && !section.is_visible && !isCommissioner) return null;

  function addEntry() {
    setEditEntries([...editEntries, { place: "", amount: "", description: "" }]);
  }

  function removeEntry(i: number) {
    setEditEntries(editEntries.filter((_, idx) => idx !== i));
  }

  function updateEntry(
    i: number,
    field: "place" | "amount" | "description",
    value: string
  ) {
    const updated = [...editEntries];
    updated[i] = { ...updated[i], [field]: value };
    setEditEntries(updated);
  }

  async function save() {
    setSaving(true);
    const cleaned = editEntries.filter(
      (e) => e.place.trim() || e.amount.trim()
    );
    await updateSection("prize_structure", { entries: cleaned });
    setEditing(false);
    onRefresh();
    setSaving(false);
  }

  return (
    <div
      className={`home-section ${
        section && !section.is_visible ? "section-hidden" : ""
      }`}
    >
      <SectionHeader
        title="Prize Structure"
        section={section}
        isCommissioner={isCommissioner}
        onEdit={() => {
          setEditEntries(
            entries.length > 0
              ? [...entries]
              : [{ place: "", amount: "", description: "" }]
          );
          setEditing(true);
        }}
        onRefresh={onRefresh}
      />

      {editing ? (
        <div className="card mt-12">
          {editEntries.map((entry, i) => (
            <div key={i} className="schedule-edit-row">
              <input
                className="input"
                value={entry.place}
                onChange={(e) => updateEntry(i, "place", e.target.value)}
                placeholder="e.g. 1st Place"
                style={{ flex: 1 }}
              />
              <input
                className="input"
                value={entry.amount}
                onChange={(e) => updateEntry(i, "amount", e.target.value)}
                placeholder="e.g. $1,000"
                style={{ flex: 1 }}
              />
              <input
                className="input"
                value={entry.description ?? ""}
                onChange={(e) => updateEntry(i, "description", e.target.value)}
                placeholder="Description (optional)"
                style={{ flex: 2 }}
              />
              <button
                className="edit-icon-btn"
                onClick={() => removeEntry(i)}
                title="Remove"
              >
                &times;
              </button>
            </div>
          ))}
          <div className="flex gap-8 mt-12">
            <button className="btn btn-outline btn-sm" onClick={addEntry}>
              + Add Prize
            </button>
          </div>
          <div className="flex gap-8 mt-12">
            <button
              className="btn btn-primary btn-sm"
              onClick={save}
              disabled={saving}
            >
              {saving ? "Saving..." : "Save"}
            </button>
            <button
              className="btn btn-outline btn-sm"
              onClick={() => setEditing(false)}
            >
              Cancel
            </button>
          </div>
        </div>
      ) : entries.length === 0 ? (
        <p className="text-muted mt-8">
          {isCommissioner
            ? "Click edit to set up prize payouts."
            : "Prize details coming soon."}
        </p>
      ) : (
        <div className="prize-list mt-12">
          {entries.map((entry, i) => (
            <div key={i} className="prize-item card">
              <div className="prize-place">{entry.place}</div>
              <div className="prize-amount">{entry.amount}</div>
              {entry.description && (
                <div className="prize-desc text-muted">{entry.description}</div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function PassedRulesSection({ passedRules }: { passedRules: PassedRule[] }) {
  if (passedRules.length === 0) return null;

  return (
    <div className="home-section">
      <h2 className="section-title">Passed Rules</h2>
      {passedRules.map((rule) => (
        <div key={rule.id} className="card mt-12 passed-rule-card">
          <div className="flex items-center justify-between">
            <h3 style={{ fontSize: 15, fontWeight: 700 }}>{rule.title}</h3>
            <span className="badge badge-passed">Passed</span>
          </div>
          <p
            className="text-muted mt-8"
            style={{ lineHeight: 1.6, whiteSpace: "pre-wrap" }}
          >
            {rule.description}
          </p>
          {rule.closed_at && (
            <p
              className="text-muted mt-8"
              style={{ fontSize: 12, opacity: 0.6 }}
            >
              Approved {new Date(rule.closed_at).toLocaleDateString()}
            </p>
          )}
        </div>
      ))}
    </div>
  );
}

function ByLawsSection({
  section,
  isCommissioner,
  onRefresh,
}: {
  section?: LeagueInfoSection;
  isCommissioner: boolean;
  onRefresh: () => void;
}) {
  const c = (section?.content ?? {}) as { content?: string };
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState(c.content ?? "");
  const [saving, setSaving] = useState(false);

  if (section && !section.is_visible && !isCommissioner) return null;

  async function save() {
    setSaving(true);
    await updateSection("by_laws", { content: text });
    setEditing(false);
    onRefresh();
    setSaving(false);
  }

  return (
    <div
      className={`home-section ${
        section && !section.is_visible ? "section-hidden" : ""
      }`}
    >
      <SectionHeader
        title="By-Laws"
        section={section}
        isCommissioner={isCommissioner}
        onEdit={() => {
          setText(c.content ?? "");
          setEditing(true);
        }}
        onRefresh={onRefresh}
      />

      {editing ? (
        <div className="card mt-12">
          <div className="form-group">
            <label>By-Laws Content</label>
            <textarea
              className="input"
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Enter the league by-laws..."
              rows={12}
              style={{ minHeight: 200 }}
            />
          </div>
          <div className="flex gap-8">
            <button
              className="btn btn-primary btn-sm"
              onClick={save}
              disabled={saving}
            >
              {saving ? "Saving..." : "Save"}
            </button>
            <button
              className="btn btn-outline btn-sm"
              onClick={() => setEditing(false)}
            >
              Cancel
            </button>
          </div>
        </div>
      ) : !c.content ? (
        <p className="text-muted mt-8">
          {isCommissioner
            ? "Click edit to add league by-laws."
            : "By-laws coming soon."}
        </p>
      ) : (
        <div
          className="card mt-12 bylaws-content"
          style={{ whiteSpace: "pre-wrap", lineHeight: 1.8 }}
        >
          {c.content}
        </div>
      )}
    </div>
  );
}

function ExternalLinksSection({
  section,
  isCommissioner,
  onRefresh,
}: {
  section?: LeagueInfoSection;
  isCommissioner: boolean;
  onRefresh: () => void;
}) {
  const c = (section?.content ?? {}) as {
    links?: { label: string; url: string }[];
  };
  const links = c.links ?? [];
  const [editing, setEditing] = useState(false);
  const [editLinks, setEditLinks] = useState(links);
  const [saving, setSaving] = useState(false);

  if (section && !section.is_visible && !isCommissioner) return null;

  function addLink() {
    setEditLinks([...editLinks, { label: "", url: "" }]);
  }

  function removeLink(i: number) {
    setEditLinks(editLinks.filter((_, idx) => idx !== i));
  }

  function updateLink(i: number, field: "label" | "url", value: string) {
    const updated = [...editLinks];
    updated[i] = { ...updated[i], [field]: value };
    setEditLinks(updated);
  }

  async function save() {
    setSaving(true);
    const cleaned = editLinks.filter((l) => l.label.trim() && l.url.trim());
    await updateSection("external_links", { links: cleaned });
    setEditing(false);
    onRefresh();
    setSaving(false);
  }

  return (
    <div
      className={`home-section ${
        section && !section.is_visible ? "section-hidden" : ""
      }`}
    >
      <SectionHeader
        title="External Links"
        section={section}
        isCommissioner={isCommissioner}
        onEdit={() => {
          setEditLinks(
            links.length > 0 ? [...links] : [{ label: "", url: "" }]
          );
          setEditing(true);
        }}
        onRefresh={onRefresh}
      />

      {editing ? (
        <div className="card mt-12">
          {editLinks.map((link, i) => (
            <div key={i} className="schedule-edit-row">
              <input
                className="input"
                value={link.label}
                onChange={(e) => updateLink(i, "label", e.target.value)}
                placeholder="Link name"
                style={{ flex: 1 }}
              />
              <input
                className="input"
                value={link.url}
                onChange={(e) => updateLink(i, "url", e.target.value)}
                placeholder="https://..."
                style={{ flex: 2 }}
              />
              <button
                className="edit-icon-btn"
                onClick={() => removeLink(i)}
                title="Remove"
              >
                &times;
              </button>
            </div>
          ))}
          <div className="flex gap-8 mt-12">
            <button className="btn btn-outline btn-sm" onClick={addLink}>
              + Add Link
            </button>
          </div>
          <div className="flex gap-8 mt-12">
            <button
              className="btn btn-primary btn-sm"
              onClick={save}
              disabled={saving}
            >
              {saving ? "Saving..." : "Save"}
            </button>
            <button
              className="btn btn-outline btn-sm"
              onClick={() => setEditing(false)}
            >
              Cancel
            </button>
          </div>
        </div>
      ) : links.length === 0 ? (
        <p className="text-muted mt-8">
          {isCommissioner
            ? "Click edit to add external links."
            : "No links added yet."}
        </p>
      ) : (
        <div className="links-grid mt-12">
          {links.map((link, i) => (
            <a
              key={i}
              href={link.url}
              target="_blank"
              rel="noopener noreferrer"
              className="link-card card"
            >
              <span style={{ fontWeight: 600 }}>{link.label}</span>
              <svg
                width="14"
                height="14"
                viewBox="0 0 16 16"
                fill="none"
                style={{ opacity: 0.4 }}
              >
                <path
                  d="M6 3h7v7m0-7L6 10"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </a>
          ))}
        </div>
      )}
    </div>
  );
}
