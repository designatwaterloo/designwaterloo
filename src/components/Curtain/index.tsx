"use client";

import { useState, useEffect } from "react";
import styles from "./Curtain.module.css";

import Image from "next/image";

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
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 768);
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
    } else {
      onAnimationStart?.();
      const timer = setTimeout(() => {
        setIsAnimating(false);
        onAnimationComplete?.();
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [isOpen, onAnimationStart, onAnimationComplete]);

  const columnCount = isMobile ? 4 : 6;

  const columnDelaysOpen = isMobile
    ? [0.405, 0.305, 0.195, 0.075]
    : [0.575, 0.495, 0.405, 0.305, 0.195, 0.075];

  const columnDelaysClose = isMobile
    ? [0.18, 0.12, 0.07, 0.03]
    : [0.3, 0.24, 0.18, 0.12, 0.07, 0.03];

  const columnDurationsOpen = isMobile
    ? [0.22, 0.25, 0.30, 0.35]
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
           <Image
              src="/Design Waterloo Logo.svg"
              alt="Design Waterloo"
              width={100}
              height={80}
              className={styles.centerLogo}
            />
        </div>
      )}
      
      {/* Columns Container */}
      <div className={styles.columnsContainer}>
        {Array.from({ length: columnCount }, (_, index) => (
          <div
            key={index}
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
