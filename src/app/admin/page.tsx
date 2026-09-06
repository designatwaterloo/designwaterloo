"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/auth/AuthProvider";
import { createClient } from "@/lib/supabase/client";
import Footer from "@/components/Footer";
import Link from "@/components/Link";
import ConfirmDialog from "@/components/ConfirmDialog";
import type { Member } from "@/types/database";
import styles from "./page.module.css";

type ManagedMember = Pick<
  Member,
  | "id"
  | "first_name"
  | "last_name"
  | "slug"
  | "school_email"
  | "school"
  | "is_admin"
>;

export default function AdminPage() {
  const { member, loading: authLoading } = useAuth();
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);

  const [pendingMembers, setPendingMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);

  // Member management state
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<ManagedMember[]>([]);
  const [searching, setSearching] = useState(false);
  const [pendingAction, setPendingAction] = useState<
    | { kind: "promote" | "demote"; target: ManagedMember }
    | { kind: "impersonate"; target: ManagedMember }
    | null
  >(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actioning, setActioning] = useState(false);

  // Review-action state
  const [reviewing, setReviewing] = useState<string | null>(null);
  const [reviewError, setReviewError] = useState<string | null>(null);
  const [rejectFor, setRejectFor] = useState<Member | null>(null);
  const [rejectFeedback, setRejectFeedback] = useState("");

  useEffect(() => {
    if (!authLoading && (!member || !member.is_admin)) {
      router.replace("/");
    }
  }, [authLoading, member, router]);

  useEffect(() => {
    if (!member?.is_admin) return;
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from("members")
        .select("*")
        .eq("review_status", "pending_review")
        .order("created_at", { ascending: false });
      if (cancelled) return;
      setPendingMembers((data || []) as Member[]);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [member, supabase]);

  // Debounced member search by name or email.
  useEffect(() => {
    if (!member?.is_admin) return;
    const trimmed = query.trim();
    if (trimmed.length < 2) {
      setResults([]);
      return;
    }
    let cancelled = false;
    setSearching(true);
    const t = setTimeout(async () => {
      const like = `%${trimmed}%`;
      const { data } = await supabase
        .from("members")
        .select("id, first_name, last_name, slug, school_email, school, is_admin")
        .or(
          `first_name.ilike.${like},last_name.ilike.${like},school_email.ilike.${like}`,
        )
        .order("last_name", { ascending: true })
        .limit(25);
      if (cancelled) return;
      setResults((data || []) as ManagedMember[]);
      setSearching(false);
    }, 250);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [query, member, supabase]);

  const runSetAdmin = async (target: ManagedMember, isAdmin: boolean) => {
    setActioning(true);
    setActionError(null);
    try {
      const res = await fetch(`/api/admin/members/${target.id}/set-admin`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isAdmin }),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        setActionError(body.error || `Failed (${res.status})`);
        setActioning(false);
        return;
      }
      // Reflect locally without a full refetch.
      setResults((prev) =>
        prev.map((m) => (m.id === target.id ? { ...m, is_admin: isAdmin } : m)),
      );
      setPendingAction(null);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Request failed");
    }
    setActioning(false);
  };

  const runImpersonate = async (target: ManagedMember) => {
    setActioning(true);
    setActionError(null);
    try {
      const res = await fetch(`/api/admin/impersonate/${target.id}`, {
        method: "POST",
      });
      const body = (await res.json().catch(() => ({}))) as {
        error?: string;
        redirectTo?: string;
      };
      if (!res.ok) {
        setActionError(body.error || `Failed (${res.status})`);
        setActioning(false);
        return;
      }
      // Force a full reload so the new session cookies + banner take effect
      // and AuthProvider re-bootstraps with the impersonated user.
      window.location.assign(body.redirectTo || "/dashboard");
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Request failed");
      setActioning(false);
    }
  };

  const runApprove = async (m: Member) => {
    setReviewing(m.id);
    setReviewError(null);
    try {
      const res = await fetch(`/api/admin/members/${m.id}/approve`, {
        method: "POST",
      });
      if (!res.ok) {
        const b = (await res.json().catch(() => ({}))) as { error?: string };
        setReviewError(b.error || `Failed (${res.status})`);
      } else {
        setPendingMembers((prev) => prev.filter((p) => p.id !== m.id));
      }
    } catch (err) {
      setReviewError(err instanceof Error ? err.message : "Request failed");
    }
    setReviewing(null);
  };

  const runReject = async () => {
    if (!rejectFor) return;
    setReviewing(rejectFor.id);
    setReviewError(null);
    try {
      const res = await fetch(`/api/admin/members/${rejectFor.id}/reject`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ feedback: rejectFeedback }),
      });
      if (!res.ok) {
        const b = (await res.json().catch(() => ({}))) as { error?: string };
        setReviewError(b.error || `Failed (${res.status})`);
      } else {
        const rejectedId = rejectFor.id;
        setPendingMembers((prev) => prev.filter((p) => p.id !== rejectedId));
        setRejectFor(null);
        setRejectFeedback("");
      }
    } catch (err) {
      setReviewError(err instanceof Error ? err.message : "Request failed");
    }
    setReviewing(null);
  };

  const onConfirm = async () => {
    if (!pendingAction) return;
    if (pendingAction.kind === "promote") {
      await runSetAdmin(pendingAction.target, true);
    } else if (pendingAction.kind === "demote") {
      await runSetAdmin(pendingAction.target, false);
    } else {
      await runImpersonate(pendingAction.target);
    }
  };

  if (authLoading || !member?.is_admin) {
    return (
      <div>
        <main className="w-full min-h-[60vh] flex items-center justify-center">
          <p>Loading...</p>
        </main>
        <Footer />
      </div>
    );
  }

  const confirmCopy = (() => {
    if (!pendingAction) return null;
    const name = `${pendingAction.target.first_name} ${pendingAction.target.last_name}`;
    if (pendingAction.kind === "promote") {
      return {
        title: "Promote to admin",
        message: `Give ${name} full admin access? They will be able to approve members, promote others, and impersonate accounts.`,
        confirmLabel: "Promote",
      };
    }
    if (pendingAction.kind === "demote") {
      return {
        title: "Remove admin",
        message: `Remove admin access from ${name}?`,
        confirmLabel: "Remove",
      };
    }
    return {
      title: "Impersonate user",
      message: `You'll sign in as ${name} for testing. Your own session is stashed and can be restored from the banner at the top of the page.`,
      confirmLabel: "Impersonate",
    };
  })();

  return (
    <div>
      <main className="w-full">
        <section className={styles.section}>
          <h1>Admin Dashboard</h1>
          <p className={styles.subtitle}>
            Manage member approvals and site content.
          </p>
          <p className={styles.subtitle}>
            <Link href="/admin/data-issues">→ Data Issues</Link>
          </p>

          <div className={styles.card}>
            <h2>Pending Approvals ({pendingMembers.length})</h2>
            {loading ? (
              <p>Loading pending members...</p>
            ) : pendingMembers.length === 0 ? (
              <p className={styles.empty}>No pending approvals</p>
            ) : (
              <div className={styles.memberList}>
                {pendingMembers.map((m) => (
                  <div key={m.id} className={styles.memberItem}>
                    <div className={styles.memberInfo}>
                      <p className={styles.memberName}>
                        {m.first_name} {m.last_name}
                      </p>
                      <p className={styles.memberEmail}>{m.school_email}</p>
                      <p className={styles.memberSchool}>{m.school}</p>
                      {m.program && (
                        <p className={styles.memberProgram}>{m.program}</p>
                      )}
                    </div>
                    <div className={styles.memberActions}>
                      <Link
                        href={`/@${m.slug}`}
                        className={styles.previewLink}
                      >
                        Preview
                      </Link>
                      <button
                        type="button"
                        className={styles.actionButton}
                        disabled={reviewing === m.id}
                        onClick={() => runApprove(m)}
                      >
                        {reviewing === m.id ? "…" : "Approve"}
                      </button>
                      <button
                        type="button"
                        className={`${styles.actionButton} ${styles.actionButtonDanger}`}
                        disabled={reviewing === m.id}
                        onClick={() => {
                          setRejectFor(m);
                          setRejectFeedback("");
                        }}
                      >
                        Reject
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
            {reviewError && <p className={styles.statusError}>{reviewError}</p>}
          </div>

          <div className={styles.card}>
            <h2>Member Management</h2>
            <input
              type="text"
              placeholder="Search by name or email…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className={styles.searchInput}
            />
            {query.trim().length < 2 ? (
              <p className={styles.empty}>
                Type at least 2 characters to search.
              </p>
            ) : searching ? (
              <p>Searching…</p>
            ) : results.length === 0 ? (
              <p className={styles.empty}>No matches.</p>
            ) : (
              <div className={styles.memberList}>
                {results.map((m) => (
                  <div key={m.id} className={styles.memberItem}>
                    <div className={styles.memberInfo}>
                      <p className={styles.memberName}>
                        {m.first_name} {m.last_name}
                        {m.is_admin && (
                          <span className={styles.adminBadge}>ADMIN</span>
                        )}
                      </p>
                      <p className={styles.memberEmail}>{m.school_email}</p>
                      <p className={styles.memberSchool}>{m.school}</p>
                    </div>
                    <div className={styles.memberActions}>
                      <Link
                        href={`/@${m.slug}`}
                        className={styles.previewLink}
                      >
                        View
                      </Link>
                      {m.id !== member.id && (
                        <>
                          <button
                            type="button"
                            className={styles.actionButton}
                            onClick={() =>
                              setPendingAction({
                                kind: m.is_admin ? "demote" : "promote",
                                target: m,
                              })
                            }
                          >
                            {m.is_admin ? "Remove admin" : "Make admin"}
                          </button>
                          <button
                            type="button"
                            className={`${styles.actionButton} ${styles.actionButtonDanger}`}
                            onClick={() =>
                              setPendingAction({ kind: "impersonate", target: m })
                            }
                          >
                            Impersonate
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
            {actionError && <p className={styles.statusError}>{actionError}</p>}
          </div>
        </section>
      </main>
      <Footer />

      {pendingAction && confirmCopy && (
        <ConfirmDialog
          title={confirmCopy.title}
          message={confirmCopy.message}
          confirmLabel={confirmCopy.confirmLabel}
          onConfirm={onConfirm}
          onCancel={() => {
            setPendingAction(null);
            setActionError(null);
          }}
          loading={actioning}
        />
      )}

      {rejectFor && (
        <ConfirmDialog
          title={`Reject ${rejectFor.first_name} ${rejectFor.last_name}`}
          message="Explain what needs to change. This is shown to the member on their dashboard."
          confirmLabel="Send rejection"
          onConfirm={runReject}
          onCancel={() => {
            setRejectFor(null);
            setRejectFeedback("");
          }}
          loading={reviewing === rejectFor.id}
        >
          <textarea
            className={styles.searchInput}
            rows={4}
            placeholder="Feedback for the member…"
            value={rejectFeedback}
            onChange={(e) => setRejectFeedback(e.target.value)}
          />
        </ConfirmDialog>
      )}
    </div>
  );
}
