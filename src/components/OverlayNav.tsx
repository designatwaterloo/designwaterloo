"use client";

import Image from "next/image";
import Link from "next/link";
import Footer from "./Footer";
import styles from "./OverlayNav.module.css";

interface OverlayNavProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function OverlayNav({ isOpen, onClose }: OverlayNavProps) {
  if (!isOpen) return null;

  const navItems = [
    { label: "Home", href: "/" },
    { label: "Work", href: "#work" },
    { label: "Directory", href: "#directory" },
    { label: "About", href: "#about" },
  ];

  return (
    <div className={styles.overlay}>
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
            {navItems.map((item) => (
              <Link
                key={item.label}
                href={item.href}
                className={styles.navItem}
                onClick={onClose}
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
      <div className={styles.footerSection}>
        <Footer variant="menu" />
      </div>
    </div>
  );
}
