"use client";

import { useEffect, useId, useRef, useState } from "react";
import { QuestionMarkCircleIcon } from "@heroicons/react/24/outline";
import styles from "./page.module.css";

export default function PublicationHelp() {
  const [open, setOpen] = useState(false);
  const id = useId();
  const container = useRef<HTMLDivElement>(null);
  const button = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    const dismiss = (event: PointerEvent) => {
      if (!container.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", dismiss);
    return () => document.removeEventListener("pointerdown", dismiss);
  }, [open]);

  return <div ref={container} className={styles.publicationHelp}
    onBlur={event => { if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false); }}
    onKeyDown={event => {
      if (event.key === "Escape") {
        event.preventDefault();
        setOpen(false);
        button.current?.focus();
      }
    }}>
    <button ref={button} type="button" className={styles.helpButton}
      aria-label="About profile visibility" aria-expanded={open} aria-controls={id}
      onClick={() => setOpen(value => !value)}>
      <QuestionMarkCircleIcon width={20} height={20} aria-hidden="true" />
    </button>
    <div id={id} hidden={!open} role="region" aria-label="Profile visibility" className={styles.helpPopover}>
      <h2>Profile visibility</h2>
      <dl>
        <dt>Published</dt><dd>Your profile is public and appears in the directory.</dd>
        <dt>Unpublished</dt><dd>Your details are saved, but your profile is not public. Submit it for review when you’re ready to publish.</dd>
        <dt>Under review</dt><dd>Your profile is hidden from the public while our team reviews it. You can keep editing here. It becomes public once approved; review usually takes about a day.</dd>
        <dt>Needs changes</dt><dd>Update your profile using the review feedback, then submit it again.</dd>
      </dl>
    </div>
  </div>;
}
