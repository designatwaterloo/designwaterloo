"use client";

import { useTransition } from "@/context/TransitionContext";
import Curtain from "../Curtain";
import styles from "./PageTransition.module.css";

export default function PageTransition() {
  const { stage, endExit } = useTransition();

  const isOpen = stage === "entering";
  const shouldRender = stage !== "idle";

  if (!shouldRender) return null;

  return (
    <Curtain
      isOpen={isOpen}
      className={styles.transitionCurtain}
      showLogo={true}
      onAnimationComplete={endExit}
    />
  );
}
