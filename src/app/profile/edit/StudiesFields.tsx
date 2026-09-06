"use client";
import { useRef, useState } from "react";
import { ChevronDownIcon } from "@heroicons/react/24/outline";
import { PROGRAMS } from "@/data/programs";
import { shortProgramName } from "@/data/program-short-names";
import styles from "./page.module.css";

export default function StudiesFields({ school, program, year, onProgram, onYear }: {
  school: string; program: string; year: string;
  onProgram: (value: string) => void; onYear: (value: string) => void;
}) {
  const [active, setActive] = useState<"program" | "year">(program ? "year" : "program");
  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState(0);
  const input = useRef<HTMLInputElement>(null);
  const yearInput = useRef<HTMLInputElement>(null);
  const options = (PROGRAMS[school] || []).filter(name => `${name} ${shortProgramName(name)}`.toLowerCase().includes(program.toLowerCase()));
  const choices = program.trim() && !options.some(name => name.toLowerCase() === program.trim().toLowerCase()) ? [...options, program.trim()] : options;
  const choose = (name: string) => { onProgram(name); setOpen(false); setActive("year"); yearInput.current?.focus(); };
  return <div className={styles.studyChips} data-active={active}>
    <div className={`${styles.inputChip} ${styles.programChip}`} onBlur={event => { if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setOpen(false); }}>
      <label htmlFor="onboarding-program">Program</label>
      <div className={styles.programEntry}>
        <input ref={input} id="onboarding-program" role="combobox" aria-autocomplete="list" aria-expanded={open} aria-controls="program-options" aria-activedescendant={open && choices[highlight] ? `program-option-${highlight}` : undefined} autoComplete="off" value={open || active === "program" ? program : shortProgramName(program)} title={program} placeholder="Your program" maxLength={150} onFocus={() => { setActive("program"); setOpen(true); setHighlight(0); }} onChange={event => { onProgram(event.target.value); setOpen(true); setHighlight(0); }} onKeyDown={event => {
          if (event.key === "Escape") { setOpen(false); event.preventDefault(); }
          if (event.key === "ArrowDown" || event.key === "ArrowUp") { event.preventDefault(); setOpen(true); const index = Math.max(0, Math.min(choices.length - 1, highlight + (event.key === "ArrowDown" ? 1 : -1))); setHighlight(index); document.getElementById(`program-option-${index}`)?.scrollIntoView({ block: "nearest" }); }
          if (event.key === "Enter" && open) { event.preventDefault(); if (choices[highlight]) choose(choices[highlight]); }
        }} />
        <button type="button" aria-label="Show programs" tabIndex={-1} onMouseDown={event => event.preventDefault()} onClick={() => { if (open) setOpen(false); else { input.current?.focus(); setOpen(true); } }}><ChevronDownIcon aria-hidden="true" /></button>
      </div>
      {open && <ul id="program-options" role="listbox" aria-label="Programs" className={styles.programOptions}>{choices.map((name, index) => <li id={`program-option-${index}`} key={name} role="option" aria-selected={index === highlight} onMouseDown={event => event.preventDefault()} onClick={() => choose(name)} onMouseEnter={() => setHighlight(index)}><span>{name}</span><small>{shortProgramName(name) !== name ? shortProgramName(name) : ""}</small></li>)}{!choices.length && <li role="presentation">Type your program</li>}</ul>}
    </div>
    <div className={`${styles.inputChip} ${styles.yearChip}`} onClick={() => yearInput.current?.focus()}>
      <label htmlFor="onboarding-year">Graduation year</label><input ref={yearInput} id="onboarding-year" inputMode="numeric" pattern="[0-9]{4}" maxLength={4} value={year} onFocus={() => { setActive("year"); setOpen(false); }} onChange={event => onYear(event.target.value)} placeholder="2030" />
    </div>
  </div>;
}
