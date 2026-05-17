"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { useInlineEdit } from "./InlineEditProvider";
import type { EditableFields } from "./InlineEditProvider";
import { encodeSpecialtyCode } from "@/lib/specialties";
import styles from "./InlineEdit.module.css";

/** Maps EditableFields keys to directory filter query param names and optional value encoder */
const FILTER_PARAM_MAP: Partial<
  Record<keyof EditableFields, { param: string; encode?: (v: string) => string }>
> = {
  specialties: { param: "s", encode: encodeSpecialtyCode },
  work_schedule: { param: "a" },
};

interface PillInputProps {
  field: keyof EditableFields;
  suggestions?: string[];
  maxItems?: number;
  placeholder?: string;
  addLabel?: string;
  /** Render function for custom pill display (e.g. decoded term names) */
  renderPill?: (value: string) => string;
  /** Return true if a pill value represents a past/current item (will be grayed out + strikethrough) */
  isPast?: (value: string) => boolean;
  /** Return true to show a pulsing green dot (e.g. next recruiting term) */
  isHighlighted?: (value: string) => boolean;
  /** If true, items are kept sorted (ascending string sort) after each addition */
  sorted?: boolean;
  /** Validate a value before adding. Return an error message string, or null if valid. */
  validate?: (value: string) => string | null;
  className?: string;
}

export default function PillInput({
  field,
  suggestions = [],
  maxItems,
  placeholder = "Type to add...",
  addLabel = "Add skill",
  renderPill,
  isPast,
  isHighlighted,
  sorted,
  validate,
  className,
}: PillInputProps) {
  const { isOwner, editMode, fields, setField } = useInlineEdit();
  const [inputValue, setInputValue] = useState("");
  const [focused, setFocused] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const items = (fields[field] as string[]) ?? [];
  const atMax = maxItems != null && items.length >= maxItems;

  // Close on click outside
  useEffect(() => {
    if (!focused) return;
    const handleClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setFocused(false);
        setInputValue("");
        setError(null);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [focused]);

  const addItem = (value: string) => {
    const trimmed = value.trim();
    if (!trimmed || items.includes(trimmed)) return;
    if (atMax) return;
    if (validate) {
      const err = validate(trimmed);
      if (err) {
        setError(err);
        return;
      }
    }
    setError(null);
    const next = [...items, trimmed];
    if (sorted) next.sort();
    setField(field, next as EditableFields[typeof field]);
    setInputValue("");
  };

  const removeItem = (value: string) => {
    setField(field, items.filter((i) => i !== value) as EditableFields[typeof field]);
  };

  const handleAddSkillClick = () => {
    setFocused(true);
    setTimeout(() => inputRef.current?.focus(), 0);
  };

  // Non-owner or not in edit mode: just show the pills (or nothing)
  const filterMapping = FILTER_PARAM_MAP[field];
  if (!isOwner || !editMode) {
    if (items.length === 0) return null;
    return (
      <div className={`flex flex-wrap gap-2 ${className ?? ""}`}>
        {items.map((item) => {
          const past = isPast?.(item);
          const highlighted = !past && isHighlighted?.(item);
          const label = renderPill ? renderPill(item) : item;
          const baseClass = "px-3 py-1 rounded-full text-sm";
          const pillStyle: React.CSSProperties = past
            ? {
                backgroundColor: "color-mix(in srgb, var(--foreground) 20%, transparent)",
                color: "color-mix(in srgb, var(--foreground) 40%, transparent)",
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

          if (filterMapping) {
            const encoded = filterMapping.encode ? filterMapping.encode(item) : item;
            return (
              <Link
                key={item}
                href={`/directory?${filterMapping.param}=${encodeURIComponent(encoded)}`}
                className={baseClass}
                style={{ ...pillStyle, display: "inline-flex", alignItems: "center" }}
                data-cursor="grid-item"
                data-cursor-label={label}
                data-cursor-icon="search"
              >
                {dot}{label}
              </Link>
            );
          }

          return (
            <span key={item} className={baseClass} style={{ ...pillStyle, display: "inline-flex", alignItems: "center" }}>
              {dot}{label}
            </span>
          );
        })}
      </div>
    );
  }

  const lowerItems = items.map((i) => i.toLowerCase());
  const filtered = suggestions.filter(
    (s) =>
      !lowerItems.includes(s.toLowerCase()) &&
      s.toLowerCase().includes(inputValue.toLowerCase())
  );

  const showDropdown = focused && (filtered.length > 0 || inputValue.length > 0);

  return (
    <div
      className={`${styles.pillContainer} ${className ?? ""}`}
      ref={containerRef}
    >
      <div className={styles.pillList}>
        {items.map((item) => (
          <span key={item} className={`${styles.pill} ${isPast?.(item) ? styles.pillPast : ""}`}>
            {renderPill ? renderPill(item) : item}
            <button
              type="button"
              className={styles.pillRemove}
              onClick={() => removeItem(item)}
              aria-label={`Remove ${item}`}
            >
              ×
            </button>
          </span>
        ))}
        {!atMax && focused && (
          <input
            ref={inputRef}
            type="text"
            value={inputValue}
            onChange={(e) => { setInputValue(e.target.value); setError(null); }}
            onFocus={() => setFocused(true)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                const match = suggestions.find(
                  (s) => s.toLowerCase() === inputValue.trim().toLowerCase()
                );
                addItem(match ?? inputValue);
              }
              if (e.key === "Backspace" && !inputValue && items.length > 0) {
                removeItem(items[items.length - 1]);
              }
              if (e.key === "Escape") {
                setFocused(false);
                setInputValue("");
                inputRef.current?.blur();
              }
            }}
            placeholder={placeholder}
            className={styles.pillInput}
          />
        )}
        {!atMax && !focused && (
          <button
            type="button"
            className={styles.addSkillPill}
            onClick={handleAddSkillClick}
          >
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
              <path d="M6 1v10M1 6h10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
            {addLabel}
          </button>
        )}
      </div>
      {showDropdown && (
        <div className={styles.suggestions} data-lenis-prevent data-cursor="default">
          {filtered.slice(0, 8).map((s) => (
            <button
              key={s}
              type="button"
              className={styles.suggestionItem}
              onMouseDown={() => addItem(s)}
            >
              {renderPill ? renderPill(s) : s}
            </button>
          ))}
          {inputValue.trim() &&
            !suggestions.some((s) => s.toLowerCase() === inputValue.trim().toLowerCase()) &&
            !items.some((i) => i.toLowerCase() === inputValue.trim().toLowerCase()) && (
              <button
                type="button"
                className={`${styles.suggestionItem} ${styles.suggestionCreate}`}
                onMouseDown={() => addItem(inputValue)}
              >
                Add &ldquo;{inputValue.trim()}&rdquo;
              </button>
            )}
        </div>
      )}
      {error && (
        <div className={styles.entryError}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true" style={{ flexShrink: 0 }}>
            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
            <line x1="12" y1="9" x2="12" y2="13" />
            <line x1="12" y1="17" x2="12.01" y2="17" />
          </svg>
          {error}
        </div>
      )}
      {maxItems && (
        <span className={styles.pillHint}>
          {items.length}/{maxItems} selected
        </span>
      )}
    </div>
  );
}
