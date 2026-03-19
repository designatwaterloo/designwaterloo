"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/components/auth/AuthProvider";
import { useTransition } from "@/context/TransitionContext";
import { rest } from "@/lib/supabase/rest";
import Link from "@/components/Link";
import RejectionModal from "./RejectionModal";
import styles from "./AdminReviewBar.module.css";

interface AdminReviewBarProps {
  memberId: string;
  memberName: string;
}

export default function AdminReviewBar({ memberId, memberName }: AdminReviewBarProps) {
  const { session } = useAuth();
  const { startTransition } = useTransition();
  const [visible, setVisible] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);

  useEffect(() => {
    requestAnimationFrame(() => setVisible(true));
  }, []);

  const handleApprove = async () => {
    setActionLoading(true);
    const token = session?.access_token ?? null;
    const { error } = await rest(`members?id=eq.${memberId}`, {
      method: "PATCH",
      token: token ?? undefined,
      body: {
        is_approved: true,
        review_status: "approved",
      },
    });

    if (!error) {
      startTransition("/admin");
    }
    setActionLoading(false);
  };

  const handleRejectConfirm = async (feedback: string) => {
    setActionLoading(true);
    const token = session?.access_token ?? null;
    const { error } = await rest(`members?id=eq.${memberId}`, {
      method: "PATCH",
      token: token ?? undefined,
      body: {
        review_status: "rejected",
        rejection_feedback: feedback,
        rejected_at: new Date().toISOString(),
        is_approved: false,
      },
    });

    if (!error) {
      setShowRejectModal(false);
      startTransition("/admin");
    }
    setActionLoading(false);
  };

  return (
    <>
      <div className={`${styles.bar} ${visible ? styles.barVisible : ""}`}>
        <span className={styles.label}>Previewing profile</span>
        <div className={styles.actions}>
          <Link href="/admin" className={styles.backButton}>
            ← Back
          </Link>
          <button
            onClick={() => setShowRejectModal(true)}
            disabled={actionLoading}
            className={styles.rejectButton}
          >
            Reject
          </button>
          <button
            onClick={handleApprove}
            disabled={actionLoading}
            className={styles.approveButton}
          >
            Approve
          </button>
        </div>
      </div>

      {showRejectModal && (
        <RejectionModal
          memberName={memberName}
          loading={actionLoading}
          onConfirm={handleRejectConfirm}
          onCancel={() => setShowRejectModal(false)}
        />
      )}
    </>
  );
}
