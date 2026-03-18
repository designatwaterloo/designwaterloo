"use client";

import { useInlineEdit } from "./InlineEditProvider";
import type { ReviewStatus } from "@/types/database";
import styles from "./InlineEdit.module.css";

interface DynamicIslandToastProps {
  reviewStatus?: ReviewStatus;
  onSubmitForReview?: () => void;
}

export default function DynamicIslandToast({
  reviewStatus = "approved",
  onSubmitForReview,
}: DynamicIslandToastProps) {
  const { editMode, setEditMode, isDirty, saving, savedRecently, saveError, save, discard } =
    useInlineEdit();

  const visible = editMode || savedRecently;

  const isDraftOrRejected = reviewStatus === "draft" || reviewStatus === "rejected";
  const isPending = reviewStatus === "pending_review";

  // Success message varies by status
  const successMessage = isDraftOrRejected
    ? "Draft saved"
    : isPending
      ? "Changes saved"
      : "Changes saved";

  // Save button label varies by status
  const saveLabel = isDraftOrRejected ? "Save draft" : "Save changes";

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
          <span className={styles.toastLabel}>{successMessage}</span>
        </>
      ) : isDirty ? (
        <>
          <span className={styles.toastLabel}>
            {saving ? "Saving..." : saveError ? `Error: ${saveError}` : "Unsaved changes"}
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
              {saving ? "Saving..." : saveLabel}
            </button>
            {isDraftOrRejected && onSubmitForReview && (
              <button
                type="button"
                className={styles.toastSave}
                onClick={onSubmitForReview}
                disabled={saving}
              >
                Submit for review
              </button>
            )}
          </div>
        </>
      ) : (
        <>
          <span className={styles.toastLabel}>
            {isDraftOrRejected ? "Editing draft" : "Editing profile"}
          </span>
          <div className={styles.toastActions}>
            <button
              type="button"
              className={styles.toastDiscard}
              onClick={() => setEditMode(false)}
            >
              Done
            </button>
            {isDraftOrRejected && onSubmitForReview && (
              <button
                type="button"
                className={styles.toastSave}
                onClick={onSubmitForReview}
              >
                Submit for review
              </button>
            )}
            {!isDraftOrRejected && (
              <button
                type="button"
                className={styles.toastSave}
                onClick={() => setEditMode(false)}
              >
                Done
              </button>
            )}
          </div>
        </>
      )}
    </div>
  );
}
