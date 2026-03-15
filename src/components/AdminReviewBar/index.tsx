"use client";

import { useEffect, useState } from "react";
import { useTransition } from "@/context/TransitionContext";
import { createClient } from "@/lib/supabase/client";
import Link from "@/components/Link";
import styles from "./AdminReviewBar.module.css";

interface AdminReviewBarProps {
  memberId: string;
  memberName: string;
}

export default function AdminReviewBar({ memberId, memberName }: AdminReviewBarProps) {
  const { startTransition } = useTransition();
  const supabase = createClient();
  const [visible, setVisible] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    requestAnimationFrame(() => setVisible(true));
  }, []);

  const handleApprove = async () => {
    setActionLoading(true);
    const { error } = await supabase
      .from("members")
      .update({ is_approved: true } as never)
      .eq("id", memberId);

    if (!error) {
      startTransition("/admin");
    }
    setActionLoading(false);
  };

  const handleReject = async () => {
    if (!confirm(`Are you sure you want to reject and delete ${memberName}?`)) {
      return;
    }

    setActionLoading(true);
    const { error } = await supabase
      .from("members")
      .delete()
      .eq("id", memberId);

    if (!error) {
      startTransition("/admin");
    }
    setActionLoading(false);
  };

  return (
    <div className={`${styles.bar} ${visible ? styles.barVisible : ""}`}>
      <span className={styles.label}>Previewing profile</span>
      <div className={styles.actions}>
        <Link href="/admin" className={styles.backButton}>
          ← Back
        </Link>
        <button
          onClick={handleReject}
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
  );
}
