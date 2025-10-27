"use client";

import Image from "next/image";
import Link from "next/link";
import { useState, useEffect } from "react";
import Footer from "./Footer";
import styles from "./OverlayNav.module.css";

interface OverlayNavProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function OverlayNav({ isOpen, onClose }: OverlayNavProps) {
  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
    if (isOpen) {
      // Trigger animation after component mounts
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          setIsAnimating(true);
        });
      });
    } else {
      // Keep rendering during close animation
      const timer = setTimeout(() => {
        setIsAnimating(false);
      }, 500); // Last column finishes at 0.3s delay + 0.2s duration = 0.5s
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  if (!isOpen && !isAnimating) return null;

  const navItems = [
    { label: "Home", href: "/" },
    { label: "Work", href: "#work" },
    { label: "Directory", href: "#directory" },
    { label: "About", href: "#about" },
  ];

  // Column delays (right to left): rightmost starts first, gaps get shorter (faster)
  // Opening gaps: 0.12s, 0.11s, 0.10s, 0.09s, 0.08s
  const columnDelaysOpen = [0.575, 0.495, 0.405, 0.305, 0.195, 0.075];

  // Closing delays (right to left, same pattern, faster gaps)
  // Gaps: 0.08s, 0.07s, 0.06s, 0.05s, 0.04s
  const columnDelaysClose = [0.3, 0.24, 0.18, 0.12, 0.07, 0.03];

  // Nav item delays: start after columns finish (last column at 0.575s + 0.3s = 0.875s)
  const navItemDelays = [0.65, 0.72, 0.80, 0.89];

  const isClosing = !isOpen;

  return (
    <div className={`${styles.overlay} ${isAnimating && isOpen ? styles.opening : ''} ${isClosing ? styles.closing : ''}`}>
      {/* 6 Column Background Animation */}
      <div className={styles.columnsContainer}>
        {[0, 1, 2, 3, 4, 5].map((index) => (
          <div
            key={index}
            className={`${styles.column} ${isAnimating && isOpen ? styles.columnOpening : ''} ${isClosing ? styles.columnClosing : ''}`}
            style={{
              transitionDelay: isClosing
                ? `${columnDelaysClose[index]}s`
                : `${columnDelaysOpen[index]}s`
            }}
          />
        ))}
      </div>

      {/* Content Layer */}
      <div className={styles.contentLayer}>
        {/* Top Section - 50/50 split */}
        <div className={styles.topSection}>
          {/* Left: Logo */}
          <div className={styles.logoSection}>
            <Image
              src="/Design Waterloo Logo.svg"
              alt="Design Waterloo"
              width={45}
              height={36}
              className={styles.logo}
            />
          </div>

          {/* Right: Nav Items + Close Button */}
          <div className={styles.navSection}>
            <nav className={styles.navItems}>
              {navItems.map((item, index) => (
                <Link
                  key={item.label}
                  href={item.href}
                  className={`${styles.navItem} ${isAnimating && isOpen ? styles.navItemOpening : ''} ${isClosing ? styles.navItemClosing : ''}`}
                  onClick={onClose}
                  style={{
                    transitionDelay: isClosing
                      ? '0s, 0s, 0s, 0s'
                      : `${navItemDelays[index]}s, ${navItemDelays[index]}s, 0s, 0s`
                  }}
                >
                  {item.label}
                </Link>
              ))}
            </nav>

            {/* Close Button */}
            <button
              className={styles.closeButton}
              onClick={onClose}
              aria-label="Close navigation"
            >
              <svg width="41" height="41" viewBox="0 0 41 41" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M10 10L31 31M31 10L10 31" stroke="white" strokeWidth="2" strokeLinecap="round"/>
              </svg>
            </button>
          </div>
        </div>

        {/* Bottom Section - Footer with menu variant */}
        <div className={`${styles.footerSection} ${isAnimating && isOpen ? styles.footerOpening : ''} ${isClosing ? styles.footerClosing : ''}`}>
          <Footer variant="menu" />
        </div>
      </div>
    </div>
  );
}
