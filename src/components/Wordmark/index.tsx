"use client";
import { useEffect, useRef } from "react";
import { wordmarks } from "./paths";

let orbitFrames: Promise<string[]> | undefined;
function loadOrbitFrames() {
  return (orbitFrames ??= import("./orbit-frames.json").then(
    (module) => module.default,
  ));
}
const TURN = Math.PI * 2;
const HOVER_DURATION = 1200;
type Motion =
  | { kind: "hover"; start: number }
  | { kind: "spin" }
  | {
      kind: "settle";
      start: number;
      from: number;
      to: number;
      duration: number;
    };

// The bake contains eased frames. Undo that timing to address it by angle,
// so momentum and reverse playback have a consistent angular speed.
function frameAtAngle(angle: number, count: number) {
  const phase = (((angle % TURN) + TURN) % TURN) / TURN;
  const time = 0.5 - Math.sin(Math.asin(1 - 2 * phase) / 3);
  return Math.round(time * (count - 1));
}

export default function Wordmark({
  variant = "horizontal",
  className,
}: {
  variant?: "horizontal" | "stacked";
  className?: string;
}) {
  const data = wordmarks[variant];
  const exact = useRef<SVGGElement>(null);
  const animated = useRef<SVGPathElement>(null);
  const frame = useRef(0);
  const running = useRef(false);
  const reduced = useRef(false);
  const angle = useRef(0);
  const velocity = useRef(0);
  const motion = useRef<Motion>({ kind: "hover", start: 0 });
  const previous = useRef(0);

  function rest() {
    running.current = false;
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
    };
  }, []);

  async function play() {
    if (running.current || reduced.current || !animated.current) return;
    running.current = true;
    let paths: string[];
    try {
      paths = await loadOrbitFrames();
    } catch {
      orbitFrames = undefined;
      rest();
      return;
    }
    if (!animated.current || reduced.current) {
      rest();
      return;
    }
    previous.current = performance.now();
    if (motion.current.kind === "hover")
      motion.current.start = previous.current;

    function tick(now: number) {
      const dt = Math.min((now - previous.current) / 1000, 0.05);
      previous.current = now;
      const current = motion.current;
      if (current.kind === "hover") {
        const t = Math.min(1, (now - current.start) / HOVER_DURATION);
        angle.current = TURN * t * t * (3 - 2 * t);
        velocity.current = (TURN * 6 * t * (1 - t)) / (HOVER_DURATION / 1000);
        if (t === 1) {
          rest();
          return;
        }
      } else if (current.kind === "spin") {
        // Exponential drag, integrated analytically so momentum is frame-rate independent.
        const drag = Math.exp(-1.6 * dt);
        angle.current += (velocity.current * (1 - drag)) / 1.6;
        velocity.current *= drag;
        if (Math.abs(velocity.current) < 3) {
          const to =
            velocity.current > 0
              ? (Math.floor(angle.current / TURN) + 1) * TURN
              : (Math.ceil(angle.current / TURN) - 1) * TURN;
          motion.current = {
            kind: "settle",
            start: now,
            from: angle.current,
            to,
            duration: Math.max(
              120,
              (3000 * Math.abs(to - angle.current)) /
                Math.abs(velocity.current),
            ),
          };
        }
      } else {
        const t = Math.min(1, (now - current.start) / current.duration);
        angle.current =
          current.from + (current.to - current.from) * (1 - (1 - t) ** 3);
        velocity.current =
          ((current.to - current.from) * 3 * (1 - t) ** 2) /
          (current.duration / 1000);
        if (t === 1) {
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
  }

  function hover() {
    if (running.current || reduced.current) return;
    motion.current = { kind: "hover", start: 0 };
    void play();
  }

  function spin(direction: number) {
    if (reduced.current) return;
    const sameDirection = Math.sign(velocity.current) === direction;
    velocity.current =
      direction *
      Math.min(
        36,
        (sameDirection
          ? Math.abs(velocity.current)
          : Math.abs(velocity.current) * 0.5) + 10,
      );
    motion.current = { kind: "spin" };
    void play();
  }

  return (
    <svg
      viewBox={data.viewBox}
      width={data.width}
      height={data.height}
      className={className}
      role="img"
      aria-label="Design Waterloo"
      style={{ overflow: "visible" }}
      onPointerEnter={(event) => {
        if (event.pointerType === "mouse") hover();
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
        style={{ cursor: "pointer" }}
        onClick={(event) => {
          event.preventDefault();
          event.stopPropagation();
          const bounds = event.currentTarget.getBoundingClientRect();
          spin(event.clientX < bounds.left + bounds.width / 2 ? 1 : -1);
        }}
      />
    </svg>
  );
}
