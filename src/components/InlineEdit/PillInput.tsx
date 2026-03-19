"use client";

import { useState, useRef, useEffect } from "react";
import { useInlineEdit } from "./InlineEditProvider";
import type { EditableFields } from "./InlineEditProvider";
import styles from "./InlineEdit.module.css";

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
  className,
}: PillInputProps) {
  const { isOwner, editMode, fields, setField } = useInlineEdit();
  const [inputValue, setInputValue] = useState("");
  const [focused, setFocused] = useState(false);
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
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [focused]);

  const addItem = (value: string) => {
    const trimmed = value.trim();
    if (!trimmed || items.includes(trimmed)) return;
    if (atMax) return;
    setField(field, [...items, trimmed] as EditableFields[typeof field]);
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
  if (!isOwner || !editMode) {
    if (items.length === 0) return null;
    return (
      <div className={`flex flex-wrap gap-2 ${className ?? ""}`}>
        {items.map((item) => {
          const past = isPast?.(item);
          return (
            <span
              key={item}
              className={`px-3 py-1 rounded-full text-sm ${
                past
                  ? "bg-[var(--foreground)]/20 text-[var(--foreground)]/40 line-through"
                  : "bg-[var(--foreground)] text-[var(--background)]"
              }`}
            >
              {renderPill ? renderPill(item) : item}
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
            onChange={(e) => setInputValue(e.target.value)}
            onFocus={() => setFocused(true)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                addItem(inputValue);
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
        <div className={styles.suggestions} data-lenis-prevent>
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
            !suggestions.includes(inputValue.trim()) &&
            !items.includes(inputValue.trim()) && (
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
      {maxItems && (
        <span className={styles.pillHint}>
          {items.length}/{maxItems} selected
        </span>
      )}
    </div>
  );
}
