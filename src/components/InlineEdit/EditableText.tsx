"use client";

import { useState, useRef, useEffect } from "react";
import { useInlineEdit } from "./InlineEditProvider";
import type { EditableFields } from "./InlineEditProvider";
import styles from "./InlineEdit.module.css";

interface EditableTextProps {
  field: keyof EditableFields;
  placeholder?: string;
  suggestions?: string[];
  /** When true, value must be from suggestions list */
  strict?: boolean;
  multiline?: boolean;
  maxLength?: number;
  className?: string;
}

export default function EditableText({
  field,
  placeholder = "Click to add...",
  suggestions,
  strict = false,
  multiline = false,
  maxLength,
  className,
}: EditableTextProps) {
  const { isOwner, editMode, fields, setField } = useInlineEdit();
  const [editing, setEditing] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [searchValue, setSearchValue] = useState("");
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
      // In strict mode, show all options immediately and reset search
      if (strict) {
        setSearchValue("");
        setShowSuggestions(true);
      }
    }
  }, [editing, multiline, strict]);

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

  if (!isOwner || !editMode) {
    if (!value) return null;
    return <span className={className}>{value}</span>;
  }

  // Filtered suggestions
  const filterTerm = strict ? searchValue : value;
  const filtered = suggestions?.filter(
    (s) => s.toLowerCase().includes(filterTerm.toLowerCase()) && s !== value
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
    if (maxLength && val.length > maxLength) return;
    if (strict) {
      // In strict mode, update search text but don't set the field directly
      setSearchValue(val);
      setShowSuggestions(true);
    } else {
      setField(field, val || null);
      if (suggestions && val.length > 0) {
        setShowSuggestions(true);
      } else {
        setShowSuggestions(false);
      }
    }
  };

  const handleBlur = () => {
    // Small delay so suggestion clicks register
    setTimeout(() => {
      setEditing(false);
      setShowSuggestions(false);
      setSearchValue("");
    }, 150);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      setEditing(false);
      setShowSuggestions(false);
      setSearchValue("");
    }
    if (e.key === "Enter" && !multiline) {
      if (strict) {
        // In strict mode, auto-select if there's exactly one match
        if (filtered && filtered.length === 1) {
          setField(field, filtered[0]);
        }
      }
      setEditing(false);
      setShowSuggestions(false);
      setSearchValue("");
    }
  };

  const selectSuggestion = (s: string) => {
    setField(field, s);
    setShowSuggestions(false);
    setSearchValue("");
    setEditing(false);
  };

  return (
    <div className={styles.editableInputWrapper} ref={containerRef}>
      {multiline ? (
        <>
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
          {maxLength && (
            <span className={styles.pillHint} style={{ textAlign: "right" }}>
              {value.length}/{maxLength}
            </span>
          )}
        </>
      ) : (
        <input
          ref={inputRef as React.RefObject<HTMLInputElement>}
          type="text"
          value={strict ? searchValue : value}
          onChange={(e) => handleChange(e.target.value)}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          className={`${styles.editableInput} ${className ?? ""}`}
          placeholder={strict ? (value || placeholder) : placeholder}
        />
      )}
      {showSuggestions && filtered && filtered.length > 0 && (
        <div className={styles.suggestions} data-lenis-prevent>
          {filtered.slice(0, strict ? 8 : 6).map((s) => (
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
