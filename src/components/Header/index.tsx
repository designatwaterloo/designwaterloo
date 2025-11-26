"use client";

import Image from "next/image";
import Link from "@/components/Link";
import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import styles from "./Header.module.css";
import OverlayNav from "../OverlayNav";

export default function Header() {
  const [isNavOpen, setIsNavOpen] = useState(false);

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
          <Link href="/" className={`${styles.headerLogo} col-start-1 col-span-2 max-lg:col-span-1`}>
            <Image src="/Design Waterloo Wordmark.svg" alt="Design Waterloo" width={200} height={36} className="h-full w-auto" priority />
          </Link>
          <Link href="/" className={`${styles.headerLogo} col-start-3 col-span-1 max-lg:col-start-2`}>
            <Image src="/Design Waterloo Logo.svg" alt="Design Waterloo" width={36} height={36} className="h-full w-auto" priority />
          </Link>
          <button
            onClick={() => setIsNavOpen(true)}
            className={`btn-menu col-start-12 col-span-1 max-lg:col-start-4 ${styles.menuButton}`}
            aria-label="Open navigation"
          >
            <div className={styles.menuIcon}>
              <span></span>
              <span></span>
            </div>
          </button>
        </div>
      </header>

      {/* Full-screen Overlay Navigation */}
      <OverlayNav isOpen={isNavOpen} onClose={() => setIsNavOpen(false)} />
    </>
  );
}
