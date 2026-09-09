"use client";

import { createContext, useContext, useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import BloomingLogo from "../BloomingLogo";
import styles from "./OnboardingFinale.module.css";

type Skill = { name: string; left: number; top: number; width: number; height: number; fontSize: string };
const FinaleContext = createContext<(elements: HTMLElement[]) => void>(() => {});
export const useOnboardingFinale = () => useContext(FinaleContext);

/** Lives in the root layout so navigation can finish behind the closing curtain. */
export default function OnboardingFinale({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [skills, setSkills] = useState<Skill[] | null>(null);
  const [phase, setPhase] = useState("gather");
  const [logoFinished, setLogoFinished] = useState(false);
  const overlay = useRef<HTMLDivElement>(null);
  const running = useRef(false);
  const start = (elements: HTMLElement[]) => {
    if (running.current) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) { router.push("/dashboard"); return; }
    running.current = true;
    setPhase("gather");
    setLogoFinished(false);
    setSkills(elements.map(el => {
      const rect = el.getBoundingClientRect();
      return { name: el.textContent || "", left: rect.left, top: rect.top, width: rect.width, height: rect.height, fontSize: getComputedStyle(el).fontSize };
    }));
    router.prefetch("/dashboard");
  };

  useEffect(() => {
    if (!skills || !overlay.current) return;
    const animations: Animation[] = [];
    let cancelled = false;
    const wait = async (el: HTMLElement, frames: Keyframe[], options: KeyframeAnimationOptions) => {
      const animation = el.animate(frames, { fill: "forwards", ...options });
      animations.push(animation);
      await animation.finished;
    };
    const run = async () => {
      const layer = overlay.current!;
      layer.focus({ preventScroll: true });
      const chips = [...layer.querySelectorAll<HTMLElement>("[data-finale-skill]")];
      const gap = 12;
      const total = skills.reduce((sum, skill) => sum + skill.width, 0) + gap * (skills.length - 1);
      // Keep all 1–3 chips in one centered row, including on narrow screens.
      const scale = Math.min(1, (window.innerWidth - 40) / total);
      let x = (window.innerWidth - total * scale) / 2;
      const targets = skills.map(skill => {
        const target = { x, y: (window.innerHeight - skill.height * scale) / 2 };
        x += (skill.width + gap) * scale;
        return target;
      });
      await Promise.all(chips.map((chip, i) => wait(chip, [
        { transform: "translate(0, 0) scale(1)" },
        { transform: `translate(${targets[i].x - skills[i].left}px, ${targets[i].y - skills[i].top}px) scale(${scale})` },
      ], { duration: 700, delay: 350, easing: "cubic-bezier(.22,1,.36,1)" })));
      if (cancelled) return;
      setPhase("shake");
      await Promise.all(chips.map(chip => wait(chip.firstElementChild as HTMLElement, [
        { transform: "translateX(0) rotate(0)" },
        { transform: "translateX(-3px) rotate(-2deg)" },
        { transform: "translateX(3px) rotate(2deg)" },
        { transform: "translateX(0) rotate(0)" },
      ], { duration: 125, iterations: 8, easing: "ease-in-out" })));
      if (cancelled) return;
      setPhase("converge");
      await Promise.all(chips.map((chip, i) => wait(chip, [
        { transform: `translate(${targets[i].x - skills[i].left}px, ${targets[i].y - skills[i].top}px) scale(${scale})`, opacity: 1 },
        { transform: `translate(${window.innerWidth / 2 - skills[i].left}px, ${window.innerHeight / 2 - skills[i].top}px) scale(0)`, opacity: 0 },
      ], { duration: 550, easing: "cubic-bezier(.65,0,.8,.35)" })));
      if (cancelled) return;
      setPhase("logo");
      router.push("/dashboard");
    };
    void run().catch(() => { /* Cleanup cancels outstanding animations. */ });
    return () => { cancelled = true; animations.forEach(animation => animation.cancel()); };
  }, [skills, router]);

  useEffect(() => {
    if (phase !== "logo") return;
    // Same 470ms bloom as the initial page entrance, then hold for one second.
    const timer = window.setTimeout(() => setLogoFinished(true), 1470);
    return () => window.clearTimeout(timer);
  }, [phase]);

  useEffect(() => {
    if (logoFinished && pathname === "/dashboard") setPhase("drop");
  }, [logoFinished, pathname]);

  const finish = () => {
    setSkills(null);
    running.current = false;
    requestAnimationFrame(() => {
      const main = document.querySelector<HTMLElement>("main");
      if (main) { main.setAttribute("tabindex", "-1"); main.focus({ preventScroll: true }); }
    });
  };

  return <FinaleContext.Provider value={start}>
    <div className={styles.content} inert={skills ? true : undefined}>{children}</div>
    {skills && <div ref={overlay} className={styles.finale} data-onboarding-finale data-phase={phase} tabIndex={-1} role="status" aria-label="Your draft is saved. Welcome to Design Waterloo.">
      <div className={styles.curtain} onAnimationEnd={event => { if (phase === "drop" && event.target === event.currentTarget) finish(); }}>
        <div className={styles.background} />
        {skills.map(skill => <div key={skill.name} data-finale-skill className={styles.skill} style={{ left: skill.left, top: skill.top, width: skill.width, height: skill.height, fontSize: skill.fontSize }} aria-hidden="true"><span>{skill.name}</span></div>)}
        {(phase === "logo" || phase === "drop") && <div className={styles.logo}><BloomingLogo show size={120} /></div>}
      </div>
    </div>}
  </FinaleContext.Provider>;
}
