"use client";

import { useInlineEdit } from "./InlineEditProvider";
import styles from "./InlineEdit.module.css";

export default function DynamicIslandToast() {
  const { isDirty, saving, savedRecently, save, discard } = useInlineEdit();

  const visible = isDirty || savedRecently;

  return (
    <div
      className={`${styles.toast} ${visible ? styles.toastVisible : ""}`}
      role="status"
      aria-live="polite"
    >
      {savedRecently && !isDirty ? (
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
          <span className={styles.toastLabel}>Changes saved</span>
        </>
      ) : (
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
              {saving ? "Saving..." : "Save changes"}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
