"use client";

import { useState, useEffect, useRef } from "react";
import styles from "./Curtain.module.css";
import BloomingLogo from "../BloomingLogo";

interface CurtainProps {
  isOpen: boolean;
  onAnimationStart?: () => void;
  onAnimationComplete?: () => void;
  className?: string;
  showLogo?: boolean;
  overlayColor?: string;
}


export default function Curtain({
  isOpen,
  onAnimationStart,
  onAnimationComplete,
  className = "",
  showLogo = false,
  overlayColor
}: CurtainProps) {
  const [isAnimating, setIsAnimating] = useState(false);
  const callbacks = useRef({ onAnimationStart, onAnimationComplete });
  callbacks.current = { onAnimationStart, onAnimationComplete };
  // Column 0 has the largest close delay, so it finishes the close last.
  const sentinelColumnRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      callbacks.current.onAnimationStart?.();
      let secondFrame = 0;
      const firstFrame = requestAnimationFrame(() => {
        secondFrame = requestAnimationFrame(() => setIsAnimating(true));
      });
      return () => { cancelAnimationFrame(firstFrame); cancelAnimationFrame(secondFrame); };
    }

    callbacks.current.onAnimationStart?.();
    const el = sentinelColumnRef.current;
    if (!el) {
      setIsAnimating(false);
      callbacks.current.onAnimationComplete?.();
      return;
    }

    let done = false;
    const finish = () => {
      if (done) return;
      done = true;
      setIsAnimating(false);
      callbacks.current.onAnimationComplete?.();
    };
    const handleEnd = (e: TransitionEvent) => {
      if (e.target !== el || !['transform', 'opacity'].includes(e.propertyName)) return;
      finish();
    };

    el.addEventListener('transitionend', handleEnd);
    // Derive the fallback from the actual CSS, including reduced-motion overrides.
    const css = getComputedStyle(el);
    const seconds = (value: string) => parseFloat(value) * (value.trim().endsWith("ms") ? 1 : 1000);
    const duration = Math.max(...css.transitionDuration.split(",").map(seconds));
    const delay = Math.max(...css.transitionDelay.split(",").map(seconds));
    const safety = setTimeout(finish, duration + delay + 100);

    return () => {
      el.removeEventListener('transitionend', handleEnd);
      clearTimeout(safety);
    };
  }, [isOpen]);

  const isClosing = !isOpen;

  return (
    <div className={`${styles.curtainContainer} ${className}`}>
      {/* Background Layer - fades in behind columns */}
      <div 
        className={`${styles.backgroundLayer} ${isAnimating && isOpen ? styles.opening : ''} ${isClosing ? styles.closing : ''}`} 
        style={overlayColor ? { backgroundColor: overlayColor } : undefined}
      />
      
      {/* Logo Layer - centered */}
      {showLogo && (
        <div className={`${styles.logoLayer} ${isAnimating && isOpen ? styles.logoOpening : ''} ${isClosing ? styles.logoClosing : ''}`}>
          <BloomingLogo
            show={isAnimating && isOpen}
            size={120}
            className={styles.centerLogo}
          />
        </div>
      )}
      
      {/* Columns Container */}
      <div className={styles.columnsContainer}>
        {Array.from({ length: 6 }, (_, index) => (
          <div
            key={index}
            ref={index === 0 ? sentinelColumnRef : undefined}
            className={`${styles.column} ${isAnimating && isOpen ? styles.columnOpening : ''} ${isClosing ? styles.columnClosing : ''}`}
            style={{ "--column": index } as React.CSSProperties}
          />
        ))}
      </div>
    </div>
  );
}
