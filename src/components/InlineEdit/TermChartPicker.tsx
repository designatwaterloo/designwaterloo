"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { useInlineEdit } from "./InlineEditProvider";
import { decodeTermCode, getCurrentTermCode, getNextTermCode } from "@/lib/termUtils";
import styles from "./TermChartPicker.module.css";
import editStyles from "./InlineEdit.module.css";

/** Season code → label */
const SEASONS = [
  { code: "1", label: "Winter" },
  { code: "5", label: "Spring" },
  { code: "9", label: "Fall" },
] as const;

/** Build the year range: from 1 year before current to 3 years ahead */
function getYearRange(): number[] {
  const now = new Date();
  const currentYear = now.getFullYear();
  const years: number[] = [];
  for (let y = currentYear - 1; y <= currentYear + 3; y++) {
    years.push(y);
  }
  return years;
}

/** Build a term code from year + season code */
function buildTermCode(year: number, seasonCode: string): string {
  const yy = year.toString().slice(-2);
  return `1${yy}${seasonCode}`;
}

export default function TermChartPicker() {
  const { isOwner, editMode, fields, setField } = useInlineEdit();
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const items = (fields.work_schedule as string[]) ?? [];
  const currentCode = getCurrentTermCode();
  const nextCode = getNextTermCode(items);
  const years = getYearRange();

  // Close on click outside
  useEffect(() => {
    if (!open) return;
    const handleClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  const toggleTerm = (code: string) => {
    const next = items.includes(code)
      ? items.filter((i) => i !== code)
      : [...items, code].sort();
    setField("work_schedule", next);
  };

  // Read-only view: show pills (same as before)
  if (!isOwner || !editMode) {
    if (items.length === 0) return null;
    return (
      <div className="flex flex-wrap gap-2">
        {items.map((item) => {
          const past = item <= currentCode;
          const highlighted = !past && item === nextCode;
          const label = decodeTermCode(item);
          const baseClass = "px-3 py-1 rounded-full text-sm";
          const pillStyle: React.CSSProperties = past
            ? {
                backgroundColor: "color-mix(in srgb, var(--foreground) 20%, transparent)",
                color: "var(--foreground)",
                textDecoration: "line-through",
              }
            : {
                backgroundColor: "var(--foreground)",
                color: "var(--background)",
                textDecoration: "none",
              };

          const dot = highlighted ? (
            <span
              style={{
                position: "relative",
                display: "inline-block",
                width: 8,
                height: 8,
                marginRight: 6,
                flexShrink: 0,
              }}
            >
              <span style={{
                position: "absolute",
                inset: 0,
                borderRadius: "50%",
                backgroundColor: "#22c55e",
                animation: "pulse-ring 2s ease-out infinite",
              }} />
              <span style={{
                position: "relative",
                display: "block",
                width: 8,
                height: 8,
                borderRadius: "50%",
                backgroundColor: "#22c55e",
              }} />
            </span>
          ) : null;

          return (
            <Link
              key={item}
              href={`/directory?a=${encodeURIComponent(item)}`}
              className={baseClass}
              style={{ ...pillStyle, display: "inline-flex", alignItems: "center" }}
            >
              {dot}{label}
            </Link>
          );
        })}
      </div>
    );
  }

  // Edit mode: show pills + chart picker on click
  return (
    <div className={styles.container} ref={containerRef}>
      {/* Selected pills */}
      <div className={editStyles.pillList}>
        {items.map((item) => (
          <span
            key={item}
            className={`${editStyles.pill} ${item <= currentCode ? editStyles.pillPast : ""}`}
          >
            {decodeTermCode(item)}
            <button
              type="button"
              className={editStyles.pillRemove}
              onClick={() => toggleTerm(item)}
              aria-label={`Remove ${decodeTermCode(item)}`}
            >
              &times;
            </button>
          </span>
        ))}
        {!open && (
          <button
            type="button"
            className={editStyles.addSkillPill}
            onClick={() => setOpen(true)}
          >
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
              <path d="M6 1v10M1 6h10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
            Add work term
          </button>
        )}
      </div>

      {/* Chart picker popover */}
      {open && (
        <div className={styles.chart}>
          {/* Header row: year labels */}
          <div className={styles.headerRow}>
            <div className={styles.seasonLabel} />
            {years.map((year) => (
              <div key={year} className={styles.yearLabel}>
                {year}
              </div>
            ))}
          </div>

          {/* Season rows */}
          {SEASONS.map(({ code: seasonCode, label }) => (
            <div key={seasonCode} className={styles.seasonRow}>
              <div className={styles.seasonLabel}>{label}</div>
              {years.map((year) => {
                const termCode = buildTermCode(year, seasonCode);
                const selected = items.includes(termCode);
                const past = termCode <= currentCode;
                const isCurrent = termCode === currentCode;

                return (
                  <button
                    key={termCode}
                    type="button"
                    className={`${styles.cell} ${selected ? styles.cellSelected : ""} ${past && !isCurrent ? styles.cellPast : ""} ${isCurrent ? styles.cellCurrent : ""}`}
                    onClick={() => toggleTerm(termCode)}
                    aria-label={`${selected ? "Remove" : "Add"} ${label} ${year}`}
                    aria-pressed={selected}
                  >
                    {selected && (
                      <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
                        <path d="M3 7l3 3 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    )}
                  </button>
                );
              })}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
