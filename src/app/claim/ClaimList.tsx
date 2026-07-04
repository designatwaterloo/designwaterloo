"use client";

import { useState } from "react";
import type { ClaimCandidate } from "@/lib/supabase/member-init";
import styles from "./page.module.css";

export default function ClaimList({
  candidates,
}: {
  candidates: ClaimCandidate[];
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const post = async (body: Record<string, unknown>) => {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/claim", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        redirectTo?: string;
        error?: string;
      };
      if (!res.ok || !data.ok) {
        setError(data.error || "Something went wrong.");
        setBusy(false);
        return;
      }
      window.location.assign(data.redirectTo || "/profile/edit");
    } catch {
      setError("Request failed. Please try again.");
      setBusy(false);
    }
  };

  return (
    <section className={styles.section}>
      <h1 className={styles.title}>Is this you?</h1>
      <p className={styles.subtitle}>
        We found existing profiles that match your name. Claim yours to keep your
        existing info, or start a new profile.
      </p>

      <div className={styles.list}>
        {candidates.map((c) => (
          <button
            key={c.id}
            className={styles.candidate}
            disabled={busy}
            onClick={() => post({ action: "claim", memberId: c.id })}
          >
            <span className={styles.candidateName}>
              {c.first_name} {c.last_name}
            </span>
            <span className={styles.candidateMeta}>
              {c.school}
              {c.program ? ` · ${c.program}` : ""}
            </span>
            <span className={styles.candidateCta}>This is me →</span>
          </button>
        ))}
      </div>

      {error && <p className={styles.error}>{error}</p>}

      <button
        className={styles.fresh}
        disabled={busy}
        onClick={() => post({ action: "fresh" })}
      >
        None of these — start a new profile
      </button>
    </section>
  );
}
