"use client";

import { useTransition } from "@/context/TransitionContext";
import Curtain from "../Curtain";
import styles from "./PageTransition.module.css";

export default function PageTransition() {
  const { stage } = useTransition();

  // Show curtain if entering or exiting
  // If entering, isOpen=true (curtain down)
  // If exiting, isOpen=false (curtain up)
  // If idle, don't render or render hidden? 
  // Curtain component handles unmounting if !isOpen && !isAnimating internally via its own state, 
  // but here we control isOpen based on stage.
  
  // stage 'entering': we want curtain to OPEN (cover screen). So isOpen=true.
  // stage 'exiting': we want curtain to CLOSE (reveal screen). So isOpen=false.
  
  const isOpen = stage === "entering";
  const shouldRender = stage !== "idle";

  // We need to keep rendering during 'exiting' phase so Curtain can animate out.
  // Curtain component handles its own exit animation timing if we pass isOpen=false.
  // But we need to make sure we don't unmount it immediately when stage becomes 'idle' 
  // if Curtain is still animating? 
  // Actually TransitionContext handles the 'exiting' duration before switching to 'idle'.
  // So when stage becomes 'idle', animation should be done.
  
  if (!shouldRender) return null;

  return (
    <Curtain 
      isOpen={isOpen} 
      className={styles.transitionCurtain}
      showLogo={true}
      overlayColor="#1c1c1c"
    />
  );
}
