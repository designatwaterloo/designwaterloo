"use client";

import { useInlineEdit } from "./InlineEditProvider";
import styles from "./InlineEdit.module.css";

interface DynamicIslandToastProps {
  isApproved?: boolean;
}

export default function DynamicIslandToast({ isApproved = true }: DynamicIslandToastProps) {
  const { editMode, setEditMode, isDirty, saving, savedRecently, save, discard } = useInlineEdit();

  const visible = editMode || savedRecently;

  return (
    <div
      className={`${styles.toast} ${visible ? styles.toastVisible : ""}`}
      role="status"
      aria-live="polite"
    >
      {savedRecently && !isDirty && !editMode ? (
        <>
          <svg
            width="16"
            height="16"
            viewBox="0 0 16 16"
            fill="none"
            style={{ flexShrink: 0 }}
          >
            <circle cx="8" cy="8" r="8" fill="#34C759" />
            <path
              d="M4.5 8.5L6.5 10.5L11.5 5.5"
              stroke="white"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          <span className={styles.toastLabel}>
            {isApproved ? "Changes saved" : "Profile submitted for review"}
          </span>
        </>
      ) : isDirty ? (
        <>
          <span className={styles.toastLabel}>
            {saving ? "Saving..." : "Unsaved changes"}
          </span>
          <div className={styles.toastActions}>
            <button
              type="button"
              className={styles.toastDiscard}
              onClick={discard}
              disabled={saving}
            >
              Discard
            </button>
            <button
              type="button"
              className={styles.toastSave}
              onClick={save}
              disabled={saving}
            >
              {saving
                ? "Saving..."
                : isApproved
                  ? "Save changes"
                  : "Submit profile"}
            </button>
          </div>
        </>
      ) : (
        <>
          <span className={styles.toastLabel}>
            {isApproved ? "Editing profile" : "Setting up profile"}
          </span>
          <div className={styles.toastActions}>
            <button
              type="button"
              className={styles.toastSave}
              onClick={() => setEditMode(false)}
            >
              {isApproved ? "Done" : "Submit profile"}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
