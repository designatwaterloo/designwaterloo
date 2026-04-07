"use client";

import { useState, useEffect, useRef } from "react";
import { useInlineEdit, ExperienceEntry, LeadershipEntry } from "./InlineEditProvider";
import { ensureHttps } from "@/lib/urlUtils";
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
  onSave,
  onRemove,
  onDirtyChange,
}: {
  entry: Entry;
  type: "experience" | "leadership";
  onSave: (updated: Entry) => void;
  onRemove: () => void;
  onDirtyChange?: (dirty: boolean) => void;
}) {
  const [draft, setDraft] = useState<Entry>(() => ({ ...entry }));
  const [showError, setShowError] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const orgLabel = type === "experience" ? "Company" : "Organization";
  const org = getOrg(draft);

  const titleValid = !!draft.positionTitle?.trim();
  const orgValid = !!getOrg(draft).trim();
  const yearValid = !!draft.startYear && draft.startYear.length === 4;
  const monthValid = !!draft.isIncoming || !!draft.startMonth;

  const getErrors = () => {
    const missing: string[] = [];
    if (!titleValid) missing.push("title");
    if (!orgValid) missing.push(orgLabel.toLowerCase());
    if (!monthValid) missing.push("start month");
    if (!draft.startYear) missing.push("start year");

    const errors: string[] = [];
    if (missing.length === 1) {
      errors.push(`${missing[0][0].toUpperCase() + missing[0].slice(1)} is required.`);
    } else if (missing.length > 1) {
      const last = missing.pop()!;
      const list = missing.join(", ") + ", and " + last;
      errors.push(`${list[0].toUpperCase() + list.slice(1)} are required.`);
    }
    if (draft.startYear && !yearValid) {
      errors.push("Year must be 4 digits.");
    }
    return errors;
  };
  const hasErrors = !titleValid || !orgValid || !yearValid || !monthValid;

  const update = (updated: Entry) => {
    setDraft(updated);
    onDirtyChange?.(JSON.stringify(updated) !== JSON.stringify(entry));
  };

  const setOrg = (val: string) => {
    if (type === "experience") {
      update({ ...draft, company: val } as ExperienceEntry);
    } else {
      update({ ...draft, org: val } as LeadershipEntry);
    }
  };

  return (
    <div className={styles.entryForm}>
      <div className={styles.entryRow}>
        <input
          type="text"
          value={draft.positionTitle ?? ""}
          onChange={(e) => update({ ...draft, positionTitle: e.target.value || null })}
          placeholder="Title"
          className={`${styles.entryInput} ${showError && !titleValid ? styles.entryInputError : ""}`}
        />
        <input
          type="text"
          value={org}
          onChange={(e) => setOrg(e.target.value)}
          placeholder={orgLabel}
          className={`${styles.entryInput} ${showError && !orgValid ? styles.entryInputError : ""}`}
        />
      </div>
      <div className={styles.entryRow}>
        <input
          type="text"
          value={draft.link ?? ""}
          onChange={(e) => update({ ...draft, link: e.target.value || null })}
          placeholder="Link (optional)"
          className={styles.entryInput}
          style={{ flex: 1 }}
        />
      </div>
      <div className={styles.entryRow}>
        <select
          value={draft.startMonth ?? ""}
          onChange={(e) => update({ ...draft, startMonth: e.target.value || null })}
          className={`${styles.entrySelect} ${showError && !monthValid ? styles.entryInputError : ""}`}
          disabled={!!draft.isIncoming}
        >
          {MONTHS.map((m) => (
            <option key={m.value} value={m.value}>
              {m.label}
            </option>
          ))}
        </select>
        <input
          type="text"
          value={draft.startYear ?? ""}
          onChange={(e) => update({ ...draft, startYear: e.target.value.slice(0, 4) || null })}
          placeholder="Year"
          className={`${styles.entryInput} ${styles.entryInputSmall} ${showError && !yearValid ? styles.entryInputError : ""}`}
        />
        <label className={styles.entryCheckbox}>
          <input
            type="checkbox"
            checked={draft.isCurrent}
            onChange={(e) => update({ ...draft, isCurrent: e.target.checked, isIncoming: false })}
          />
          Current
        </label>
        <label className={styles.entryCheckbox}>
          <input
            type="checkbox"
            checked={!!draft.isIncoming}
            onChange={(e) => update({ ...draft, isIncoming: e.target.checked, isCurrent: false, startMonth: null })}
          />
          Incoming
        </label>
        {!confirmingDelete && (
          <button
            type="button"
            onClick={() => setConfirmingDelete(true)}
            className={styles.entryRemove}
            aria-label="Remove entry"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
            </svg>
          </button>
        )}
        {!confirmingDelete && (
          <button
            type="button"
            onClick={() => {
              if (hasErrors) {
                setShowError(true);
                return;
              }
              onSave(draft);
            }}
            className={styles.entrySave}
            style={{ marginLeft: "auto" }}
          >
            Save changes
          </button>
        )}
      </div>
      {confirmingDelete && (
        <div className={styles.entryConfirmDelete}>
          <span>Delete this {type === "experience" ? "experience" : "leadership"} entry?</span>
          <div className={styles.entryConfirmActions}>
            <button
              type="button"
              onClick={() => setConfirmingDelete(false)}
              className={styles.entryConfirmCancel}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={onRemove}
              className={styles.entryConfirmDeleteBtn}
            >
              Delete
            </button>
          </div>
        </div>
      )}
      {showError && hasErrors && (
        <div className={styles.entryError}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true" style={{ flexShrink: 0 }}>
            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
            <line x1="12" y1="9" x2="12" y2="13" />
            <line x1="12" y1="17" x2="12.01" y2="17" />
          </svg>
          {getErrors().join(" ")}
        </div>
      )}
    </div>
  );
}

export default function InlineExperienceForm({ type, label }: InlineExperienceFormProps) {
  const { isOwner, editMode, experiences, leadership, setExperiences, setLeadership } = useInlineEdit();
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [isDirty, setIsDirty] = useState(false);
  const activeEntryRef = useRef<HTMLDivElement>(null);

  const isEntryBlank = (entry: Entry) => {
    const org = getOrg(entry);
    return (
      !entry.positionTitle?.trim() &&
      !org.trim() &&
      !entry.startMonth &&
      !entry.startYear &&
      !entry.link?.trim() &&
      !entry.isCurrent &&
      !entry.isIncoming
    );
  };

  const tryClose = () => {
    // Auto-delete blank entries on click-out
    if (editingIndex !== null && editingIndex < entries.length && isEntryBlank(entries[editingIndex])) {
      setEntries(entries.filter((_, i) => i !== editingIndex));
      setIsDirty(false);
      setEditingIndex(null);
      return;
    }
    if (isDirty) {
      const discard = window.confirm("You have unsaved changes. Discard them?");
      if (!discard) return;
    }
    setIsDirty(false);
    setEditingIndex(null);
  };

  useEffect(() => {
    if (editingIndex === null) return;
    const handleMouseDown = (e: MouseEvent) => {
      if (activeEntryRef.current && !activeEntryRef.current.contains(e.target as Node)) {
        tryClose();
      }
    };
    document.addEventListener("mousedown", handleMouseDown);
    return () => document.removeEventListener("mousedown", handleMouseDown);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editingIndex, isDirty]);

  const entries = type === "experience" ? experiences : leadership;

  const setEntries = (updated: Entry[]) => {
    if (type === "experience") {
      setExperiences(updated as ExperienceEntry[]);
    } else {
      setLeadership(updated as LeadershipEntry[]);
    }
  };

  const sortEntries = (es: Entry[]) =>
    [...es].map((e, i) => ({ entry: e, originalIndex: i })).sort((a, b) => {
      if (a.entry.isCurrent && !b.entry.isCurrent) return -1;
      if (!a.entry.isCurrent && b.entry.isCurrent) return 1;
      const yearA = a.entry.startYear ? parseInt(a.entry.startYear) : 0;
      const yearB = b.entry.startYear ? parseInt(b.entry.startYear) : 0;
      return yearB - yearA;
    });

  const [frozenOrder, setFrozenOrder] = useState<number[] | null>(null);
  const [prevEditingIndex, setPrevEditingIndex] = useState<number | null>(null);

  useEffect(() => {
    if (editingIndex !== prevEditingIndex) {
      // Re-sort when switching away from an entry, then freeze for the new one
      const newOrder = sortEntries(entries).map((x) => x.originalIndex);
      setFrozenOrder(editingIndex !== null ? newOrder : null);
      setPrevEditingIndex(editingIndex);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editingIndex]);

  const sorted = frozenOrder
    ? frozenOrder.filter((idx) => idx < entries.length).map((idx) => ({ entry: entries[idx], originalIndex: idx }))
    : sortEntries(entries);

  const handleUpdate = (originalIndex: number, updated: Entry) => {
    const next = [...entries];
    next[originalIndex] = updated;
    setEntries(next);
  };

  const handleRemove = (originalIndex: number) => {
    setEntries(entries.filter((_, i) => i !== originalIndex));
    setEditingIndex(null);
  };

  const isEntryComplete = (entry: Entry) => {
    const org = getOrg(entry);
    const hasBasicInfo = !!entry.positionTitle?.trim() && !!org.trim();
    // For incoming entries, only require year. For others, require both month and year.
    const hasDateInfo = entry.isIncoming ? !!entry.startYear : (!!entry.startMonth && !!entry.startYear);
    return hasBasicInfo && hasDateInfo;
  };

  const canAdd = entries.every(isEntryComplete);

  const addEntry = () => {
    if (!canAdd) return;
    const blank: Entry =
      type === "experience"
        ? { positionTitle: null, company: "", startMonth: null, startYear: null, isCurrent: false, link: null }
        : { positionTitle: null, org: "", startMonth: null, startYear: null, isCurrent: false, link: null };
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
          {sorted.map(({ entry }, i) => {
            const Tag = entry.link ? "a" : "div";
            const linkProps = entry.link
              ? { href: ensureHttps(entry.link), target: "_blank", rel: "noopener noreferrer" }
              : {};
            return (
            <Tag key={i} className={pageStyles.experienceItem} {...linkProps}>
              <div className={pageStyles.experienceInfo}>
                {entry.positionTitle && <p className={pageStyles.jobTitle}>{entry.positionTitle}</p>}
                <p className={pageStyles.companyName}>{getOrg(entry)}</p>
              </div>
              {(entry.isIncoming || entry.startYear) && (
                <span className={pageStyles.year}>
                  {entry.isIncoming ? `Incoming ${entry.startYear ?? ""}`.trim() : entry.startYear}
                  {!entry.isIncoming && entry.isCurrent ? " - Present" : ""}
                </span>
              )}
            </Tag>
            );
          })}
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
            onClick={canAdd ? addEntry : undefined}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === "Enter" && canAdd) addEntry();
            }}
          >
            Click to add {label.toLowerCase()}...
          </span>
        )}
        {sorted.map(({ entry, originalIndex }, i) =>
          editingIndex === originalIndex ? (
            <div key={originalIndex} ref={activeEntryRef}>
              <EntryForm
                entry={entry}
                type={type}
                onSave={(updated) => {
                  handleUpdate(originalIndex, updated);
                  setIsDirty(false);
                  setEditingIndex(null);
                }}
                onRemove={() => handleRemove(originalIndex)}
                onDirtyChange={setIsDirty}
              />
            </div>
          ) : (
            <div
              key={originalIndex}
              className={`${pageStyles.experienceItem} ${styles.editableField}`}
              style={sorted[i + 1]?.originalIndex === editingIndex ? { borderBottom: "none" } : undefined}
              onClick={() => setEditingIndex(originalIndex)}
            >
              <div className={pageStyles.experienceInfo}>
                {entry.positionTitle && <p className={pageStyles.jobTitle}>{entry.positionTitle}</p>}
                <p className={pageStyles.companyName}>{getOrg(entry)}</p>
              </div>
              {(entry.isIncoming || entry.startYear) && (
                <span className={pageStyles.year}>
                  {entry.isIncoming ? `Incoming ${entry.startYear ?? ""}`.trim() : entry.startYear}
                  {!entry.isIncoming && entry.isCurrent ? " - Present" : ""}
                </span>
              )}
            </div>
          )
        )}
        <button
          type="button"
          onClick={addEntry}
          disabled={!canAdd}
          className={styles.addEntryButton}
        >
          + Add {label.toLowerCase()}
        </button>
      </dd>
    </dl>
  );
}
