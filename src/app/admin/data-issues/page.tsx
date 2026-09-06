"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/auth/AuthProvider";
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
          <h1>Data Issues</h1>
          {error && <p className={styles.error}>{error}</p>}
          {!data ? (
            <p>Loading detectors…</p>
          ) : (
            <>
              <div className={styles.card}>
                <h2>Duplicate name pairs ({data.duplicates.length})</h2>
                {data.duplicates.length === 0 && <p>None.</p>}
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
                                  act({ action: "merge", keepId: r.id, dropId: o.id })
                                }
                              >
                                Keep this, drop {o.school_email}
                              </button>
                            ))}
                        </span>
                      </div>
                    ))}
                  </div>
                ))}
              </div>

              <div className={styles.card}>
                <h2>Junk-domain rows ({data.junk.length})</h2>
                {data.junk.length === 0 && <p>None.</p>}
                {data.junk.map((r) => (
                  <div key={r.id} className={styles.row}>
                    <span>
                      {r.first_name} {r.last_name} · {r.school_email}
                    </span>
                    <button
                      disabled={busy}
                      onClick={() => act({ action: "delete", memberId: r.id })}
                    >
                      Delete
                    </button>
                  </div>
                ))}
              </div>

              <div className={styles.card}>
                <h2>Orphan logins ({data.orphanLogins.length})</h2>
                {data.orphanLogins.length === 0 && <p>None.</p>}
                {data.orphanLogins.map((o) => (
                  <div key={o.userId} className={styles.row}>
                    <span>
                      {o.email} {o.fullName ? `· ${o.fullName}` : ""}
                    </span>
                  </div>
                ))}
                <p className={styles.note}>
                  To link an orphan login to an unlinked member, merge the
                  duplicate pair above (if one exists) or fix via SQL.
                </p>
              </div>
            </>
          )}
        </section>
      </main>
      <Footer />
    </div>
  );
}
