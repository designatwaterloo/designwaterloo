"use client";

import { useState } from "react";
import styles from "./page.module.css";

interface EmailCopyProps {
  email: string;
}

export default function EmailCopy({ email }: EmailCopyProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(email);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  return (
    <div className={styles.infoRow}>
      <dt className={styles.label}>Email</dt>
      <dd className={styles.emailContainer}>
        <span className={styles.emailText}>{email}</span>
        <button onClick={handleCopy} className={styles.copyButton}>
          {copied ? "Copied!" : "Copy"}
        </button>
      </dd>
    </div>
  );
}
