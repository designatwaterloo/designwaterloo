"use client";

import { useInlineEdit } from "./InlineEditProvider";
import styles from "./InlineEdit.module.css";

export default function DynamicIslandToast() {
  const { isDirty, saving, save, discard } = useInlineEdit();

  return (
    <div
      className={`${styles.toast} ${isDirty ? styles.toastVisible : ""}`}
      role="status"
      aria-live="polite"
    >
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
    </div>
  );
}
