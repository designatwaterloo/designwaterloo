"use client";

import { useRef, useEffect, useState, ReactNode } from "react";

// Batch items that intersect within the same frame, then reveal in index order
let pendingReveals: Array<{ index: number; reveal: () => void }> = [];
let batchTimeout: ReturnType<typeof setTimeout> | null = null;

function scheduleReveal(index: number, reveal: () => void, staggerMs: number) {
  pendingReveals.push({ index, reveal });

  if (batchTimeout !== null) clearTimeout(batchTimeout);
  batchTimeout = setTimeout(() => {
    const batch = [...pendingReveals].sort((a, b) => a.index - b.index);
    pendingReveals = [];
    batchTimeout = null;

    batch.forEach((item, i) => {
      setTimeout(() => item.reveal(), i * staggerMs);
    });
  }, 16);
}

interface ScrollRevealProps {
  children: ReactNode;
  index?: number;
  staggerMs?: number;
  className?: string;
}

export default function ScrollReveal({
  children,
  index = 0,
  staggerMs = 75,
  className = "",
}: ScrollRevealProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  const indexRef = useRef(index);
  const staggerRef = useRef(staggerMs);
  indexRef.current = index;
  staggerRef.current = staggerMs;

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          scheduleReveal(indexRef.current, () => setVisible(true), staggerRef.current);
          observer.unobserve(el);
        }
      },
      { threshold: 0.1 }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className={className}
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? "translateY(0)" : "translateY(16px)",
        transition: "opacity 400ms ease-out, transform 400ms ease-out",
      }}
    >
      {children}
    </div>
  );
}
