"use client";
import { useCallback, useEffect, useRef } from "react";
import { magneticSettle, sampleSettle, ORBIT_STEP, coastSpin, clickImpulse } from "./settle";
import { wordmarks } from "./paths";
import styles from "./Wordmark.module.css";

let orbitFrames: Promise<string[]> | undefined;
let touchEntrancePlayed = false;
const MOUSE_INPUT = "(hover: hover) and (pointer: fine)";
function loadOrbitFrames() {
  return (orbitFrames ??= import("./orbit-frames.json").then(
    (module) => module.default,
  ));
}
import { frameAtAngle } from "./frames";
const HOVER_DURATION = 1200;
type Motion =
  | { kind: "hover"; start: number; direction: number }
  | { kind: "spin" }
  | ReturnType<typeof magneticSettle>;

export default function Wordmark({
  variant = "horizontal",
  className,
  interactive = true,
  autoplayOnTouch = false,
}: {
  variant?: "horizontal" | "stacked";
  className?: string;
  interactive?: boolean;
  autoplayOnTouch?: boolean;
}) {
  const data = wordmarks[variant];
  const exact = useRef<SVGGElement>(null);
  const animated = useRef<SVGPathElement>(null);
  const frame = useRef(0);
  const running = useRef(false);
  const generation = useRef(0);
  const reduced = useRef(false);
  const angle = useRef(0);
  const velocity = useRef(0);
  const nextHoverDirection = useRef(1);
  const motion = useRef<Motion>({ kind: "hover", start: 0, direction: 1 });
  const previous = useRef(0);

  function rest() {
    running.current = false;
    generation.current++;
    angle.current = 0;
    velocity.current = 0;
    exact.current?.setAttribute("opacity", "1");
    animated.current?.setAttribute("opacity", "0");
  }

  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => {
      reduced.current = query.matches;
      if (query.matches) {
        cancelAnimationFrame(frame.current);
        rest();
      }
    };
    update();
    query.addEventListener("change", update);
    return () => {
      cancelAnimationFrame(frame.current);
      query.removeEventListener("change", update);
      rest();
    };
  }, []);

  const play = useCallback(async () => {
    if (running.current || reduced.current || !animated.current) return;
    running.current = true;
    const run = ++generation.current;
    let paths: string[];
    try {
      paths = await loadOrbitFrames();
    } catch {
      orbitFrames = undefined;
      rest();
      return;
    }
    if (run !== generation.current) return;
    if (!animated.current || reduced.current) {
      rest();
      return;
    }
    previous.current = performance.now();
    if (motion.current.kind === "hover")
      motion.current.start = previous.current;

    function tick(now: number) {
      if (run !== generation.current) return;
      const dt = Math.min((now - previous.current) / 1000, 0.05);
      previous.current = now;
      const current = motion.current;
      if (current.kind === "hover") {
        const t = Math.min(1, (now - current.start) / HOVER_DURATION);
        angle.current = current.direction * ORBIT_STEP * t * t * (3 - 2 * t);
        velocity.current = (current.direction * ORBIT_STEP * 6 * t * (1 - t)) / (HOVER_DURATION / 1000);
        if (t === 1) {
          rest();
          return;
        }
      } else if (current.kind === "spin") {
        // Exponential drag, integrated analytically so momentum is frame-rate independent.
        const coast = coastSpin(angle.current, velocity.current, dt);
        angle.current = coast.angle;
        velocity.current = coast.velocity;
        if (coast.settling) {
          motion.current = magneticSettle(angle.current, velocity.current, now);
        }
      } else {
        const sample = sampleSettle(current, now);
        angle.current = sample.angle;
        velocity.current = sample.velocity;
        if (sample.done) {
          rest();
          return;
        }
      }
      animated.current?.setAttribute(
        "d",
        paths[frameAtAngle(angle.current, paths.length)],
      );
      exact.current?.setAttribute("opacity", "0");
      animated.current?.setAttribute("opacity", "1");
      frame.current = requestAnimationFrame(tick);
    }
    frame.current = requestAnimationFrame(tick);
  }, []);

  useEffect(() => {
    if (!interactive || !autoplayOnTouch || touchEntrancePlayed || reduced.current ||
        window.matchMedia(MOUSE_INPUT).matches) return;

    let active = true;
    // Let the page entrance uncover the wordmark before playing its one orbit.
    const entrance = document.querySelector('[data-initial-entrance]');
    const animations = entrance?.getAnimations() ?? [];
    void Promise.allSettled(animations.map(animation => animation.finished)).then(() => {
      if (!active || touchEntrancePlayed || reduced.current) return;
      touchEntrancePlayed = true;
      motion.current = { kind: "hover", start: 0, direction: 1 };
      void play();
    });
    return () => { active = false; };
  }, [interactive, autoplayOnTouch, play]);

  function hover() {
    if (running.current || reduced.current) return;
    motion.current = { kind: "hover", start: 0, direction: nextHoverDirection.current };
    nextHoverDirection.current *= -1;
    void play();
  }

  function leave() {
    if (!running.current || reduced.current || motion.current.kind !== "hover") return;
    // Click momentum continues even when the pointer leaves the wordmark.
    // Leaving before the lazy frame import finishes must not start a late orbit.
    if (angle.current === 0 && velocity.current === 0) {
      rest();
      return;
    }
    motion.current = magneticSettle(
      angle.current,
      velocity.current,
      performance.now(),
    );
  }

  function spin(direction: number) {
    if (reduced.current) return;
    velocity.current = clickImpulse(
      motion.current.kind === "hover" ? 0 : velocity.current,
      direction,
    );
    motion.current = { kind: "spin" };
    void play();
  }

  if (!interactive) return (
    <svg viewBox={data.viewBox} width={data.width} height={data.height} className={className} role="img" aria-label="Design Waterloo">
      <g dangerouslySetInnerHTML={{ __html: data.base }} />
      <g dangerouslySetInnerHTML={{ __html: data.oo }} />
    </svg>
  );

  return (
    <svg
      viewBox={data.viewBox}
      width={data.width}
      height={data.height}
      className={className}
      role="img"
      aria-label="Design Waterloo"
      style={{ overflow: "visible" }}
      onPointerLeave={(event) => {
        if (event.pointerType === "mouse" && window.matchMedia(MOUSE_INPUT).matches) leave();
      }}
      onPointerEnter={(event) => {
        if (event.pointerType === "mouse" && window.matchMedia(MOUSE_INPUT).matches) hover();
      }}
    >
      <g dangerouslySetInnerHTML={{ __html: data.base }} />
      <g ref={exact} dangerouslySetInnerHTML={{ __html: data.oo }} />
      <path
        ref={animated}
        transform={`translate(${data.cx - 48} ${data.cy - 30})`}
        fill="currentColor"
        fillRule="evenodd"
        opacity="0"
        pointerEvents="none"
      />
      <rect
        x={data.cx - 36}
        y={data.cy - 20}
        width="72"
        height="40"
        fill="transparent"
        className={styles.spinTarget}
        onClick={(event) => {
          if (!window.matchMedia(MOUSE_INPUT).matches ||
              ("pointerType" in event.nativeEvent && event.nativeEvent.pointerType !== "mouse")) return;
          event.preventDefault();
          event.stopPropagation();
          const bounds = event.currentTarget.getBoundingClientRect();
          spin(event.clientX < bounds.left + bounds.width / 2 ? 1 : -1);
        }}
      />
    </svg>
  );
}
