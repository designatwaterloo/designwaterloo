"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import styles from "./Header.module.css";

export default function Header() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  return (
    <>
      <header className="container py-[var(--small)] px-[var(--big)]">
        <Link href="/" className="header-logo col-start-1 left-[var(--big)] cursor-pointer">
          <Image src="/Design Waterloo Wordmark.svg" alt="Design Waterloo" width={200} height={36} className="h-full w-auto" priority />
        </Link>
        <Link href="/" className="header-logo col-start-3 left-[calc(var(--big)+2*(100vw-2*var(--big))/12+2*var(--gap))] cursor-pointer">
          <Image src="/Design Waterloo Logo.svg" alt="Design Waterloo" width={36} height={36} className="h-full w-auto" priority />
        </Link>
        <div className="col-span-3 col-start-7">
          <p className="text-[#aeaeae]">
            A collective and directory of student designers* from the <a href="https://uwaterloo.ca" target="_blank" rel="noopener noreferrer">University of Waterloo</a> and <a href="https://wlu.ca" target="_blank" rel="noopener noreferrer">Wilfrid Laurier University</a>.
          </p>
        </div>
        <div className="col-span-2 col-start-10">
          {/* Secondary Logo */}
          <svg width="44" height="36" viewBox="0 0 44 36" fill="white" className="">
            {/* Logo SVG placeholder */}
          </svg>
        </div>
        <button 
          onClick={() => setIsMenuOpen(true)}
          className="btn-menu col-start-12 fixed top-[var(--small)] right-[var(--big)] z-50 [filter:invert(1)] mix-blend-difference bg-white"
        >
          Menu
        </button>
      </header>

      {/* Blurred overlay - full screen */}
      <div 
        className={`fixed inset-0 bg-black/50 backdrop-blur-md z-[60] transition-opacity duration-300 ${
          isMenuOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        }`}
        onClick={() => setIsMenuOpen(false)}
      />
      
      {/* Sidebar - separate from overlay */}
      <aside
        className={`fixed top-0 right-0 h-screen bg-white z-[70] transition-transform duration-300 ease-in-out ${
          isMenuOpen ? "translate-x-0" : "translate-x-full"
        }`}
        style={{ 
          width: 'calc(3 * (100vw - 2 * var(--big)) / 12 + 2 * var(--gap) + 2 * var(--big))'
        }}
      >
        <div className="flex flex-col h-full">
          {/* Close button aligned with menu button */}
          <button
            onClick={() => setIsMenuOpen(false)}
            className="btn-menu fixed top-[var(--small)] right-[var(--big)] z-[80] text-2xl"
            aria-label="Close menu"
          >
            ✕
          </button>

          <div className="flex flex-col h-full p-[var(--big)] pt-[calc(var(--small)+var(--big))]">

          {/* Navigation Links */}
          <nav className="flex flex-col mb-auto -mx-[var(--big)]">
            <a
              href="#work"
              onClick={() => setIsMenuOpen(false)}
              className={styles.menuNavItem}
            >
              Work
            </a>
            <a
              href="#directory"
              onClick={() => setIsMenuOpen(false)}
              className={styles.menuNavItem}
            >
              Directory
            </a>
            <a
              href="#play"
              onClick={() => setIsMenuOpen(false)}
              className={styles.menuNavItem}
            >
              Play
            </a>
            <a
              href="#about"
              onClick={() => setIsMenuOpen(false)}
              className={styles.menuNavItem}
            >
              About
            </a>
          </nav>

          {/* Call to Action Buttons */}
          <div className="flex gap-[var(--tiny)] mb-[var(--big)]">
            <button className="btn-secondary flex-1">
              Join directory →
            </button>
            <button className="btn-primary flex-1">
              Find talent →
            </button>
          </div>

          {/* Footer Links */}
          <div className="grid grid-cols-2 gap-x-[var(--big)] gap-y-[var(--tinier)]">
            <a
              href="https://instagram.com/designwaterloo"
              target="_blank"
              rel="noopener noreferrer"
              className="text-black hover:text-[#0000ff] transition-colors no-underline"
              style={{ fontSize: 'var(--smallest)' }}
            >
              Instagram
            </a>
            <a
              href="mailto:hello@designwaterloo.com"
              className="text-black hover:text-[#0000ff] transition-colors no-underline"
              style={{ fontSize: 'var(--smallest)' }}
            >
              Contact
            </a>
            <a
              href="https://linkedin.com/company/designwaterloo"
              target="_blank"
              rel="noopener noreferrer"
              className="text-black hover:text-[#0000ff] transition-colors no-underline"
              style={{ fontSize: 'var(--smallest)' }}
            >
              LinkedIn
            </a>
            <a
              href="/privacy"
              className="text-black hover:text-[#0000ff] transition-colors no-underline"
              style={{ fontSize: 'var(--smallest)' }}
            >
              Privacy policy
            </a>
          </div>
          </div>
        </div>
      </aside>
    </>
  );
}
