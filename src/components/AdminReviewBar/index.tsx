"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/components/auth/AuthProvider";
import { useTransition } from "@/context/TransitionContext";
import { rest } from "@/lib/supabase/rest";
import Link from "@/components/Link";
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

  useEffect(() => {
    requestAnimationFrame(() => setVisible(true));
  }, []);

  const handleApprove = async () => {
    setActionLoading(true);
    const token = session?.access_token ?? null;
    const { error } = await rest(`members?id=eq.${memberId}`, {
      method: "PATCH",
      token: token ?? undefined,
      body: { is_approved: true },
    });

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
    const token = session?.access_token ?? null;
    const { error } = await rest(`members?id=eq.${memberId}`, {
      method: "DELETE",
      token: token ?? undefined,
    });

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
