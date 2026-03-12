"use client";

import { useRef, useEffect, useState, ReactNode } from "react";

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

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          observer.unobserve(el);
        }
      },
      { threshold: 0.1 }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // Stagger within rows (max 6 columns), so delay resets per row
  const delay = (index % 6) * staggerMs;

  return (
    <div
      ref={ref}
      className={className}
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? "translateY(0)" : "translateY(16px)",
        transition: `opacity 400ms ease-out ${delay}ms, transform 400ms ease-out ${delay}ms`,
      }}
    >
      {children}
    </div>
  );
}
