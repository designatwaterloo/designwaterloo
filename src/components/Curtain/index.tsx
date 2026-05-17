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

// Fallback if transitionend is lost (tab backgrounded, display:none, etc).
// Should comfortably exceed the longest close: delay 0.3s + duration 0.2s.
const CLOSE_SAFETY_MS = 800;

export default function Curtain({
  isOpen,
  onAnimationStart,
  onAnimationComplete,
  className = "",
  showLogo = false,
  overlayColor
}: CurtainProps) {
  const [isAnimating, setIsAnimating] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  // Column 0 has the largest close delay, so it finishes the close last.
  const sentinelColumnRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 769);
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  useEffect(() => {
    if (isOpen) {
      onAnimationStart?.();
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          setIsAnimating(true);
        });
      });
      return;
    }

    onAnimationStart?.();
    const el = sentinelColumnRef.current;
    if (!el) {
      setIsAnimating(false);
      onAnimationComplete?.();
      return;
    }

    let done = false;
    const finish = () => {
      if (done) return;
      done = true;
      setIsAnimating(false);
      onAnimationComplete?.();
    };
    const handleEnd = (e: TransitionEvent) => {
      if (e.target !== el) return;
      finish();
    };

    el.addEventListener('transitionend', handleEnd);
    const safety = setTimeout(finish, CLOSE_SAFETY_MS);

    return () => {
      el.removeEventListener('transitionend', handleEnd);
      clearTimeout(safety);
    };
  }, [isOpen, onAnimationStart, onAnimationComplete]);

  const columnCount = isMobile ? 4 : 6;

  const columnDelaysOpen = isMobile
    ? [0.53, 0.40, 0.26, 0.10]
    : [0.575, 0.495, 0.405, 0.305, 0.195, 0.075];

  const columnDelaysClose = isMobile
    ? [0.18, 0.12, 0.07, 0.03]
    : [0.3, 0.24, 0.18, 0.12, 0.07, 0.03];

  const columnDurationsOpen = isMobile
    ? [0.42, 0.47, 0.55, 0.65]
    : [0.17, 0.19, 0.22, 0.25, 0.30, 0.35];

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
        {Array.from({ length: columnCount }, (_, index) => (
          <div
            key={index}
            ref={index === 0 ? sentinelColumnRef : undefined}
            className={`${styles.column} ${isAnimating && isOpen ? styles.columnOpening : ''} ${isClosing ? styles.columnClosing : ''}`}
            style={{
              transitionDelay: isClosing
                ? `${columnDelaysClose[index]}s`
                : `${columnDelaysOpen[index]}s`,
              transitionDuration: isClosing
                ? '0.2s'
                : `${columnDurationsOpen[index]}s`
            }}
          />
        ))}
      </div>
    </div>
  );
}
