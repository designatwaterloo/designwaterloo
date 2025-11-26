"use client";

import { createContext, useContext, useState, ReactNode, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";

type TransitionStage = "idle" | "entering" | "exiting";

interface TransitionContextType {
  startTransition: (href: string) => void;
  stage: TransitionStage;
  isTransitioning: boolean;
}

const TransitionContext = createContext<TransitionContextType | undefined>(undefined);

export function TransitionProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [stage, setStage] = useState<TransitionStage>("idle");
  const [nextHref, setNextHref] = useState<string | null>(null);

  const startTransition = (href: string) => {
    if (href === pathname) return;
    setNextHref(href);
    setStage("entering");
  };

  // Handle stage changes
  useEffect(() => {
    if (stage === "entering") {
      // Curtain is coming down. Wait for it to cover the screen.
      // The curtain animation takes about 0.8s to fully cover (last column starts at 0.575s + duration).
      // Let's give it enough time. 
      // OverlayNav says: last column finishes at 0.3s delay + 0.2s duration = 0.5s (wait, that was close animation).
      // Open animation: last column starts at 0.575s, duration 0.35s. Total ~0.925s.
      // Let's wait 1s to be safe and ensure full coverage.
      
      const timer = setTimeout(() => {
        if (nextHref) {
          router.push(nextHref);
        }
      }, 1000); 

      return () => clearTimeout(timer);
    }
  }, [stage, nextHref, router]);

  // Detect route change to start exiting
  useEffect(() => {
    if (stage === "entering" && pathname === nextHref) {
      // Route has changed. Now lift the curtain.
      // Small delay to ensure content is ready/rendered?
      // Next.js is usually fast but maybe a small tick.
      requestAnimationFrame(() => {
        setStage("exiting");
      });
    } else if (stage === "entering" && nextHref && pathname !== nextHref) {
        // Still waiting for route change...
    } else if (stage === "idle" && nextHref) {
        // Reset nextHref if we are idle
        setNextHref(null);
    }
  }, [pathname, nextHref, stage]);

  // Cleanup exiting stage
  useEffect(() => {
    if (stage === "exiting") {
      // Curtain is going up. Wait for animation to finish.
      // Close animation is faster. Last column delay 0.3s + duration 0.2s = 0.5s.
      const timer = setTimeout(() => {
        setStage("idle");
        setNextHref(null);
      }, 800); 
      return () => clearTimeout(timer);
    }
  }, [stage]);

  return (
    <TransitionContext.Provider value={{ startTransition, stage, isTransitioning: stage !== "idle" }}>
      {children}
    </TransitionContext.Provider>
  );
}

export function useTransition() {
  const context = useContext(TransitionContext);
  if (context === undefined) {
    throw new Error("useTransition must be used within a TransitionProvider");
  }
  return context;
}
