"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import Link from "@/components/Link";
import RejectionModal from "./RejectionModal";
import styles from "./AdminReviewBar.module.css";

interface AdminReviewBarProps {
  memberId: string;
  memberName: string;
}

export default function AdminReviewBar({ memberId, memberName }: AdminReviewBarProps) {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const [visible, setVisible] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);

  useEffect(() => {
    requestAnimationFrame(() => setVisible(true));
  }, []);

  const handleApprove = async () => {
    setActionLoading(true);
    const { error } = await supabase
      .from("members")
      .update({
        is_approved: true,
        review_status: "approved" as const,
      })
      .eq("id", memberId);

    if (!error) {
      router.push("/admin");
    }
    setActionLoading(false);
  };

  const handleRejectConfirm = async (feedback: string) => {
    setActionLoading(true);
    const { error } = await supabase
      .from("members")
      .update({
        review_status: "rejected" as const,
        rejection_feedback: feedback,
        rejected_at: new Date().toISOString(),
        is_approved: false,
      })
      .eq("id", memberId);

    if (!error) {
      setShowRejectModal(false);
      router.push("/admin");
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
