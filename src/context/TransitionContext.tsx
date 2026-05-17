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
  const [isWaitingForPush, setIsWaitingForPush] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 769);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  const startTransition = (href: string) => {
    setNextHref(href);
    setStage("entering");
    setIsWaitingForPush(true);
  };

  useEffect(() => {
    if (stage === "entering") {
      document.body.style.cursor = "wait";
      // Push delay = ~time for the column curtain to visually cover the page.
      // Look at Curtain.tsx — last column finishes sliding at ~745ms desktop,
      // but the page is meaningfully obscured by ~500ms. Going tighter than
      // that risks a flash of the new page through partial coverage.
      const delay = isMobile ? 700 : 500;
      const timer = setTimeout(() => {
        if (nextHref) {
          window.scrollTo(0, 0);
          router.push(nextHref);
          setIsWaitingForPush(false);
        }
      }, delay);

      // Safety: if we're still "entering" longer than the curtain+push budget
      // (e.g. middleware redirected elsewhere and pathname never matches),
      // force the curtain back to idle so the user isn't staring at it.
      const safetyTimer = setTimeout(() => {
        setStage("idle");
        setNextHref(null);
        setIsWaitingForPush(false);
        document.body.style.cursor = "";
      }, 2000);

      return () => {
        clearTimeout(timer);
        clearTimeout(safetyTimer);
      };
    }
  }, [stage, nextHref, router, isMobile]);

  useEffect(() => {
    const nextPathname = nextHref?.split(/[?#]/)[0] ?? null;
    if (stage === "entering" && pathname === nextPathname && !isWaitingForPush) {
      requestAnimationFrame(() => {
        setStage("exiting");
      });
    } else if (stage === "entering" && nextHref && pathname !== nextHref) {
    } else if (stage === "idle" && nextHref) {
        setNextHref(null);
    }
  }, [pathname, nextHref, stage, isWaitingForPush]);

  useEffect(() => {
    if (stage === "exiting") {
      // Remove cursor wait immediately when curtain starts lifting
      document.body.style.cursor = "";
      
      const timer = setTimeout(() => {
        setStage("idle");
        setNextHref(null);
      }, 550); 
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
