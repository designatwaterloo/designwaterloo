"use client";

import Image from "next/image";
import Link from "@/components/Link";
import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import styles from "./Header.module.css";
import OverlayNav from "../OverlayNav";
import { useAuth } from "@/components/auth/AuthProvider";
import type { ReviewStatus } from "@/types/database";
import { triggerHaptic } from "@/lib/haptics";

export default function Header() {
  const [isNavOpen, setIsNavOpen] = useState(false);
  const { user, member } = useAuth();
  const hasProfile = !!(user && member);
  const hasProfileImage = !!(member?.profile_image_url);
  const avatarSrc = hasProfileImage ? member!.profile_image_url! : "/person.svg";

  const reviewStatus = (member?.review_status ?? "draft") as ReviewStatus;
  const showBadge = hasProfile && reviewStatus === "pending_review";

  // Close menu on Esc key press
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isNavOpen) {
        setIsNavOpen(false);
      }
    };

    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("keydown", handleEscape);
    };
  }, [isNavOpen]);

  // Close menus on route change
  const pathname = usePathname();
  useEffect(() => {
    setIsNavOpen(false);
  }, [pathname]);

  // Badge label for desktop
  const badgeLabel = reviewStatus === "pending_review" ? "Under review" : "Unsubmitted";

  // Ring color class for mobile
  const ringClass =
    reviewStatus === "pending_review"
      ? styles.profileRingPending
      : styles.profileRingUnsubmitted;

  return (
    <>
      {/* Sticky Header Grid Container */}
      <header className={styles.headerContainer}>
        <div className={styles.headerInner}>
          {/* Desktop: 12-col grid, wordmark spans 2 cols | Mobile: 4-col grid, each spans 1 col (handled by CSS) */}
          <Link href="/" className={`${styles.headerLogo} col-start-1 col-span-2`}>
            <Image
              src="/Design Waterloo Wordmark.svg"
              alt="Design Waterloo"
              width={200}
              height={36}
              className="h-full w-auto"
              priority
            />
          </Link>
          <Link href="/" className={`${styles.headerLogo} col-start-3 col-span-1`}>
            <Image
              src="/Design Waterloo Logo.svg"
              alt="Design Waterloo"
              width={36}
              height={36}
              className="h-full w-auto"
              priority
            />
          </Link>
          <div className={`${styles.headerActions} hidden sm:flex col-start-11 col-span-2`}>
            <button
              onClick={() => setIsNavOpen(true)}
              className={`btn-menu ${styles.menuButton}`}
              aria-label="Open navigation"
            >
              <div className={styles.menuIcon}>
                <span></span>
                <span></span>
              </div>
            </button>
          </div>
        </div>
      </header>

      {/* Profile button — no blend mode, renders photo normally */}
      <div className={[styles.profileBar, isNavOpen ? styles.profileBarHidden : '', hasProfile && member?.profile_image_url ? '' : styles.profileBarBlend].filter(Boolean).join(' ')}>
        <Link
          href={
            hasProfile
              ? "/dashboard"
              : "/sign-in"
          }
          className={`${styles.primaryButton} ${!hasProfileImage ? styles.primaryButtonDefault : ''} ${showBadge ? ringClass : ""}`}
          aria-label={hasProfile ? "Your dashboard" : "Sign in"}
        >
          <Image
            src={avatarSrc}
            alt={hasProfile ? "Your profile" : "Sign in"}
            width={32}
            height={32}
            loading="eager"
          />
        </Link>
      </div>

      {/* Menu button — separate element so blend mode composites against the page */}
      <button
        onClick={() => { triggerHaptic(); setIsNavOpen(!isNavOpen); }}
        className={`${styles.menuButton} ${isNavOpen ? styles.menuButtonOpen : ''}`}
        aria-label={isNavOpen ? "Close navigation" : "Open navigation"}
        data-cursor="menu"
        data-cursor-label="Menu"
      >
        <div className={`${styles.menuIcon} ${isNavOpen ? styles.menuIconOpen : ''}`}>
          <span></span>
          <span className={styles.menuIconMiddle}></span>
          <span></span>
        </div>
      </button>

      {/* Full-screen Overlay Navigation */}
      <OverlayNav isOpen={isNavOpen} onClose={() => setIsNavOpen(false)} />
    </>
  );
}
