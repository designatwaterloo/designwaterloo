"use client";

import { useEffect, useRef } from "react";
import styles from "./CursorFollower.module.css";

type CursorState =
  | "default"
  | "external-link"
  | "internal-link"
  | "menu"
  | "nav"
  | "button"
  | "grid-item"
  | "text";

const stateClassMap: Record<CursorState, string | undefined> = {
  default: undefined,
  "external-link": styles.externalLink,
  "internal-link": styles.internalLink,
  menu: styles.menu,
  nav: styles.nav,
  button: styles.button,
  "grid-item": styles.gridItem,
  text: styles.text,
};

function extractDomain(href: string): string {
  try {
    return new URL(href).hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
}

function extractPageName(href: string): string {
  // Strip trailing slash and hash/query
  const path = href.split(/[?#]/)[0].replace(/\/+$/, "");
  if (!path || path === "") return "Home";
  // Take the first path segment and capitalize
  const segment = path.split("/").filter(Boolean)[0];
  if (!segment) return "Home";
  // Handle kebab-case: "sign-in" → "Sign In"
  return segment
    .split("-")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

function detectState(
  target: EventTarget | null
): { state: CursorState; label: string } {
  if (!(target instanceof Element)) return { state: "default", label: "" };

  // 1. data-cursor attribute on element or ancestor
  const cursorEl = (target as HTMLElement).closest("[data-cursor]");
  if (cursorEl) {
    const state = cursorEl.getAttribute("data-cursor") as CursorState;
    const label = cursorEl.getAttribute("data-cursor-label") || "";
    return { state, label };
  }

  // 2. External <a> tags
  const anchor = (target as HTMLElement).closest("a[href]");
  if (anchor) {
    const href = anchor.getAttribute("href") || "";
    if (/^https?:\/\//.test(href)) {
      const domain = extractDomain(href);
      return { state: "external-link", label: domain ? `${domain} ↗` : "" };
    }
    // 3. Internal link — show page name pill
    // For deeper paths (e.g. /directory/john-doe), use the link's text content
    const segments = href.split(/[?#]/)[0].replace(/\/+$/, "").split("/").filter(Boolean);
    let pageName: string;
    if (segments.length > 1) {
      // Use the anchor's visible text if available, otherwise derive from path
      const text = (anchor.textContent || "").trim();
      pageName = text || extractPageName(href);
    } else {
      pageName = extractPageName(href);
    }
    return { state: "internal-link", label: `${pageName} →` };
  }

  // 4. <button>
  const button = (target as HTMLElement).closest("button");
  if (button) {
    return { state: "button", label: "" };
  }

  // 5. <input>, <textarea>, <select>
  const formEl = (target as HTMLElement).closest(
    "input, textarea, select"
  );
  if (formEl) {
    const type = formEl.getAttribute("type");
    // Only text-like inputs should get the text cursor
    if (
      formEl.tagName === "TEXTAREA" ||
      formEl.tagName === "SELECT" ||
      !type ||
      ["text", "search", "email", "password", "url", "tel", "number"].includes(
        type
      )
    ) {
      return { state: "text", label: "" };
    }
  }

  // 6. Default
  return { state: "default", label: "" };
}

export default function CursorFollower() {
  const dotRef = useRef<HTMLDivElement>(null);
  const labelRef = useRef<HTMLSpanElement>(null);
  const mouse = useRef({ x: 0, y: 0 });
  const pos = useRef({ x: 0, y: 0 });
  const visible = useRef(false);
  const currentState = useRef<CursorState>("default");

  useEffect(() => {
    if (window.matchMedia("(pointer: coarse)").matches) return;

    const dot = dotRef.current;
    const label = labelRef.current;
    if (!dot || !label) return;

    const applyState = (state: CursorState, labelText: string) => {
      if (
        state === currentState.current &&
        label.textContent === labelText
      ) {
        return;
      }

      // Remove old state class
      const oldClass = stateClassMap[currentState.current];
      if (oldClass) dot.classList.remove(oldClass);

      currentState.current = state;

      // Add new state class
      const newClass = stateClassMap[state];
      if (newClass) dot.classList.add(newClass);

      // Update label
      if (labelText) {
        label.textContent = labelText;
        // Measure and set explicit width for smooth transition
        // Temporarily make label visible to measure
        label.style.position = "absolute";
        label.style.visibility = "hidden";
        label.style.display = "block";
        label.classList.add(styles.labelVisible);
        const textWidth = label.scrollWidth;
        label.style.position = "";
        label.style.visibility = "";
        label.style.display = "";

        dot.style.width = `${textWidth}px`;
        // Small delay so width transition starts before opacity
        requestAnimationFrame(() => {
          label.classList.add(styles.labelVisible);
        });
      } else {
        label.classList.remove(styles.labelVisible);
        label.textContent = "";
        // Reset to default or state-defined width
        if (state === "button") {
          dot.style.width = "32px";
        } else if (state === "text") {
          dot.style.width = "2px";
        } else {
          dot.style.width = "20px";
        }
      }
    };

    const handleMouseMove = (e: MouseEvent) => {
      mouse.current.x = e.clientX;
      mouse.current.y = e.clientY;

      if (!visible.current) {
        visible.current = true;
        pos.current.x = e.clientX;
        pos.current.y = e.clientY;
        dot.style.opacity = "1";
      }

      const { state, label: labelText } = detectState(e.target);
      applyState(state, labelText);
    };

    const handleMouseLeave = () => {
      visible.current = false;
      dot.style.opacity = "0";
    };

    const lerp = 0.45;
    let raf: number;

    const tick = () => {
      pos.current.x += (mouse.current.x - pos.current.x) * lerp;
      pos.current.y += (mouse.current.y - pos.current.y) * lerp;
      dot.style.transform = `translate(${pos.current.x}px, ${pos.current.y}px) translate(-50%, -50%)`;
      raf = requestAnimationFrame(tick);
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseleave", handleMouseLeave);
    raf = requestAnimationFrame(tick);

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseleave", handleMouseLeave);
      cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <div ref={dotRef} className={styles.cursor} aria-hidden>
      <span ref={labelRef} className={styles.label} />
    </div>
  );
}
