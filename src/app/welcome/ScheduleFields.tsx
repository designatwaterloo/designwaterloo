import { Fragment, useEffect, useRef, type CSSProperties } from "react";
import { termCode, type WorkSequence } from "@/lib/work-sequences";
import { getCurrentTermCode } from "@/lib/termUtils";
import styles from "./page.module.css";

export default function ScheduleFields({ choices, year, value, onChange, editing, animated = true }: {
  animated?: boolean; editing: boolean; choices: WorkSequence[]; year: string; value: string[]; onChange: (terms: string[]) => void;
}) {
  const gridRef = useRef<HTMLDivElement>(null);
  const markerRef = useRef<HTMLSpanElement>(null);
  const activeSequence = choices.find(choice => choice.terms.join() === value.join());
  const lastSequence = useRef<WorkSequence | undefined>(undefined);
  const baseline = activeSequence || lastSequence.current || choices.find(choice => choice.recommended) || choices[0];
  const changeTerms = (terms: string[]) => { lastSequence.current = baseline; onChange(terms); };
  const current = new Date().getFullYear();
  const currentTerm = getCurrentTermCode();
  const graduation = /^\d{4}$/.test(year) ? Number(year) : current + 3;
  const start = /^\d{4}$/.test(year) ? graduation - 5 : current;
  const years = Array.from(new Set([...Array.from({ length: Math.min(8, graduation - start + 1) }, (_, i) => start + i), ...value.map(term => 2000 + Number(term.slice(1, 3)))])).sort();
  const now = useRef(new Date()).current;
  const termMonth = Math.floor(now.getMonth() / 4) * 4;
  const termStart = new Date(now.getFullYear(), termMonth, 1).getTime();
  const termEnd = new Date(now.getFullYear(), termMonth + 4, 1).getTime();
  const progress = (now.getTime() - termStart) / (termEnd - termStart);
  useEffect(() => {
    const grid = gridRef.current;
    const marker = markerRef.current;
    if (!grid || !marker) return;
    const buttons = Array.from(grid.querySelectorAll<HTMLButtonElement>("button[data-term]"));
    const target = buttons.find(button => button.dataset.term === currentTerm);
    if (!target) { marker.style.display = "none"; return; }
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let animation: Animation | undefined;
    const position = () => {
      marker.style.left = `${target.offsetLeft + target.offsetWidth * Math.max(.02, Math.min(.98, progress))}px`;
      marker.style.top = `${target.offsetTop - 7}px`;
      marker.style.height = `${target.offsetHeight + 14}px`;
    };
    position();
    if (animated && !reduced) animation = marker.animate([{ opacity: 0 }, { opacity: 1 }], {
      duration: 280,
      delay: 700 + (buttons.length - 1) * 35 + 250,
      easing: "ease-in-out",
      fill: "forwards",
    });
    else marker.style.opacity = "1";
    // Keep the final marker aligned when the viewport changes, without replaying.
    let initialResize = true;
    const observer = new ResizeObserver(() => {
      if (initialResize) { initialResize = false; return; }
      animation?.cancel();
      position();
      marker.style.opacity = "1";
    });
    observer.observe(grid);
    return () => { animation?.cancel(); observer.disconnect(); };
  }, [currentTerm, start, year, progress, animated]);
  let academicIndex = 0;
  return <>
    <div ref={gridRef} className={styles.scheduleGrid} data-animated={animated}>
      <span aria-hidden="true" />{["Winter", "Spring", "Fall"].map((season, index) => <span style={{ "--axis-delay": `${350 + index * 70}ms` } as CSSProperties} className={styles.scheduleSeason} key={season}>{season}</span>)}
      {years.map((y, index) => <Fragment key={y}><span style={{ "--axis-delay": `${350 + index * 60}ms` } as CSSProperties} className={styles.scheduleYear}>{y}</span>{[1, 5, 9].map((season, i) => {
        const code = termCode(y, season); const selected = value.includes(code);
        const beforeStart = /^\d{4}$/.test(year) && code < termCode(start, 9);
        const afterGraduation = /^\d{4}$/.test(year) && code > termCode(graduation, 1);
        if (beforeStart || afterGraduation) return <span key={code} aria-hidden="true" />;
        const knownOff = baseline?.studyTerms[code] === "Off";
        const inferredLabel = selected ? "Work" : knownOff ? "Off" : `${Math.floor(academicIndex / 2) + 1}${academicIndex % 2 ? "B" : "A"}`;
        if (!selected && !knownOff) academicIndex++;
        const label = activeSequence ? (selected ? "Work" : activeSequence.studyTerms[code] || inferredLabel) : inferredLabel;
        const index = (y - start) * 3 + i - (/^\d{4}$/.test(year) ? 2 : 0);
        return <button disabled={!editing} data-term={code} style={{ "--term-delay": `${700 + index * 35}ms` } as CSSProperties} key={code} type="button" aria-label={`${["Winter", "Spring", "Fall"][i]} ${y}`} aria-pressed={selected} aria-current={code === currentTerm ? "date" : undefined} onClick={() => changeTerms(selected ? value.filter(term => term !== code) : [...value, code].sort())}><span className={styles.termLabel}>{label}</span></button>;
      })}</Fragment>)}
      <span ref={markerRef} className={styles.termMarker} aria-hidden="true"><span>Now</span></span>
    </div>
    {editing && <div className={styles.scheduleTools}><button type="button" onClick={() => changeTerms([])}>Clear</button>{choices.length === 1 && !activeSequence && <button type="button" onClick={() => changeTerms(choices[0].terms)}>Restore defaults</button>}</div>}
  </>;
}
