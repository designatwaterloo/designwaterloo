"use client";

import { useState } from "react";
import { useInlineEdit, ExperienceEntry, LeadershipEntry } from "./InlineEditProvider";
import styles from "./InlineEdit.module.css";
import pageStyles from "@/app/directory/[slug]/page.module.css";

type Entry = ExperienceEntry | LeadershipEntry;

interface InlineExperienceFormProps {
  type: "experience" | "leadership";
  label: string;
}

function isLeadership(entry: Entry): entry is LeadershipEntry {
  return "org" in entry;
}

function getOrg(entry: Entry): string {
  return isLeadership(entry) ? entry.org : (entry as ExperienceEntry).company;
}

const MONTHS = [
  { value: "", label: "Month" },
  { value: "01", label: "Jan" },
  { value: "02", label: "Feb" },
  { value: "03", label: "Mar" },
  { value: "04", label: "Apr" },
  { value: "05", label: "May" },
  { value: "06", label: "Jun" },
  { value: "07", label: "Jul" },
  { value: "08", label: "Aug" },
  { value: "09", label: "Sep" },
  { value: "10", label: "Oct" },
  { value: "11", label: "Nov" },
  { value: "12", label: "Dec" },
];

function EntryForm({
  entry,
  type,
  onChange,
  onRemove,
}: {
  entry: Entry;
  type: "experience" | "leadership";
  onChange: (updated: Entry) => void;
  onRemove: () => void;
}) {
  const orgLabel = type === "experience" ? "Company" : "Organization";
  const org = getOrg(entry);

  const setOrg = (val: string) => {
    if (type === "experience") {
      onChange({ ...entry, company: val } as ExperienceEntry);
    } else {
      onChange({ ...entry, org: val } as LeadershipEntry);
    }
  };

  return (
    <div className={styles.entryForm}>
      <div className={styles.entryRow}>
        <input
          type="text"
          value={entry.positionTitle ?? ""}
          onChange={(e) => onChange({ ...entry, positionTitle: e.target.value || null })}
          placeholder="Title"
          className={styles.entryInput}
        />
        <input
          type="text"
          value={org}
          onChange={(e) => setOrg(e.target.value)}
          placeholder={orgLabel}
          className={styles.entryInput}
        />
      </div>
      <div className={styles.entryRow}>
        <select
          value={entry.startMonth ?? ""}
          onChange={(e) => onChange({ ...entry, startMonth: e.target.value || null })}
          className={styles.entrySelect}
        >
          {MONTHS.map((m) => (
            <option key={m.value} value={m.value}>
              {m.label}
            </option>
          ))}
        </select>
        <input
          type="text"
          value={entry.startYear ?? ""}
          onChange={(e) => onChange({ ...entry, startYear: e.target.value || null })}
          placeholder="Year"
          className={`${styles.entryInput} ${styles.entryInputSmall}`}
        />
        <label className={styles.entryCheckbox}>
          <input
            type="checkbox"
            checked={entry.isCurrent}
            onChange={(e) => onChange({ ...entry, isCurrent: e.target.checked })}
          />
          Current
        </label>
        <button
          type="button"
          onClick={onRemove}
          className={styles.entryRemove}
          aria-label="Remove entry"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
          </svg>
        </button>
      </div>
    </div>
  );
}

export default function InlineExperienceForm({ type, label }: InlineExperienceFormProps) {
  const { isOwner, editMode, experiences, leadership, setExperiences, setLeadership } = useInlineEdit();
  const [editingIndex, setEditingIndex] = useState<number | null>(null);

  const entries = type === "experience" ? experiences : leadership;

  const setEntries = (updated: Entry[]) => {
    if (type === "experience") {
      setExperiences(updated as ExperienceEntry[]);
    } else {
      setLeadership(updated as LeadershipEntry[]);
    }
  };

  const sorted = [...entries].map((e, i) => ({ entry: e, originalIndex: i })).sort((a, b) => {
    if (a.entry.isCurrent && !b.entry.isCurrent) return -1;
    if (!a.entry.isCurrent && b.entry.isCurrent) return 1;
    const yearA = a.entry.startYear ? parseInt(a.entry.startYear) : 0;
    const yearB = b.entry.startYear ? parseInt(b.entry.startYear) : 0;
    return yearB - yearA;
  });

  const handleUpdate = (originalIndex: number, updated: Entry) => {
    const next = [...entries];
    next[originalIndex] = updated;
    setEntries(next);
  };

  const handleRemove = (originalIndex: number) => {
    setEntries(entries.filter((_, i) => i !== originalIndex));
    setEditingIndex(null);
  };

  const addEntry = () => {
    const blank: Entry =
      type === "experience"
        ? { positionTitle: null, company: "", startMonth: null, startYear: null, isCurrent: false }
        : { positionTitle: null, org: "", startMonth: null, startYear: null, isCurrent: false };
    setEntries([...entries, blank]);
    setEditingIndex(entries.length);
  };

  // Non-owner or not in edit mode: show read-only list or nothing
  if (!isOwner || !editMode) {
    if (entries.length === 0) return null;
    return (
      <dl className={pageStyles.experienceGroup}>
        <dt className={pageStyles.label}>{label}</dt>
        <dd className={pageStyles.experienceList}>
          {sorted.map(({ entry }, i) => (
            <div key={i} className={pageStyles.experienceItem}>
              <div className={pageStyles.experienceInfo}>
                {entry.positionTitle && <p className={pageStyles.jobTitle}>{entry.positionTitle}</p>}
                <p className={pageStyles.companyName}>{getOrg(entry)}</p>
              </div>
              {entry.startYear && (
                <span className={pageStyles.year}>
                  {entry.startYear}
                  {entry.isCurrent ? " - Present" : ""}
                </span>
              )}
            </div>
          ))}
        </dd>
      </dl>
    );
  }

  return (
    <dl className={pageStyles.experienceGroup}>
      <dt className={pageStyles.label}>{label}</dt>
      <dd className={pageStyles.experienceList}>
        {sorted.length === 0 && (
          <span
            className={styles.editablePlaceholder}
            onClick={addEntry}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === "Enter") addEntry();
            }}
          >
            Click to add {label.toLowerCase()}...
          </span>
        )}
        {sorted.map(({ entry, originalIndex }, i) =>
          editingIndex === originalIndex ? (
            <EntryForm
              key={i}
              entry={entry}
              type={type}
              onChange={(updated) => handleUpdate(originalIndex, updated)}
              onRemove={() => handleRemove(originalIndex)}
            />
          ) : (
            <div
              key={i}
              className={`${pageStyles.experienceItem} ${styles.editableField}`}
              onClick={() => setEditingIndex(originalIndex)}
            >
              <div className={pageStyles.experienceInfo}>
                {entry.positionTitle && <p className={pageStyles.jobTitle}>{entry.positionTitle}</p>}
                <p className={pageStyles.companyName}>{getOrg(entry)}</p>
              </div>
              {entry.startYear && (
                <span className={pageStyles.year}>
                  {entry.startYear}
                  {entry.isCurrent ? " - Present" : ""}
                </span>
              )}
            </div>
          )
        )}
        <button
          type="button"
          onClick={addEntry}
          className={styles.addEntryButton}
        >
          + Add {label.toLowerCase()}
        </button>
      </dd>
    </dl>
  );
}
