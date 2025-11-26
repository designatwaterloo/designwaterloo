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

  const startTransition = (href: string) => {
    setNextHref(href);
    setStage("entering");
    setIsWaitingForPush(true);
  };

  useEffect(() => {
    if (stage === "entering") {
      document.body.style.cursor = "wait";
      const timer = setTimeout(() => {
        if (nextHref) {
          router.push(nextHref);
          setIsWaitingForPush(false);
        }
      }, 1200); 

      return () => clearTimeout(timer);
    }
  }, [stage, nextHref, router]);

  useEffect(() => {
    if (stage === "entering" && pathname === nextHref && !isWaitingForPush) {
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
      const timer = setTimeout(() => {
        setStage("idle");
        setNextHref(null);
        document.body.style.cursor = "";
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
