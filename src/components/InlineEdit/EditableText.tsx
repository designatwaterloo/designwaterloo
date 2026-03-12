"use client";

import { useState, useRef, useEffect } from "react";
import { useInlineEdit } from "./InlineEditProvider";
import type { EditableFields } from "./InlineEditProvider";
import styles from "./InlineEdit.module.css";

interface EditableTextProps {
  field: keyof EditableFields;
  placeholder?: string;
  suggestions?: string[];
  multiline?: boolean;
  className?: string;
}

export default function EditableText({
  field,
  placeholder = "Click to add...",
  suggestions,
  multiline = false,
  className,
}: EditableTextProps) {
  const { isOwner, fields, setField } = useInlineEdit();
  const [editing, setEditing] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const value = (fields[field] as string | null) ?? "";

  useEffect(() => {
    if (editing && inputRef.current) {
      inputRef.current.focus();
      // Place cursor at end
      const len = inputRef.current.value.length;
      inputRef.current.setSelectionRange(len, len);
      // Auto-size textarea to content
      if (multiline) {
        const el = inputRef.current;
        el.style.height = "auto";
        el.style.height = `${el.scrollHeight}px`;
      }
    }
  }, [editing, multiline]);

  // Auto-resize textarea as content changes
  useEffect(() => {
    if (editing && multiline && inputRef.current) {
      const el = inputRef.current;
      el.style.height = "auto";
      el.style.height = `${el.scrollHeight}px`;
    }
  }, [value, editing, multiline]);

  // Close suggestions on click outside
  useEffect(() => {
    if (!showSuggestions) return;
    const handleClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [showSuggestions]);

  if (!isOwner) {
    if (!value) return null;
    return <span className={className}>{value}</span>;
  }

  // Filtered suggestions
  const filtered = suggestions?.filter(
    (s) => s.toLowerCase().includes(value.toLowerCase()) && s !== value
  );

  if (!editing) {
    return (
      <span
        className={`${styles.editableField} ${!value ? styles.editablePlaceholder : ""} ${className ?? ""}`}
        onClick={() => setEditing(true)}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") setEditing(true);
        }}
      >
        {value || placeholder}
      </span>
    );
  }

  const handleChange = (val: string) => {
    setField(field, val || null);
    if (suggestions && val.length > 0) {
      setShowSuggestions(true);
    } else {
      setShowSuggestions(false);
    }
  };

  const handleBlur = () => {
    // Small delay so suggestion clicks register
    setTimeout(() => {
      setEditing(false);
      setShowSuggestions(false);
    }, 150);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      setEditing(false);
      setShowSuggestions(false);
    }
    if (e.key === "Enter" && !multiline) {
      setEditing(false);
      setShowSuggestions(false);
    }
  };

  const selectSuggestion = (s: string) => {
    setField(field, s);
    setShowSuggestions(false);
    setEditing(false);
  };

  return (
    <div className={styles.editableInputWrapper} ref={containerRef}>
      {multiline ? (
        <textarea
          ref={inputRef as React.RefObject<HTMLTextAreaElement>}
          value={value}
          onChange={(e) => handleChange(e.target.value)}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          className={`${styles.editableInput} ${styles.editableTextarea} ${className ?? ""}`}
          placeholder={placeholder}
          rows={1}
        />
      ) : (
        <input
          ref={inputRef as React.RefObject<HTMLInputElement>}
          type="text"
          value={value}
          onChange={(e) => handleChange(e.target.value)}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          className={`${styles.editableInput} ${className ?? ""}`}
          placeholder={placeholder}
        />
      )}
      {showSuggestions && filtered && filtered.length > 0 && (
        <div className={styles.suggestions}>
          {filtered.slice(0, 6).map((s) => (
            <button
              key={s}
              type="button"
              className={styles.suggestionItem}
              onMouseDown={() => selectSuggestion(s)}
            >
              {s}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
