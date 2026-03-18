"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/components/auth/AuthProvider";
import { useTransition } from "@/context/TransitionContext";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import Link from "@/components/Link";
import ConfirmDialog from "@/components/ConfirmDialog";
import type { ReviewStatus } from "@/types/database";
import styles from "./page.module.css";

export default function DashboardPage() {
  const { member, loading: authLoading } = useAuth();
  const { startTransition } = useTransition();
  const { submitForReview, submitting } = useSubmitForReview();
  const [showSubmitConfirm, setShowSubmitConfirm] = useState(false);

  useEffect(() => {
    if (!authLoading && !member) {
      startTransition("/sign-in");
    }
  }, [authLoading, member, startTransition]);

  if (authLoading || !member) {
    return (
      <div>
        <Header />
        <main className="w-full min-h-[60vh] flex items-center justify-center">
          <p>Loading...</p>
        </main>
        <Footer />
      </div>
    );
  }

  const status = (member.review_status ?? "draft") as ReviewStatus;
  const profileUrl = `/directory/${member.slug}`;

  const handleConfirmSubmit = async () => {
    await submitForReview();
    setShowSubmitConfirm(false);
  };

  return (
    <div>
      <Header />
      <main className="w-full">
        <section className={styles.section}>
          <h1 className={styles.title}>Your Profile</h1>

          <div className={styles.card}>
            <div className={styles.statusRow}>
              <span>Status:</span>
              <span className={`${styles.statusBadge} ${statusClass(status)}`}>
                {statusLabel(status)}
              </span>
            </div>

            {status === "draft" && (
              <>
                <p className={styles.description}>
                  Your profile hasn&apos;t been submitted yet. Fill out your details
                  and submit for review to appear in the directory.
                </p>
                <div className={styles.actions}>
                  <Link href={profileUrl} className={styles.primaryButton}>
                    Edit profile
                  </Link>
                  <button
                    type="button"
                    className={styles.secondaryButton}
                    onClick={() => setShowSubmitConfirm(true)}
                  >
                    Submit for review
                  </button>
                </div>
              </>
            )}

            {status === "pending_review" && (
              <>
                <p className={styles.description}>
                  Your profile is under review by an admin. You&apos;ll be notified once
                  it&apos;s approved.
                </p>
                {member.submitted_at && (
                  <p className={styles.date}>
                    Submitted {new Date(member.submitted_at).toLocaleDateString()}
                  </p>
                )}
                <div className={styles.actions}>
                  <Link href={profileUrl} className={styles.secondaryButton}>
                    Edit profile
                  </Link>
                </div>
              </>
            )}

            {status === "approved" && (
              <>
                <p className={styles.description}>
                  Your profile is live in the directory.
                </p>
                <div className={styles.actions}>
                  <Link href={profileUrl} className={styles.primaryButton}>
                    View profile
                  </Link>
                  <Link href={profileUrl} className={styles.secondaryButton}>
                    Edit profile
                  </Link>
                </div>
              </>
            )}

            {status === "rejected" && (
              <>
                <p className={styles.description}>
                  Your profile needs changes before it can be approved.
                </p>
                {member.rejected_at && (
                  <p className={styles.date}>
                    Rejected {new Date(member.rejected_at).toLocaleDateString()}
                  </p>
                )}
                {member.rejection_feedback && (
                  <div className={styles.feedbackBox}>
                    <div className={styles.feedbackLabel}>Admin feedback</div>
                    {member.rejection_feedback}
                  </div>
                )}
                <div className={styles.actions}>
                  <Link href={profileUrl} className={styles.primaryButton}>
                    Edit &amp; resubmit
                  </Link>
                  <button
                    type="button"
                    className={styles.secondaryButton}
                    onClick={() => setShowSubmitConfirm(true)}
                  >
                    Resubmit now
                  </button>
                </div>
              </>
            )}
          </div>
        </section>
      </main>
      <Footer />

      {showSubmitConfirm && (
        <ConfirmDialog
          title="Submit for review"
          message="Your profile will be reviewed by an admin before appearing in the directory."
          confirmLabel="Submit"
          onConfirm={handleConfirmSubmit}
          onCancel={() => setShowSubmitConfirm(false)}
          loading={submitting}
        />
      )}
    </div>
  );
}

// ─── Helpers ───

function statusLabel(s: ReviewStatus): string {
  switch (s) {
    case "draft": return "Not submitted";
    case "pending_review": return "Under review";
    case "approved": return "Approved";
    case "rejected": return "Needs changes";
  }
}

function statusClass(s: ReviewStatus): string {
  switch (s) {
    case "draft": return styles.statusDraft;
    case "pending_review": return styles.statusPending;
    case "approved": return styles.statusApproved;
    case "rejected": return styles.statusRejected;
  }
}

/** Hook to submit for review from the dashboard (no InlineEditProvider context) */
function useSubmitForReview() {
  const { member, session, refreshMember } = useAuth();
  const [submitting, setSubmitting] = useState(false);

  const submitForReview = async () => {
    if (!member || !session?.access_token) return;
    setSubmitting(true);

    const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

    await fetch(`${SUPABASE_URL}/rest/v1/members?id=eq.${member.id}`, {
      method: "PATCH",
      headers: {
        apikey: ANON_KEY,
        Authorization: `Bearer ${session.access_token}`,
        "Content-Type": "application/json",
        Prefer: "return=representation",
      },
      body: JSON.stringify({
        review_status: "pending_review",
        submitted_at: new Date().toISOString(),
        is_approved: false,
      }),
    });

    await refreshMember().catch(() => {});
    setSubmitting(false);
  };

  return { submitForReview, submitting };
}
