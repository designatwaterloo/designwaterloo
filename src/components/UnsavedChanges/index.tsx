"use client";

import { createContext, useCallback, useContext, useEffect, useId, useRef, useState, type ReactNode } from "react";
import styles from "./UnsavedChanges.module.css";

const NavigationContext = createContext<(url: string, navigate: () => void) => void>((_url, navigate) => navigate());

export function useGuardedNavigation() {
  return useContext(NavigationContext);
}

const DirtyContext = createContext<(id: string, dirty: boolean) => void>(() => {});

/** Register each independent draft, including forms not yet applied to the profile. */
export function useUnsavedChanges(dirty: boolean) {
  const register = useContext(DirtyContext);
  const id = useId();
  useEffect(() => {
    register(id, dirty);
    return () => register(id, false);
  }, [register, id, dirty]);
}

export default function UnsavedChangesProvider({ children }: { children: ReactNode }) {
  const drafts = useRef(new Set<string>());
  const leaving = useRef(false);
  const [destination, setDestination] = useState<string | null>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const messageId = useId();
  const register = useCallback((id: string, dirty: boolean) => {
    if (dirty) drafts.current.add(id);
    else drafts.current.delete(id);
  }, []);

  const requestNavigation = useCallback((url: string, navigate: () => void) => {
    if (drafts.current.size) setDestination(new URL(url, window.location.href).href);
    else navigate();
  }, []);

  useEffect(() => {
    const beforeUnload = (event: BeforeUnloadEvent) => {
      if (leaving.current || !drafts.current.size) return;
      event.preventDefault();
      event.returnValue = "";
    };
    const click = (event: MouseEvent) => {
      if (event.defaultPrevented || !drafts.current.size || leaving.current ||
          event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const anchor = event.target instanceof Element ? event.target.closest("a[href]") : null;
      if (!(anchor instanceof HTMLAnchorElement) || anchor.hasAttribute("download") ||
          (anchor.target && anchor.target !== "_self")) return;
      const url = new URL(anchor.href);
      if (!["http:", "https:"].includes(url.protocol)) return;
      // Hash scrolling keeps drafts mounted; route/query changes can discard them.
      if (url.origin === location.origin && url.pathname === location.pathname &&
          url.search === location.search && url.hash) return;
      event.preventDefault();
      event.stopPropagation();
      setDestination(url.href);
    };
    document.addEventListener("click", click, true);
    window.addEventListener("beforeunload", beforeUnload);
    return () => {
      document.removeEventListener("click", click, true);
      window.removeEventListener("beforeunload", beforeUnload);
    };
  }, []);

  useEffect(() => {
    if (destination) dialog.current?.showModal();
    else dialog.current?.close();
  }, [destination]);

  return <DirtyContext.Provider value={register}>
    <NavigationContext.Provider value={requestNavigation}>{children}</NavigationContext.Provider>
    <dialog ref={dialog} className={styles.dialog} aria-labelledby={titleId}
      aria-describedby={messageId} onCancel={() => setDestination(null)}>
      <h2 id={titleId}>Leave without saving?</h2>
      <p id={messageId}>You have unsaved changes. Stay to finish editing and save, or leave and discard your changes.</p>
      <div className={styles.actions}>
        <button type="button" autoFocus onClick={() => setDestination(null)}>Keep editing</button>
        <button type="button" className={styles.leave} onClick={() => {
          if (!destination) return;
          leaving.current = true;
          // A fresh document discards all local drafts, including same-route edits.
          const url = new URL(destination);
          const sameDocument = url.origin === location.origin && url.pathname === location.pathname && url.search === location.search;
          window.location.assign(destination);
          // Assigning a new hash alone does not remount the account editor.
          if (sameDocument) window.location.reload();
        }}>Discard and leave</button>
      </div>
    </dialog>
  </DirtyContext.Provider>;
}
