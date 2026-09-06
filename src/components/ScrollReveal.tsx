import type { ReactNode } from "react";

// Content is immediately visible, including server-rendered and cached pages.
// Keep the layout wrapper used by directory rows and cards.
export default function ScrollReveal({ children, className = "" }: {
  children: ReactNode;
  className?: string;
  index?: number;
  direction?: "up" | "left";
}) {
  return <div className={className}>{children}</div>;
}
