"use client";

import type { ExperienceEntry } from "@/components/InlineEdit/InlineEditProvider";
import { experienceTermLinks } from "@/lib/experience-term-links";
import ScheduleFields from "@/app/welcome/ScheduleFields";
import { decodeTermCode, getNextTermCode, getCurrentTermCode } from "@/lib/termUtils";
import { newGradTerm, workSequences } from "@/lib/work-sequences";
import styles from "./schedule.module.css";

export default function ProfileSchedule({ terms, email, school, program, graduation, experiences }: {
  experiences: ExperienceEntry[]; terms: string[]; email: string | null; school: string | null; program: string | null; graduation: string | null;
}) {
  const selected = [...new Set(terms.filter(term => /^1\d{2}[159]$/.test(term)))].sort();
  if (!selected.length) return null;
  const nextWork = getNextTermCode(selected);
  const graduateTerm = newGradTerm(graduation ?? "");
  const nextGrad = graduateTerm && graduateTerm >= getCurrentTermCode() ? graduateTerm : null;
  const next = nextWork && (!nextGrad || nextWork < nextGrad) ? nextWork : nextGrad;
  const isNewGrad = !!next && next === nextGrad;
  const choices = workSequences(school ?? "", program ?? "", graduation ?? "");

  return <section className={styles.root} aria-labelledby="profile-schedule-heading">
    <div className={styles.heading}>
      <div className={styles.summary}>
        <h2 id="profile-schedule-heading">Work & study schedule</h2>
        <p>{next ? <>{isNewGrad ? "New grad" : "Next available"} <strong>{decodeTermCode(next)}</strong></> : "No upcoming work terms listed."}</p>
      </div>
      {email && next && <a className={styles.contact} href={`mailto:${email}`}>Get in touch <span aria-hidden="true">↗</span></a>}
    </div>
    <div className={styles.calendar}>
      <ScheduleFields termLinks={experienceTermLinks(selected, experiences)} choices={choices} year={graduation ?? ""} value={selected} onChange={() => {}} editing={false} animated={false} />
    </div>
    <div className={styles.footer}>
      <p><span className={styles.swatch} aria-hidden="true" /> Work term <span className={styles.separator} aria-hidden="true">·</span> 1A, 1B… Study terms</p>
    </div>
  </section>;
}
