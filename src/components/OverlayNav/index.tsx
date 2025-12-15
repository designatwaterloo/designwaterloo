"use client";

import Image from "next/image";
import Link from "@/components/Link";
import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import Footer from "../Footer";
import styles from "./OverlayNav.module.css";
import Curtain from "../Curtain";

interface OverlayNavProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function OverlayNav({ isOpen, onClose }: OverlayNavProps) {
  const pathname = usePathname();
  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
    if (isOpen) {
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          setIsAnimating(true);
        });
      });
    } else {
      const timer = setTimeout(() => {
        setIsAnimating(false);
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  if (!isOpen && !isAnimating) return null;

  const navItems = [
    { label: "Home", href: "/" },
    { label: "Work", href: "/work" },
    { label: "Directory", href: "/directory" },
    { label: "About", href: "/about" },
  ];

  // Nav item delays: start after columns finish 
  const navItemDelays = [0.65, 0.72, 0.80, 0.89];

  const isClosing = !isOpen;

  // Only close menu if navigating to the same page
  const handleNavClick = (href: string) => {
    if (pathname === href) {
      onClose();
    }
  };

  return (
    <div className={`${styles.overlay} ${isAnimating && isOpen ? styles.opening : ''} ${isClosing ? styles.closing : ''}`}>
      {/* Replaced columns with Curtain component */}
      <Curtain 
        isOpen={isOpen} 
        className={styles.curtainOverride}
      />

      {/* Content Layer */}
      <div className={styles.contentLayer}>
        {/* Top Section - Logo */}
        <div className={styles.topSection}>
          {/* Logo */}
          <div className={styles.logoSection}>
            <Image
              src="/Design Waterloo Logo.svg"
              alt="Design Waterloo"
              width={45}
              height={36}
              className={styles.logo}
            />
          </div>

          {/* Desktop: Nav Items + Close Button */}
          <div className={styles.navSection}>
            <nav className={styles.navItems}>
              {navItems.map((item, index) => (
                <Link
                  key={item.label}
                  href={item.href}
                  onClick={() => handleNavClick(item.href)}
                  className={`${styles.navItem} ${isAnimating && isOpen ? styles.navItemOpening : ''} ${isClosing ? styles.navItemClosing : ''}`}
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

            {/* Close Button - Desktop */}
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

        {/* Mobile: Close Button - Independent positioning */}
        <button
          className={`${styles.closeButtonMobile} ${isAnimating && isOpen ? styles.opening : ''} ${isClosing ? styles.closing : ''}`}
          onClick={onClose}
          aria-label="Close navigation"
        >
          <svg width="41" height="41" viewBox="0 0 41 41" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M10 10L31 31M31 10L10 31" stroke="white" strokeWidth="2" strokeLinecap="round"/>
          </svg>
        </button>

        {/* Bottom Section - Footer with menu variant */}
        <div className={`${styles.footerSection} ${isAnimating && isOpen ? styles.footerOpening : ''} ${isClosing ? styles.footerClosing : ''}`}>
          <Footer variant="menu" />
        </div>
      </div>
    </div>
  );
}
