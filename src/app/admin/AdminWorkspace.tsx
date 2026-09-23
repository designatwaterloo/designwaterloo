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
import { canReview } from "@/lib/admin-access";
import SubmissionReview from "./SubmissionReview";

type ManagedMember = Pick<
  Member,
  | "id"
  | "first_name"
  | "last_name"
  | "slug"
  | "school_email"
  | "school"
  | "profile_image_url"
  | "is_admin"
  | "review_status"
>;

function RowAvatar({person}:{person:Pick<Member,'profile_image_url'|'first_name'|'last_name'>}) {
  const [failed,setFailed]=useState(false);
  return <span className={styles.rowAvatar} aria-hidden="true">{person.profile_image_url&&!failed?<img src={person.profile_image_url} alt="" loading="lazy" onError={()=>setFailed(true)}/>:`${person.first_name?.[0]||''}${person.last_name?.[0]||''}`}</span>;
}

export default function AdminPage({ view = "submissions" }: { view?: "submissions" | "members" }) {
  const { member, user, loading: authLoading } = useAuth();
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);

  const [pendingMembers, setPendingMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);

  // Member management state
  const [reviewerIds,setReviewerIds]=useState<string[]>([]);
  useEffect(()=>{if(member?.is_admin)fetch("/api/admin/reviewers").then(async res=>{if(res.ok)setReviewerIds((await res.json()).memberIds);}).catch(()=>{});},[member]);
  const [page, setPage] = useState(0);
  const [total, setTotal] = useState(0);
  const [status, setStatus] = useState("");
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
  const [selectedReview, setSelectedReview] = useState<string | null>(null);
  const [approveFor, setApproveFor] = useState<Member | null>(null);
  const [reviewNotice, setReviewNotice] = useState("");
  const [reviewing, setReviewing] = useState<string | null>(null);
  const [reviewError, setReviewError] = useState<string | null>(null);
  const [rejectFor, setRejectFor] = useState<Member | null>(null);
  const [rejectFeedback, setRejectFeedback] = useState("");

  useEffect(() => {
    if (!authLoading && view === "members" && member && !member.is_admin && canReview(member,user)) {router.replace("/admin");return;}
    if (!authLoading && (!member || !canReview(member,user))) {
      router.replace("/");
    }
  }, [authLoading, member, user, view, router]);

  useEffect(() => {
    if (!canReview(member,user)) return;
    let cancelled = false;
    (async () => {
      const { data, error } = await supabase
        .from("members")
        .select("*")
        .eq("review_status", "pending_review")
        .order("submitted_at", { ascending: true, nullsFirst: false });
      if (cancelled) return;
      if (error) setReviewError("Couldn’t load submissions. Refresh to try again.");
      setPendingMembers((data || []) as Member[]);
      const requested = new URLSearchParams(window.location.search).get("review");
      setSelectedReview(requested || data?.[0]?.id || null);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [member, user, supabase]);

  // Debounced member search by name or email.
  useEffect(() => {
    if (!member?.is_admin) return;
    const trimmed = query.trim();
    if (view !== "members") return;
    let cancelled = false;
    setSearching(true);
    const t = setTimeout(async () => {
      const like = `%${trimmed.replace(/[,%()]/g, "")}%`;
      let request = supabase.from("members")
        .select("id, first_name, last_name, slug, school_email, school, profile_image_url, is_admin, review_status", { count: "exact" });
      if (trimmed) request = request.or(`first_name.ilike.${like},last_name.ilike.${like},school_email.ilike.${like}`);
      if (status) request = request.eq("review_status", status as Member["review_status"]);
      const { data, count, error } = await request.order("last_name", { ascending: true }).order("id").range(page * 25, page * 25 + 24);
      if (!cancelled) { setTotal(count || 0); setActionError(error ? "Couldn’t load members. Try again." : null); }
      if (cancelled) return;
      setResults((data || []) as ManagedMember[]);
      setSearching(false);
    }, 250);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [query, status, page, view, member, supabase]);

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
      setReviewerIds(prev=>isAdmin?[...prev,target.id]:prev.filter(id=>id!==target.id));
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
        setApproveFor(null);
        setReviewNotice(`${m.first_name} ${m.last_name} approved.`);
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
        setReviewNotice(`Changes requested for ${rejectFor.first_name} ${rejectFor.last_name}.`);
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

  if (authLoading || !canReview(member,user) || !member || (view === "members" && !member.is_admin)) {
    return (
      <div>
        <main data-admin-workspace className="w-full min-h-[60vh] flex items-center justify-center">
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
        title: "Grant admin access",
        message: `Allow ${name} to review profiles, approve submissions, and request changes? They cannot manage roles, impersonate users, or access data cleanup.`,
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
      <main data-admin-workspace className="w-full">
        <section className={styles.section}>
          <header className={styles.pageHeader}><div><h1>{view === "members" ? "Members" : "Review submissions"}</h1><p className={styles.subtitle}>{view === "members" ? "Browse profiles, review status, and manage access." : "Meet the students joining Design Waterloo."}</p></div></header>
          {view === "submissions" && <div className={styles.reviewSection}>
            <div className={styles.queueHeading}><h2>Awaiting review <span>{pendingMembers.length}</span></h2><p>Oldest submissions first</p></div>
            {reviewNotice && <p role="status" className={styles.notice}>{reviewNotice}</p>}
            {loading ? <p>Loading submissions…</p> : pendingMembers.length === 0 ? <p className={styles.empty}>You’re all caught up. New submissions will appear here.</p> : <div className={styles.reviewLayout}>
              <table className={styles.submissionTable} aria-label="Pending submissions">
                <thead><tr><th scope="col">Student</th><th scope="col">Submitted</th></tr></thead>
                <tbody>{pendingMembers.map(m=>{
                  const selected = (pendingMembers.find(p=>p.id===selectedReview)||pendingMembers[0]).id===m.id;
                  return <tr key={m.id} data-selected={selected} onClick={()=>{if(!reviewing){setSelectedReview(m.id);setReviewError(null);window.history.replaceState(null,'',`/admin?review=${m.id}`);}}}>
                    <td><button type="button" disabled={!!reviewing} aria-current={selected?'true':undefined} aria-controls="submission-review-panel"><span className={styles.rowIdentity}><RowAvatar key={m.profile_image_url||m.id} person={m}/><span className={styles.rowIdentityText}><strong>{m.first_name} {m.last_name}</strong><span>{m.program||m.school}</span>{m.school_email.endsWith('@test.designwaterloo.local')&&<small>Demo account</small>}</span></span></button></td>
                    <td>{m.submitted_at?<time dateTime={m.submitted_at}>{new Date(m.submitted_at).toLocaleDateString('en-CA',{month:'short',day:'numeric'})}</time>:'—'}</td>
                  </tr>;
                })}</tbody>
              </table>
              <aside id="submission-review-panel" className={styles.reviewPanel} aria-label="Submission details">
              <SubmissionReview member={pendingMembers.find(m=>m.id===selectedReview)||pendingMembers[0]} busy={!!reviewing} onApprove={m=>{setReviewError(null);setApproveFor(m);}} onChanges={m=>{setReviewError(null);setRejectFor(m);setRejectFeedback('');}}/>
              </aside>
            </div>}
            {reviewError && <p role="alert" className={styles.statusError}>{reviewError}</p>}
          </div>}

          {view === "members" && <div className={styles.card}>
            <div className={styles.tableToolbar}>
            <input
              type="text"
              name="member-search"
              aria-label="Search members"
              placeholder="Search by name or email…"
              value={query}
              onChange={(e) => {setQuery(e.target.value);setPage(0);}}
              className={styles.searchInput}
            />
            <select aria-label="Filter by review status" value={status} onChange={e=>{setStatus(e.target.value);setPage(0);}}><option value="">All statuses</option><option value="draft">Draft</option><option value="pending_review">Awaiting review</option><option value="approved">Approved</option><option value="rejected">Changes requested</option></select></div>
            {searching ? (
              <p>Searching…</p>
            ) : results.length === 0 ? (
              <p className={styles.empty}>No matches.</p>
            ) : (
              <div className={styles.tableScroll}><table className={styles.membersTable}><thead><tr><th>Member</th><th>School</th><th>Status</th><th>Actions</th></tr></thead><tbody>
                {results.map((m) => (
                  <tr key={m.id}>
                    <td><div className={styles.rowIdentity}><RowAvatar key={m.profile_image_url||m.id} person={m}/><div className={styles.rowIdentityText}>
                      <p className={styles.memberName}>
                        {m.first_name} {m.last_name}
                        {(m.is_admin || reviewerIds.includes(m.id)) && (
                          <span className={styles.adminBadge}>{m.is_admin?"SUPERADMIN":"ADMIN"}</span>
                        )}
                      </p>
                      <p className={styles.memberEmail}>{m.school_email}</p>
                      </div></div></td><td><abbr title={m.school||undefined} className={styles.schoolAbbreviation}>{m.school === "University of Waterloo" ? "UW" : m.school === "Wilfrid Laurier University" ? "WLU" : m.school}</abbr></td><td><span className={styles.statusBadge}>{({draft:"Draft",pending_review:"Awaiting review",approved:"Approved",rejected:"Changes requested"} as Record<string,string>)[m.review_status] || m.review_status}</span></td>
                    <td><details className={styles.memberMenu}><summary>Manage</summary><div className={styles.memberActions}>
                      <Link
                        href={`/@${m.slug}`}
                        className={styles.previewLink}
                      >
                        View
                      </Link>
                      {m.id !== member.id && !m.is_admin && (
                        <>
                          <button
                            type="button"
                            className={styles.actionButton}
                            onClick={() =>
                              setPendingAction({
                                kind: reviewerIds.includes(m.id) ? "demote" : "promote",
                                target: m,
                              })
                            }
                          >
                            {reviewerIds.includes(m.id) ? "Remove admin" : "Make admin"}
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
                    </div></details></td>
                  </tr>
                ))}
              </tbody></table></div>
            )}
            <div className={styles.pagination}><span>{total ? `${page*25+1}–${Math.min((page+1)*25,total)} of ${total} members` : '0 members'}</span><div><button className={styles.actionButton} disabled={page===0||searching} onClick={()=>setPage(p=>p-1)}>Previous</button><button className={styles.actionButton} disabled={(page+1)*25>=total||searching} onClick={()=>setPage(p=>p+1)}>Next</button></div></div>
            {actionError && <p role="alert" className={styles.statusError}>{actionError}</p>}
          </div>}
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
        >{actionError&&<p role="alert" className={styles.statusError}>{actionError}</p>}</ConfirmDialog>
      )}

      {approveFor && <ConfirmDialog title={`Approve ${approveFor.first_name} ${approveFor.last_name}?`} message="This publishes their profile in the directory." confirmLabel="Approve profile" onConfirm={()=>void runApprove(approveFor)} onCancel={()=>{if(!reviewing)setApproveFor(null);}} loading={!!reviewing}>{reviewError && <p role="alert" className={styles.statusError}>{reviewError}</p>}</ConfirmDialog>}
      {rejectFor && (
        <ConfirmDialog
          title={`Request changes from ${rejectFor.first_name}`}
          message="Explain what needs to change. This is shown to the member on their dashboard."
          confirmLabel="Request changes"
          onConfirm={runReject}
          onCancel={() => {
            setRejectFor(null);
            setRejectFeedback("");
          }}
          loading={reviewing === rejectFor.id}
        >
          {reviewError && <p role="alert" className={styles.statusError}>{reviewError}</p>}
          <textarea
            className={styles.searchInput}
            rows={4}
            name="review-feedback"
            aria-label="Feedback for the member"
            placeholder="What should they improve before resubmitting?"
            value={rejectFeedback}
            onChange={(e) => setRejectFeedback(e.target.value)}
          />
        </ConfirmDialog>
      )}
    </div>
  );
}
