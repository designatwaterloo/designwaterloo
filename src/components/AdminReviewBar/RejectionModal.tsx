"use client";

import { useState } from "react";
import styles from "./AdminReviewBar.module.css";

interface RejectionModalProps {
  memberName: string;
  loading?: boolean;
  onConfirm: (feedback: string) => void;
  onCancel: () => void;
}

export default function RejectionModal({
  memberName,
  loading = false,
  onConfirm,
  onCancel,
}: RejectionModalProps) {
  const [feedback, setFeedback] = useState("");

  return (
    <div className={styles.modalOverlay} onClick={onCancel}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <h2 className={styles.modalTitle}>Reject {memberName}</h2>
        <p className={styles.modalDescription}>
          Provide feedback so the member knows what to fix. They&apos;ll be able to edit
          and resubmit their profile.
        </p>
        <textarea
          className={styles.modalTextarea}
          value={feedback}
          onChange={(e) => setFeedback(e.target.value)}
          placeholder="Reason for rejection..."
          rows={4}
          autoFocus
        />
        <div className={styles.modalActions}>
          <button
            type="button"
            className={styles.backButton}
            onClick={onCancel}
            disabled={loading}
          >
            Cancel
          </button>
          <button
            type="button"
            className={styles.rejectButton}
            onClick={() => onConfirm(feedback)}
            disabled={loading || !feedback.trim()}
          >
            {loading ? "Rejecting..." : "Reject with feedback"}
          </button>
        </div>
      </div>
    </div>
  );
}
