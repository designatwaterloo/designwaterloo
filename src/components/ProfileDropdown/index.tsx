"use client";

import { useAuth } from "@/components/auth/AuthProvider";
import { useEffect, useRef } from "react";
import styles from "./ProfileDropdown.module.css";
import Link from "@/components/Link";
import Image from "next/image";

interface ProfileDropdownProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function ProfileDropdown({ isOpen, onClose }: ProfileDropdownProps) {
  const { user, member, signOut } = useAuth();
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen, onClose]);

  // Close on Escape key
  useEffect(() => {
    if (!isOpen) return;

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };

    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("keydown", handleEscape);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div ref={dropdownRef} className={styles.dropdown}>
      <div className={styles.dropdownContent}>
        {user && member ? (
          <>
            <div className={styles.userInfo}>
              <p className={styles.userName}>{member.first_name} {member.last_name}</p>
              <p className={styles.userEmail}>{user.email}</p>
            </div>
            <div className={styles.divider} />
            <Link href={`/@${member.slug}`} className={styles.menuItem} onClick={onClose}>
              View Profile
            </Link>
            <button
              onClick={() => {
                onClose();
                signOut();
              }}
              className={`${styles.menuItem} ${styles.signOutButton}`}
            >
              <Image
                src="/sign-out.svg"
                alt="Sign out"
                width={16}
                height={16}
              />
              Sign Out
            </button>
          </>
        ) : (
          <Link href="/sign-in" className={styles.menuItem} onClick={onClose}>
            Sign In
          </Link>
        )}
      </div>
    </div>
  );
}
