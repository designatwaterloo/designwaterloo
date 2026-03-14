"use client";

import Image from "next/image";
import Link from "@/components/Link";
import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import Footer from "../Footer";
import styles from "./OverlayNav.module.css";
import Curtain from "../Curtain";
import { useAuth } from "@/components/auth/AuthProvider";

interface OverlayNavProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function OverlayNav({ isOpen, onClose }: OverlayNavProps) {
  const pathname = usePathname();
  const [isAnimating, setIsAnimating] = useState(false);
  const { user, member, loading } = useAuth();

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
    { label: "Directory", href: "/directory" },
    { label: "About", href: "/about" },
  ];

  // Build user navigation items based on auth state
  const userNavItems: { label: string; href?: string; onClick?: () => void }[] = [];

  if (loading) {
    // Still loading - don't show auth items yet to avoid flicker
  } else if (user) {
    // User is logged in
    if (member?.is_admin) {
      userNavItems.push({ label: "Admin", href: "/admin" });
    }
  } else {
    // Not logged in - sign in handled via header icon
  }

  // Nav item delays: start after columns finish
  const allNavItemDelays = [0.65, 0.72, 0.80, 0.88, 0.96, 1.04, 1.12];

  const isClosing = !isOpen;

  // Only close menu if navigating to the same page
  const handleNavClick = (href: string) => {
    if (pathname === href) {
      onClose();
    }
  };

  return (
    <div className={`${styles.overlay} ${isAnimating && isOpen ? styles.opening : ''} ${isClosing ? styles.closing : ''}`}>
      <Curtain
        isOpen={isOpen}
        className={styles.curtainOverride}
      />

      {/* Content Layer */}
      <div className={styles.contentLayer}>
        {/* Top Section - Logo (desktop: also contains nav) */}
        <div className={styles.topSection}>
          <div className={styles.logoSection}>
            <Image
              src="/Design Waterloo Logo.svg"
              alt="Design Waterloo"
              width={45}
              height={36}
              className={styles.logo}
            />
          </div>

          {/* Desktop only: nav sits beside logo */}
          <div className={`${styles.navSection} ${styles.navSectionDesktop}`}>
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
                      : `${allNavItemDelays[index]}s, ${allNavItemDelays[index]}s, 0s, 0s`
                  }}
                  data-cursor="nav"
                  data-cursor-label={item.label}
                >
                  {item.label}
                </Link>
              ))}
              {userNavItems.map((item, index) => {
                const delayIndex = navItems.length + index;
                return item.href ? (
                  <Link
                    key={item.label}
                    href={item.href}
                    onClick={() => handleNavClick(item.href!)}
                    className={`${styles.navItem} ${isAnimating && isOpen ? styles.navItemOpening : ''} ${isClosing ? styles.navItemClosing : ''}`}
                    style={{
                      transitionDelay: isClosing
                        ? '0s, 0s, 0s, 0s'
                        : `${allNavItemDelays[delayIndex]}s, ${allNavItemDelays[delayIndex]}s, 0s, 0s`
                    }}
                    data-cursor="nav"
                    data-cursor-label={item.label}
                  >
                    {item.label}
                  </Link>
                ) : (
                  <button
                    key={item.label}
                    onClick={item.onClick}
                    className={`${styles.navItem} ${styles.navButton} ${isAnimating && isOpen ? styles.navItemOpening : ''} ${isClosing ? styles.navItemClosing : ''}`}
                    style={{
                      transitionDelay: isClosing
                        ? '0s, 0s, 0s, 0s'
                        : `${allNavItemDelays[delayIndex]}s, ${allNavItemDelays[delayIndex]}s, 0s, 0s`
                    }}
                    data-cursor="nav"
                    data-cursor-label={item.label}
                  >
                    {item.label}
                  </button>
                );
              })}
            </nav>
          </div>
        </div>

        {/* Mobile only: nav below header, fills middle */}
        <div className={`${styles.navSection} ${styles.navSectionMobile}`}>
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
                    : `${allNavItemDelays[index]}s, ${allNavItemDelays[index]}s, 0s, 0s`
                }}
                data-cursor="nav"
                data-cursor-label={item.label}
              >
                {item.label}
              </Link>
            ))}
            {userNavItems.map((item, index) => {
              const delayIndex = navItems.length + index;
              return item.href ? (
                <Link
                  key={item.label}
                  href={item.href}
                  onClick={() => handleNavClick(item.href!)}
                  className={`${styles.navItem} ${isAnimating && isOpen ? styles.navItemOpening : ''} ${isClosing ? styles.navItemClosing : ''}`}
                  style={{
                    transitionDelay: isClosing
                      ? '0s, 0s, 0s, 0s'
                      : `${allNavItemDelays[delayIndex]}s, ${allNavItemDelays[delayIndex]}s, 0s, 0s`
                  }}
                  data-cursor="nav"
                  data-cursor-label={item.label}
                >
                  {item.label}
                </Link>
              ) : (
                <button
                  key={item.label}
                  onClick={item.onClick}
                  className={`${styles.navItem} ${styles.navButton} ${isAnimating && isOpen ? styles.navItemOpening : ''} ${isClosing ? styles.navItemClosing : ''}`}
                  style={{
                    transitionDelay: isClosing
                      ? '0s, 0s, 0s, 0s'
                      : `${allNavItemDelays[delayIndex]}s, ${allNavItemDelays[delayIndex]}s, 0s, 0s`
                    }}
                  data-cursor="nav"
                  data-cursor-label={item.label}
                >
                  {item.label}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Bottom Section - Footer with menu variant */}
        <div className={`${styles.footerSection} ${isAnimating && isOpen ? styles.footerOpening : ''} ${isClosing ? styles.footerClosing : ''}`}>
          <Footer variant="menu" />
        </div>
      </div>
    </div>
  );
}
