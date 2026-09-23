"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/auth/AuthProvider";
import ConfirmDialog from "@/components/ConfirmDialog";
import Footer from "@/components/Footer";
import styles from "./page.module.css";

interface MemberRow {
  id: string;
  first_name: string;
  last_name: string;
  slug: string;
  school_email: string;
  auth_user_id: string | null;
  review_status: string;
  is_approved: boolean;
}
interface Detected {
  junk: MemberRow[];
  duplicates: { name: string; rows: MemberRow[] }[];
  orphanLogins: { userId: string; email: string | null; fullName: string | null }[];
}

export default function DataIssuesPage() {
  const { member, loading } = useAuth();
  const router = useRouter();
  const [data, setData] = useState<Detected | null>(null);
  const [confirmation, setConfirmation] = useState<{body:Record<string,unknown>;title:string;message:string}|null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && (!member || !member.is_admin)) router.replace("/");
  }, [loading, member, router]);

  const load = useMemo(
    () => async () => {
      const res = await fetch("/api/admin/data-issues");
      if (res.ok) setData((await res.json()) as Detected);
      else setError(`Failed to load (${res.status})`);
    },
    [],
  );

  useEffect(() => {
    if (member?.is_admin) load();
  }, [member, load]);

  const act = async (body: Record<string, unknown>) => {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/data-issues", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const b = (await res.json().catch(() => ({}))) as { error?: string };
        setError(b.error || `Failed (${res.status})`);
      } else {
        setConfirmation(null);
        await load();
      }
    } catch {
      setError("Request failed.");
    }
    setBusy(false);
  };

  if (loading || !member?.is_admin) {
    return (
      <div>
        <main className="w-full min-h-[60vh] flex items-center justify-center">
          <p>Loading…</p>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div>
      <main className="w-full">
        <section className={styles.section}>
          <header className={styles.header}><div><h1>Data issues</h1><p>Keep member records tidy and accounts connected.</p></div><button disabled={busy} onClick={()=>void load()}>Refresh</button></header>
          {error && <p className={styles.error}>{error}</p>}
          {!data ? (
            <p>Loading detectors…</p>
          ) : (
            <>
              <nav className={styles.overview} aria-label="Issue categories"><a href="#duplicates"><strong>{data.duplicates.length}</strong><span>Possible duplicates</span></a><a href="#domains"><strong>{data.junk.length}</strong><span>Email exceptions</span></a><a href="#signups"><strong>{data.orphanLogins.length}</strong><span>Unfinished sign-ups</span></a></nav>
              <section id="duplicates" className={styles.card}>
                <h2>Possible duplicates <span>{data.duplicates.length}</span></h2><p className={styles.note}>These profiles share a name. Compare their details before merging; they may be different people.</p>
                {data.duplicates.length === 0 && <p className={styles.empty}>Nothing to review here.</p>}
                {data.duplicates.map((d) => (
                  <div key={d.name} className={styles.group}>
                    <p className={styles.groupTitle}>{d.name}</p>
                    {d.rows.map((r) => (
                      <div key={r.id} className={styles.row}>
                        <span>
                          {r.school_email} · {r.review_status} ·{" "}
                          {r.auth_user_id ? "linked" : "unlinked"}
                        </span>
                        <span className={styles.actions}>
                          {d.rows
                            .filter((o) => o.id !== r.id)
                            .map((o) => (
                              <button
                                key={o.id}
                                disabled={busy}
                                onClick={() =>
                                  setConfirmation({body:{ action: "merge", keepId: r.id, dropId: o.id },title:"Merge these profiles?",message:`Keep ${r.school_email} and merge ${o.school_email} into it. Review both profiles before continuing.`})
                                }
                              >
                                Keep this profile · merge {o.school_email}
                              </button>
                            ))}
                        </span>
                      </div>
                    ))}
                  </div>
                ))}
              </section>

              <section id="domains" className={styles.card}>
                <h2>Email exceptions <span>{data.junk.length}</span></h2><p className={styles.note}>Profiles outside the supported school domains, including demo accounts. An exception does not necessarily need deleting.</p>
                {data.junk.length === 0 && <p className={styles.empty}>Nothing to review here.</p>}
                {data.junk.map((r) => (
                  <div key={r.id} className={styles.row}>
                    <span>
                      <strong>{r.first_name} {r.last_name}</strong><small>{r.school_email}</small>{r.school_email.endsWith("@test.designwaterloo.local")&&<em>Demo account</em>}
                    </span>
                    <button
                      disabled={busy}
                      onClick={() => setConfirmation({body:{ action: "delete", memberId: r.id },title:`Delete ${r.first_name} ${r.last_name}?`,message:"This permanently removes this member profile and its associated data."})}
                    >
                      Delete
                    </button>
                  </div>
                ))}
              </section>

              <section id="signups" className={styles.card}>
                <h2>Sign-ups without profiles <span>{data.orphanLogins.length}</span></h2><p className={styles.note}>These accounts have no linked member profile. They can continue onboarding when they next sign in.</p>
                {data.orphanLogins.length === 0 && <p className={styles.empty}>Nothing to review here.</p>}
                {data.orphanLogins.map((o) => (
                  <div key={o.userId} className={styles.row}>
                    <span>
                      <strong>{o.fullName || "Unnamed account"}</strong><small>{o.email}</small>
                    </span>
                  </div>
                ))}

              </section>
            </>
          )}
        </section>
      </main>
      <Footer />
      {confirmation&&<ConfirmDialog title={confirmation.title} message={confirmation.message} confirmLabel="Confirm" loading={busy} onConfirm={()=>void act(confirmation.body)} onCancel={()=>{if(!busy)setConfirmation(null);}}>{error&&<p role="alert" className={styles.error}>{error}</p>}</ConfirmDialog>}
    </div>
  );
}
