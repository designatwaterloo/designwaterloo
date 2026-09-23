"use client";

import { useEffect } from "react";
import { normalizePortfolioUrl } from "@/lib/portfolio-url";
import { useInlineEdit } from "./InlineEditProvider";
import styles from "./InlineEdit.module.css";

const SOCIAL_FIELDS = [
  { key: "portfolio" as const, label: "Portfolio", placeholder: "https://yourportfolio.com" },
  { key: "linkedin" as const, label: "LinkedIn", placeholder: "https://linkedin.com/in/yourprofile" },
  { key: "twitter" as const, label: "Twitter / X", placeholder: "@yourusername or full URL" },
  { key: "instagram" as const, label: "Instagram", placeholder: "@yourusername or full URL" },
  { key: "github" as const, label: "GitHub", placeholder: "yourusername or full URL" },
  { key: "behance" as const, label: "Behance", placeholder: "Full URL" },
  { key: "dribbble" as const, label: "Dribbble", placeholder: "Full URL" },
] as const;

interface SocialLinksModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function SocialLinksModal({ isOpen, onClose }: SocialLinksModalProps) {
  const { fields, setField } = useInlineEdit();

  // Keep background scrolling locked while the modal is open.
  useEffect(() => {
    if (!isOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [isOpen]);

  // Close on Escape
  useEffect(() => {
    if (!isOpen) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className={styles.socialOverlay}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      role="dialog"
      aria-modal="true"
    >
      <div className={styles.socialModal}>
        <div className={styles.socialHeader}>
          <h3 className={styles.socialTitle}>Edit Social Links</h3>
          <button
            type="button"
            onClick={onClose}
            className={styles.socialClose}
            aria-label="Close"
          >
            x
          </button>
        </div>
        <div className={styles.socialFields}>
          {SOCIAL_FIELDS.map(({ key, label, placeholder }) => (
            <div key={key} className={styles.socialField}>
              <label htmlFor={`social-${key}`} className={styles.socialLabel}>
                {label}
              </label>
              <input
                id={`social-${key}`}
                type="text"
                value={(fields[key] as string) ?? ""}
                onChange={(e) => setField(key, e.target.value || null)}
                onBlur={key === "portfolio" ? () => { const normalized = normalizePortfolioUrl(fields.portfolio || ""); if (normalized !== null) setField("portfolio", normalized || null); } : undefined}
                onPaste={key === "portfolio" ? event => { const normalized = normalizePortfolioUrl(event.clipboardData.getData("text")); if (normalized) { event.preventDefault(); setField("portfolio", normalized); } } : undefined}
                placeholder={placeholder}
                className={styles.socialInput}
              />
            </div>
          ))}
        </div>
        <div className={styles.socialFooter}>
          <button
            type="button"
            onClick={onClose}
            className={styles.socialDone}
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
