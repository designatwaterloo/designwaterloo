"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect } from "react";
import styles from "./Header.module.css";

export default function Header() {
  // Close menu on Esc key press
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        const checkbox = document.getElementById("menu-toggle") as HTMLInputElement;
        if (checkbox?.checked) {
          checkbox.checked = false;
        }
      }
    };

    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, []);

  return (
    <>
      {/* Hidden checkbox for menu state */}
      <input type="checkbox" id="menu-toggle" className={styles.menuToggle} />

      {/* Sticky Header Grid Container */}
      <header className={styles.headerContainer}>
        <Link href="/" className={`${styles.headerLogo} col-start-1`}>
          <Image src="/Design Waterloo Wordmark.svg" alt="Design Waterloo" width={200} height={36} className="h-full w-auto" priority />
        </Link>
        <Link href="/" className={`${styles.headerLogo} col-start-3`}>
          <Image src="/Design Waterloo Logo.svg" alt="Design Waterloo" width={36} height={36} className="h-full w-auto" priority />
        </Link>
        <label 
          htmlFor="menu-toggle"
          className={`btn-menu col-start-12 ${styles.menuButton}`}
        >
          <div className={styles.menuIcon}>
            <span></span>
            <span></span>
          </div>
        </label>
      </header>

      {/* Blurred overlay - full screen */}
      <label 
        htmlFor="menu-toggle"
        className={styles.overlay}
      />
      
      {/* Sidebar - separate from overlay */}
      <aside className={styles.sidebar}>
        <div>
          {/* Close button */}
          <div className={styles.closeButtonArea}>
            <label
              htmlFor="menu-toggle"
              className={styles.closeButton}
              aria-label="Close menu"
            >
              ✕
            </label>
          </div>

          {/* Navigation Links */}
          <nav className="flex flex-col mb-auto">
            <a href="#work" className={styles.menuNavItem}>
              Work
            </a>
            <a href="#directory" className={styles.menuNavItem}>
              Directory
            </a>
            <a href="#play" className={styles.menuNavItem}>
              Play
            </a>
            <a href="#about" className={styles.menuNavItem}>
              About
            </a>
          </nav>

          {/* Call to Action Buttons */}
          <div className="flex gap-[var(--tiny)] mb-[var(--margin)] px-[var(--margin)]">
            <button className="btn-secondary flex-1">
              Join directory →
            </button>
            <button className="btn-primary flex-1">
              Find talent →
            </button>
          </div>

          {/* Footer Links */}
          <div className="grid grid-cols-2 gap-x-[var(--margin)] gap-y-[var(--tinier)] px-[var(--margin)]">
            <a
              href="https://instagram.com/designwaterloo"
              target="_blank"
              rel="noopener noreferrer"
              className="text-black hover:text-[var(--blue)] transition-colors no-underline"
              style={{ fontSize: 'var(--smallest)' }}
            >
              Instagram
            </a>
            <a
              href="mailto:hello@designwaterloo.com"
              className="text-black hover:text-[var(--blue)] transition-colors no-underline"
              style={{ fontSize: 'var(--smallest)' }}
            >
              Contact
            </a>
            <a
              href="https://linkedin.com/company/designwaterloo"
              target="_blank"
              rel="noopener noreferrer"
              className="text-black hover:text-[var(--blue)] transition-colors no-underline"
              style={{ fontSize: 'var(--smallest)' }}
            >
              LinkedIn
            </a>
            <a
              href="/privacy"
              className="text-black hover:text-[var(--blue)] transition-colors no-underline"
              style={{ fontSize: 'var(--smallest)' }}
            >
              Privacy policy
            </a>
          </div>
        </div>
      </aside>
    </>
  );
}
