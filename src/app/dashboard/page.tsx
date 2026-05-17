"use client";

import { useEffect, useState, useMemo } from "react";
import { useAuth } from "@/components/auth/AuthProvider";
import { useTransition } from "@/context/TransitionContext";
import { createClient } from "@/lib/supabase/client";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import Link from "@/components/Link";
import ConfirmDialog from "@/components/ConfirmDialog";
import type { ReviewStatus } from "@/types/database";
import styles from "./page.module.css";

export default function DashboardPage() {
  const { user, member, loading: authLoading, signOut } = useAuth();
  const { startTransition } = useTransition();
  const { submitForReview, submitting, submitError } = useSubmitForReview();
  const [showSubmitConfirm, setShowSubmitConfirm] = useState(false);
  const [signingOut, setSigningOut] = useState(false);

  const hasMember = !!member;

  useEffect(() => {
    if (authLoading || signingOut) return;

    if (!user) {
      startTransition("/sign-in");
      return;
    }

    // User is authenticated but no linked member found —
    // redirect to onboarding so they can create/link their profile.
    if (!hasMember) {
      startTransition("/profile/edit");
    }
  }, [authLoading, user, hasMember, signingOut, startTransition]);

  if (authLoading || !user || !member) {
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
  const isProfileSparse = !member.profile_image_url || !member.bio;
  const isDraftOrRejected = status === "draft" || status === "rejected";

  const handleConfirmSubmit = async () => {
    await submitForReview();
    setShowSubmitConfirm(false);
  };

  return (
    <div>
      <Header />
      <main className="w-full">
        <section className={styles.section}>
          <h1 className={styles.title}>{member.first_name} {member.last_name}</h1>

          <div className={styles.card}>

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
                  <Link href={`${profileUrl}?edit=true`} className={styles.secondaryButton}>
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
                  <Link href={`${profileUrl}?edit=true`} className={styles.secondaryButton}>
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
                  <Link href={`${profileUrl}?edit=true`} className={styles.primaryButton}>
                    Edit &amp; resubmit
                  </Link>
                </div>
              </>
            )}
          </div>

          {isDraftOrRejected && (
            <button
              type="button"
              className={styles.submitButton}
              onClick={() => setShowSubmitConfirm(true)}
            >
              {status === "rejected" ? "Resubmit now" : "Submit for review"}
            </button>
          )}

          {submitError && (
            <p style={{ color: "var(--error)", fontSize: "14px", margin: 0 }}>
              {submitError}
            </p>
          )}

          <button
            type="button"
            className={styles.signOutButton}
            data-cursor="button"
            data-cursor-label="Sign Out"
            onClick={async () => {
              setSigningOut(true);
              await signOut();
              window.location.href = "/";
            }}
          >
            Sign out
          </button>
        </section>
      </main>
      <Footer />

      {showSubmitConfirm && (
        <ConfirmDialog
          title="Submit for review"
          message={
            isProfileSparse
              ? "Your profile is missing a photo or bio. Profiles with more details are more likely to be approved. Submit anyway?"
              : "Your profile will be reviewed by an admin before appearing in the directory."
          }
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
  const { member, refreshMember } = useAuth();
  const supabase = useMemo(() => createClient(), []);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const submitForReview = async () => {
    if (!member) return;
    setSubmitting(true);
    setSubmitError(null);

    const { error } = await supabase
      .from("members")
      .update({
        review_status: "pending_review" as const,
        submitted_at: new Date().toISOString(),
        is_approved: false,
      })
      .eq("id", member.id);

    if (error) {
      setSubmitError("Failed to submit your profile for review. Please try again.");
      setSubmitting(false);
      return;
    }

    await refreshMember().catch(() => {});
    setSubmitting(false);
  };

  return { submitForReview, submitting, submitError };
}
