"use client";

import Image from "next/image";
import { useLinkStatus } from "next/link";
import Link from "@/components/Link";
import { useState, useEffect, useCallback, useRef } from "react";
import { usePathname } from "next/navigation";
import Footer from "../Footer";
import styles from "./OverlayNav.module.css";
import headerStyles from "../Header/Header.module.css";
import Curtain from "../Curtain";
import { useAuth } from "@/components/auth/AuthProvider";
import { createClient } from "@/lib/supabase/client";
import { triggerHaptic } from "@/lib/haptics";

function ProfileLinkLabel() {
  const { pending } = useLinkStatus();
  return <span aria-busy={pending}>{pending ? "Opening profile…" : "View profile"}</span>;
}

interface OverlayNavProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function OverlayNav({ isOpen, onClose }: OverlayNavProps) {
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    if (isOpen && dialog.current && !dialog.current.open) dialog.current.showModal();
  }, [isOpen]);
  const pathname = usePathname();
  const [isAnimating, setIsAnimating] = useState(false);
  const { user, member, loading, signOut } = useAuth();
  const [directoryCount, setDirectoryCount] = useState<number | null>(null);
  const [pendingCount, setPendingCount] = useState<number | null>(null);

  // Fetch counts when nav opens
  useEffect(() => {
    if (!isOpen) return;
    const supabase = createClient();

    supabase
      .from("members")
      .select("*", { count: "exact", head: true })
      .eq("onboarding_completed", true)
      .eq("is_approved", true)
      .then(({ count }) => setDirectoryCount(count));

    if (member?.is_admin) {
      supabase
        .from("members")
        .select("*", { count: "exact", head: true })
        .eq("onboarding_completed", true)
        .eq("is_approved", false)
        .then(({ count }) => setPendingCount(count));
    }
  }, [isOpen, member?.is_admin]);

  useEffect(() => {
    if (!isOpen) return;
    let secondFrame = 0;
    const firstFrame = requestAnimationFrame(() => {
      secondFrame = requestAnimationFrame(() => setIsAnimating(true));
    });
    return () => { cancelAnimationFrame(firstFrame); cancelAnimationFrame(secondFrame); };
  }, [isOpen]);

  // Unmount once the curtain's close transition has fully finished —
  // sourced from the curtain itself rather than a parallel magic-number timer.
  const handleCurtainComplete = useCallback(() => {
    dialog.current?.close();
    setIsAnimating(false);
  }, []);


  const navItems = [
    { label: "Home", href: "/", sup: null as number | null },
    { label: "Directory", href: "/directory", sup: directoryCount },
    { label: "About", href: "/about", sup: null as number | null },
  ];

  // Build user navigation items based on auth state
  const userNavItems: { label: string; href?: string; onClick?: () => void; sup?: number | null }[] = [];

  if (loading) {
    // Still loading - don't show auth items yet to avoid flicker
  } else if (user && member) {
    userNavItems.push({ label: "Dashboard", href: "/dashboard" });
    userNavItems.push({ label: "Account settings", href: "/settings" });
    if (member.is_admin) {
      userNavItems.push({ label: "Admin", href: "/admin", sup: pendingCount });
    }
  }

  const isClosing = !isOpen;

  // Only close menu if navigating to the same page
  const handleNavClick = (href: string) => {
    if (pathname === href) {
      onClose();
    }
  };

  return (
    <dialog ref={dialog} id="site-navigation" aria-label="Site navigation" onCancel={(event) => { event.preventDefault(); onClose(); }} className={`${styles.overlay} ${isAnimating && isOpen ? styles.opening : ''} ${isClosing ? styles.closing : ''}`}>
      <button type="button" onClick={onClose} aria-label="Close navigation" className={`${headerStyles.menuButton} ${headerStyles.menuButtonOpen}`}>
        <span aria-hidden="true" className={`${headerStyles.menuIcon} ${headerStyles.menuIconOpen}`}><span /><span className={headerStyles.menuIconMiddle} /><span /></span>
      </button>
      <Curtain
        isOpen={isOpen}
        className={styles.curtainOverride}
        onAnimationComplete={handleCurtainComplete}
      />

      {/* Profile button inside overlay — animates with nav content */}
      <Link
        href={user && member ? "/dashboard" : "/sign-in"}
        className={`${styles.overlayProfileButton} ${!member?.profile_image_url ? styles.overlayProfileButtonDefault : ''} ${isAnimating && isOpen ? styles.overlayProfileOpening : ''} ${isClosing ? styles.overlayProfileClosing : ''}`}
        aria-label={user && member ? "Your dashboard" : "Sign in"}
      >
        <Image
          src={member?.profile_image_url || "/person.svg"}
          alt={user && member ? "Your profile" : "Sign in"}
          width={32}
          height={32}
          className={styles.overlayProfileImage}
        />
      </Link>

      {/* Content Layer */}
      <div className={styles.contentLayer}>
        {/* Top Section - Logo + user info (desktop: also contains nav) */}
        <div className={styles.topSection}>
          <div className={styles.logoSection}>
            {!loading && user && member ? (
              <div className={`${styles.userInfo} ${isAnimating && isOpen ? styles.userInfoOpening : ''} ${isClosing ? styles.userInfoClosing : ''}`}>
                <span className={styles.userName}>
                  {member.first_name} {member.last_name}
                </span>
                <div className={styles.userLinks}>
                  <Link href={`/@${member.slug}`} onClick={() => handleNavClick(`/@${member.slug}`)} className={styles.userLink}>
                    <ProfileLinkLabel />
                  </Link>
                  <button
                    onClick={() => {
                      triggerHaptic();
                      onClose();
                      signOut();
                    }}
                    className={styles.userLink}
                  >
                    Sign out
                  </button>
                </div>
              </div>
            ) : (
              <Image
                src="/Design Waterloo Logo.svg"
                alt="Design Waterloo"
                width={45}
                height={36}
                className={styles.logo}
              />
            )}
          </div>

          {/* Desktop only: nav sits beside logo */}
          <div className={`${styles.navSection} ${styles.navSectionDesktop}`}>
            <nav aria-label="Main" className={styles.navItems}>
              {navItems.map((item, index) => (
                <Link
                  key={item.label}
                  href={item.href}
                  onClick={() => handleNavClick(item.href)}
                  className={`${styles.navItem} ${isAnimating && isOpen ? styles.navItemOpening : ''} ${isClosing ? styles.navItemClosing : ''}`}
                  style={{ '--stagger-index': index } as React.CSSProperties}
                >
                  {item.label}{item.sup != null && <sup>{item.sup}</sup>}
                </Link>
              ))}
              {userNavItems.map((item, index) => {
                const staggerIndex = navItems.length + index;
                return item.href ? (
                  <Link
                    key={item.label}
                    href={item.href}
                    onClick={() => handleNavClick(item.href!)}
                    className={`${styles.navItem} ${isAnimating && isOpen ? styles.navItemOpening : ''} ${isClosing ? styles.navItemClosing : ''}`}
                    style={{ '--stagger-index': staggerIndex } as React.CSSProperties}
                  >
                    {item.label}{item.sup != null && <sup>{item.sup}</sup>}
                  </Link>
                ) : (
                  <button
                    key={item.label}
                    onClick={item.onClick}
                    className={`${styles.navItem} ${styles.navButton} ${isAnimating && isOpen ? styles.navItemOpening : ''} ${isClosing ? styles.navItemClosing : ''}`}
                    style={{ '--stagger-index': staggerIndex } as React.CSSProperties}
                  >
                    {item.label}{item.sup != null && <sup>{item.sup}</sup>}
                  </button>
                );
              })}
            </nav>
          </div>
        </div>

        {/* Mobile only: nav below header, fills middle */}
        <div className={`${styles.navSection} ${styles.navSectionMobile}`}>
          <nav aria-label="Main" className={styles.navItems}>
            {navItems.map((item, index) => (
              <Link
                key={item.label}
                href={item.href}
                onClick={() => handleNavClick(item.href)}
                className={`${styles.navItem} ${isAnimating && isOpen ? styles.navItemOpening : ''} ${isClosing ? styles.navItemClosing : ''}`}
                style={{ '--stagger-index': index } as React.CSSProperties}
              >
                {item.label}{item.sup != null && <sup>{item.sup}</sup>}
              </Link>
            ))}
            {userNavItems.map((item, index) => {
              const staggerIndex = navItems.length + index;
              return item.href ? (
                <Link
                  key={item.label}
                  href={item.href}
                  onClick={() => handleNavClick(item.href!)}
                  className={`${styles.navItem} ${isAnimating && isOpen ? styles.navItemOpening : ''} ${isClosing ? styles.navItemClosing : ''}`}
                  style={{ '--stagger-index': staggerIndex } as React.CSSProperties}
                >
                  {item.label}{item.sup != null && <sup>{item.sup}</sup>}
                </Link>
              ) : (
                <button
                  key={item.label}
                  onClick={item.onClick}
                  className={`${styles.navItem} ${styles.navButton} ${isAnimating && isOpen ? styles.navItemOpening : ''} ${isClosing ? styles.navItemClosing : ''}`}
                  style={{ '--stagger-index': staggerIndex } as React.CSSProperties}
                >
                  {item.label}{item.sup != null && <sup>{item.sup}</sup>}
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
    </dialog>
  );
}
