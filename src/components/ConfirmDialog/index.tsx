"use client";

import { useEffect, useId, useRef, type ReactNode } from "react";
import styles from "./ConfirmDialog.module.css";

interface ConfirmDialogProps {
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
  loading?: boolean;
  confirmDisabled?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  children?: ReactNode;
}

export default function ConfirmDialog({
  title,
  message,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  danger = false,
  loading = false,
  confirmDisabled = false,
  onConfirm,
  onCancel,
  children,
}: ConfirmDialogProps) {
  const dialog = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const messageId = useId();
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    const element = dialog.current;
    element?.showModal();
    return () => { element?.close(); previous?.focus(); };
  }, []);
  return (
    <dialog ref={dialog} className={styles.overlay} aria-labelledby={titleId} aria-describedby={messageId} aria-busy={loading} onKeyDown={(event) => {
      if (event.key !== 'Tab') return;
      const controls = Array.from(dialog.current?.querySelectorAll<HTMLElement>('button:not(:disabled), input:not(:disabled), textarea:not(:disabled), select:not(:disabled), a[href], [tabindex="0"]') || []);
      const first = controls[0], last = controls[controls.length - 1];
      if (!first) { event.preventDefault(); return; }
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    }} onCancel={(event) => { event.preventDefault(); if (!loading) onCancel(); }} onClick={(event) => { if (event.target === event.currentTarget && !loading) onCancel(); }}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <h2 id={titleId} className={styles.title}>{title}</h2>
        <p id={messageId} className={styles.message}>{message}</p>
        {children}
        <div className={styles.actions}>
          <button
            type="button"
            className={styles.cancelButton}
            onClick={onCancel}
            disabled={loading}
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            className={`${styles.confirmButton} ${danger ? styles.confirmButtonDanger : ""}`}
            onClick={onConfirm}
            disabled={loading || confirmDisabled}
          >
            {loading ? "..." : confirmLabel}
          </button>
        </div>
      </div>
    </dialog>
  );
}
