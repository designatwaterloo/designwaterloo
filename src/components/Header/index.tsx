"use client";

import Image from "next/image";
import Link from "@/components/Link";
import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import styles from "./Header.module.css";
import OverlayNav from "../OverlayNav";
import { useAuth } from "@/components/auth/AuthProvider";

export default function Header() {
  const [isNavOpen, setIsNavOpen] = useState(false);
  const { user, member } = useAuth();

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

  // Close menu on route change
  const pathname = usePathname();
  useEffect(() => {
    setIsNavOpen(false);
  }, [pathname]);

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
          <Link
            href="/"
            className={`${styles.headerLogo} col-start-3 col-span-1`}
          >
            <Image
              src="/Design Waterloo Logo.svg"
              alt="Design Waterloo"
              width={36}
              height={36}
              className="h-full w-auto"
              priority
            />
          </Link>
          <div className={`${styles.headerActions} col-start-11 col-span-2`}>
            <Link
              href={{ pathname: user && member ? "/profile/edit" : "/sign-in" }}
              className={`btn-menu ${styles.primaryButton}`}
              aria-label={user && member ? "Edit profile" : "Sign in"}
            >
              <Image src="/person.svg" alt="Sign in" width={24} height={24} />
            </Link>
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

      {/* Full-screen Overlay Navigation */}
      <OverlayNav isOpen={isNavOpen} onClose={() => setIsNavOpen(false)} />
    </>
  );
}
