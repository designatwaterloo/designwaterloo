"use client";

import { createContext, useContext, useState, ReactNode, useEffect, useRef } from "react";
import { useRouter, usePathname } from "next/navigation";

type TransitionStage = "idle" | "entering" | "exiting";

interface TransitionContextType {
  startTransition: (href: string) => void;
  stage: TransitionStage;
  isTransitioning: boolean;
}

const TransitionContext = createContext<TransitionContextType | undefined>(undefined);

// Curtain coverage timing — see Curtain.tsx column animations. The last
// column finishes sliding into place at ~925ms desktop, ~1080ms mobile.
// We push the router earlier (curtain mostly covers by ~500ms) but block
// the exit until the curtain has fully settled, so we never reverse the
// close animation mid-way.
const PUSH_DELAY_DESKTOP_MS = 500;
const PUSH_DELAY_MOBILE_MS = 700;
const CURTAIN_SETTLE_DESKTOP_MS = 950;
const CURTAIN_SETTLE_MOBILE_MS = 1100;
const SAFETY_TIMEOUT_MS = 3500;

export function TransitionProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [stage, setStage] = useState<TransitionStage>("idle");
  const [nextHref, setNextHref] = useState<string | null>(null);
  const [isWaitingForPush, setIsWaitingForPush] = useState(false);
  const [curtainSettled, setCurtainSettled] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const startPathRef = useRef<string | null>(null);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 769);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  const startTransition = (href: string) => {
    startPathRef.current = pathname;
    setNextHref(href);
    setCurtainSettled(false);
    setStage("entering");
    setIsWaitingForPush(true);
  };

  useEffect(() => {
    if (stage !== "entering") return;
    document.body.style.cursor = "wait";

    const pushDelay = isMobile ? PUSH_DELAY_MOBILE_MS : PUSH_DELAY_DESKTOP_MS;
    const settleDelay = isMobile ? CURTAIN_SETTLE_MOBILE_MS : CURTAIN_SETTLE_DESKTOP_MS;

    // Fire navigation while curtain is mostly covering — the new page gets
    // a head start on loading. The exit is gated on curtainSettled below,
    // so we never lift before the close animation finishes.
    const pushTimer = setTimeout(() => {
      if (nextHref) {
        window.scrollTo(0, 0);
        router.push(nextHref);
        setIsWaitingForPush(false);
      }
    }, pushDelay);

    // Mark curtain as fully settled once its column animation has had time
    // to finish covering. Without this gate, fast page renders would
    // trigger the exit transition mid-close, visually reversing direction.
    const settleTimer = setTimeout(() => {
      setCurtainSettled(true);
    }, settleDelay);

    // Last-resort safety: if pathname never updates (middleware lost us,
    // navigation cancelled, slow server), force a graceful exit. Animates
    // up rather than vanishing.
    const safetyTimer = setTimeout(() => {
      setStage("exiting");
    }, SAFETY_TIMEOUT_MS);

    return () => {
      clearTimeout(pushTimer);
      clearTimeout(settleTimer);
      clearTimeout(safetyTimer);
    };
  }, [stage, nextHref, router, isMobile]);

  // Exit when navigation has landed (pathname changed from start) AND the
  // curtain has had time to fully close. Either condition alone isn't
  // enough — pathname-only causes mid-close reversal, settled-only would
  // exit before the new page is ready.
  useEffect(() => {
    if (stage !== "entering") return;
    if (isWaitingForPush) return;
    if (!curtainSettled) return;
    if (pathname === startPathRef.current) return; // navigation not landed yet
    requestAnimationFrame(() => setStage("exiting"));
  }, [pathname, stage, isWaitingForPush, curtainSettled]);

  useEffect(() => {
    if (stage === "exiting") {
      document.body.style.cursor = "";
      const timer = setTimeout(() => {
        setStage("idle");
        setNextHref(null);
        startPathRef.current = null;
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
