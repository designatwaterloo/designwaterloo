"use client";

import { useEffect, useRef } from "react";
import styles from "./CursorFollower.module.css";

type CursorState =
  | "default"
  | "external-link"
  | "internal-link"
  | "copy-email"
  | "menu"
  | "nav"
  | "button"
  | "grid-item"
  | "text"
  | "reading-text";

const stateClassMap: Record<CursorState, string | undefined> = {
  default: undefined,
  "external-link": styles.externalLink,
  "internal-link": styles.internalLink,
  "copy-email": styles.copyEmail,
  menu: styles.menu,
  nav: styles.nav,
  button: styles.button,
  "grid-item": styles.gridItem,
  text: styles.text,
  "reading-text": styles.readingText,
};

/** Named SVG icons that can be used via data-cursor-icon="name" */
const CURSOR_ICONS: Record<string, string> = {
  search: '<svg width="16" height="16" viewBox="0 0 16 16" fill="none"><circle cx="6.5" cy="6.5" r="5" stroke="currentColor" stroke-width="1.5"/><path d="M10.5 10.5L14 14" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>',
  twitter: '<img src="/twitter_logo.svg" alt="" style="display:inline-block;width:16px;height:16px;vertical-align:middle;margin-right:4px" />',
  linkedin: '<img src="/linkedin_logo.svg" alt="" style="display:inline-block;width:16px;height:16px;vertical-align:middle;margin-right:4px" />',
  instagram: '<img src="/instagram_logo.svg" alt="" style="display:inline-block;width:16px;height:16px;vertical-align:middle;margin-right:4px" />',
  github: '<img src="/github_logo.svg" alt="" style="display:inline-block;width:16px;height:16px;vertical-align:middle;margin-right:4px" />',
  globe: '<img src="/globe.svg" alt="" style="display:inline-block;width:16px;height:16px;vertical-align:middle;margin-right:4px" />',
};

/* Text-content selectors for reading-text detection */
const TEXT_SELECTORS =
  "p, h1, h2, h3, h4, h5, h6, li, blockquote, figcaption, td, th, dd, dt, label, legend";

function extractDomain(href: string): string {
  try {
    return new URL(href).hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
}

function extractPageName(href: string): string {
  const path = href.split(/[?#]/)[0].replace(/\/+$/, "");
  if (!path || path === "") return "Home";
  const segment = path.split("/").filter(Boolean)[0];
  if (!segment) return "Home";
  return segment
    .split("-")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

function extractFieldLabel(el: Element): string {
  const input = el as HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement;

  if (input.id) {
    const label = document.querySelector(`label[for="${input.id}"]`);
    if (label) return (label.textContent || "").trim();
  }

  const parentLabel = input.closest("label");
  if (parentLabel) {
    const clone = parentLabel.cloneNode(true) as HTMLElement;
    clone.querySelectorAll("input, textarea, select").forEach((c) => c.remove());
    const text = (clone.textContent || "").trim();
    if (text) return text;
  }

  const ariaLabel = input.getAttribute("aria-label");
  if (ariaLabel) return ariaLabel;

  const placeholder = input.getAttribute("placeholder");
  if (placeholder) return placeholder;

  const name = input.getAttribute("name");
  if (name) {
    return name
      .replace(/([A-Z])/g, " $1")
      .replace(/[_-]/g, " ")
      .trim()
      .replace(/^\w/, (c) => c.toUpperCase());
  }

  return "";
}

function detectState(
  target: EventTarget | null
): { state: CursorState; label: string; icon: string } {
  if (!(target instanceof Element)) return { state: "default", label: "", icon: "" };

  // 1. data-cursor attribute on element or ancestor
  const cursorEl = (target as HTMLElement).closest("[data-cursor]");
  if (cursorEl) {
    const state = cursorEl.getAttribute("data-cursor") as CursorState;
    const label = cursorEl.getAttribute("data-cursor-label") || "";
    const iconName = cursorEl.getAttribute("data-cursor-icon") || "";
    const icon = CURSOR_ICONS[iconName] || "";
    return { state, label, icon };
  }

  // 2. <a> tags
  const anchor = (target as HTMLElement).closest("a[href]");
  if (anchor) {
    const href = anchor.getAttribute("href") || "";

    if (/^mailto:/i.test(href)) {
      return { state: "copy-email", label: "Copy Email", icon: "" };
    }

    if (/^https?:\/\//.test(href)) {
      const domain = extractDomain(href);
      return { state: "external-link", label: domain ? `${domain} ↗` : "", icon: "" };
    }

    const segments = href.split(/[?#]/)[0].replace(/\/+$/, "").split("/").filter(Boolean);
    let pageName: string;
    if (segments.length > 1) {
      const text = (anchor.textContent || "").trim();
      pageName = text || extractPageName(href);
    } else {
      pageName = extractPageName(href);
    }
    return { state: "internal-link", label: `${pageName} →`, icon: "" };
  }

  // 3. <button>
  const button = (target as HTMLElement).closest("button");
  if (button) {
    return { state: "button", label: "", icon: "" };
  }

  // 4. <input>, <textarea>, <select>
  const formEl = (target as HTMLElement).closest("input, textarea, select");
  if (formEl) {
    const type = formEl.getAttribute("type");
    if (
      formEl.tagName === "TEXTAREA" ||
      formEl.tagName === "SELECT" ||
      !type ||
      ["text", "search", "email", "password", "url", "tel", "number"].includes(type)
    ) {
      const fieldLabel = extractFieldLabel(formEl);
      return { state: "text", label: fieldLabel, icon: "" };
    }
  }

  // 5. Text content — shrink for precision
  const textEl = (target as HTMLElement).closest(TEXT_SELECTORS);
  if (textEl) {
    return { state: "reading-text", label: "", icon: "" };
  }

  // 6. Default
  return { state: "default", label: "", icon: "" };
}

export default function CursorFollower() {
  const baseRef = useRef<HTMLDivElement>(null);
  const dotRef = useRef<HTMLDivElement>(null);
  const labelRef = useRef<HTMLSpanElement>(null);
  const textBubbleRef = useRef<HTMLDivElement>(null);
  const textBubbleLabelRef = useRef<HTMLSpanElement>(null);
  const mouse = useRef({ x: 0, y: 0 });
  const pos = useRef({ x: 0, y: 0 });
  const scale = useRef(1);
  const clicking = useRef(false);
  const visible = useRef(false);
  const currentState = useRef<CursorState>("default");

  useEffect(() => {
    if (window.matchMedia("(pointer: coarse)").matches) return;

    const base = baseRef.current;
    const dot = dotRef.current;
    const label = labelRef.current;
    const textBubble = textBubbleRef.current;
    const textBubbleLabel = textBubbleLabelRef.current;
    if (!base || !dot || !label || !textBubble || !textBubbleLabel) return;

    const hideTextBubble = () => {
      textBubble.classList.remove(styles.textBubbleVisible);
      textBubble.style.width = "0px";
      textBubbleLabel.textContent = "";
    };

    let currentIcon = "";
    const applyState = (state: CursorState, labelText: string, icon: string = "") => {
      if (
        state === currentState.current &&
        label.textContent === labelText &&
        icon === currentIcon &&
        (state !== "text" || textBubbleLabel.textContent === labelText)
      ) {
        return;
      }
      currentIcon = icon;

      // Remove old state class
      const oldClass = stateClassMap[currentState.current];
      if (oldClass) {
        dot.classList.remove(oldClass);
        base.classList.remove(oldClass);
      }

      currentState.current = state;

      // Add new state class
      const newClass = stateClassMap[state];
      if (newClass) {
        dot.classList.add(newClass);
        base.classList.add(newClass);
      }

      // Hide text bubble unless text state
      if (state !== "text") {
        hideTextBubble();
      }

      if (state === "text") {
        // Text input — thin caret + label bubble above
        label.classList.remove(styles.labelVisible);
        label.textContent = "";
        dot.style.width = "2px";
        base.style.width = "2px";

        if (labelText) {
          textBubbleLabel.textContent = labelText;
          textBubbleLabel.style.position = "absolute";
          textBubbleLabel.style.visibility = "hidden";
          textBubbleLabel.style.display = "block";
          const bubbleWidth = textBubbleLabel.scrollWidth;
          textBubbleLabel.style.position = "";
          textBubbleLabel.style.visibility = "";
          textBubbleLabel.style.display = "";

          textBubble.style.width = `${bubbleWidth}px`;
          requestAnimationFrame(() => {
            textBubble.classList.add(styles.textBubbleVisible);
          });
        } else {
          hideTextBubble();
        }
      } else if (labelText) {
        // Cursor morphs into pill with label (+ optional icon)
        if (icon) {
          label.innerHTML = icon + labelText;
        } else {
          label.textContent = labelText;
        }
        label.style.position = "absolute";
        label.style.visibility = "hidden";
        label.style.display = "block";
        label.classList.add(styles.labelVisible);
        const textWidth = Math.ceil(label.scrollWidth) + (icon ? 20 : 0);
        label.style.position = "";
        label.style.visibility = "";
        label.style.display = "";

        dot.style.width = `${textWidth}px`;
        base.style.width = `${textWidth}px`;
        requestAnimationFrame(() => {
          label.classList.add(styles.labelVisible);
        });
      } else {
        label.classList.remove(styles.labelVisible);
        label.textContent = "";
        if (state === "button") {
          dot.style.width = "40px";
          base.style.width = "40px";
        } else if (state === "reading-text") {
          dot.style.width = "14px";
          base.style.width = "14px";
        } else {
          dot.style.width = "28px";
          base.style.width = "28px";
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
        base.style.opacity = "1";
      }

      const { state, label: labelText, icon } = detectState(e.target);
      applyState(state, labelText, icon);
    };

    const handleMouseLeave = () => {
      visible.current = false;
      dot.style.opacity = "0";
      base.style.opacity = "0";
      hideTextBubble();
    };

    const handleClick = (e: MouseEvent) => {
      if (!(e.target instanceof Element)) return;
      const anchor = (e.target as HTMLElement).closest('a[href^="mailto:"]');
      if (!anchor) return;
      e.preventDefault();
      const href = anchor.getAttribute("href") || "";
      const email = href.replace(/^mailto:/i, "").split("?")[0];
      navigator.clipboard.writeText(email).then(() => {
        label.textContent = "Copied!";
        const w = label.scrollWidth;
        dot.style.width = `${w}px`;
        base.style.width = `${w}px`;
      });
    };

    const handleMouseDown = () => {
      clicking.current = true;
    };

    const handleMouseUp = () => {
      clicking.current = false;
    };

    const lerp = 0.45;
    let raf: number;

    const tick = () => {
      pos.current.x += (mouse.current.x - pos.current.x) * lerp;
      pos.current.y += (mouse.current.y - pos.current.y) * lerp;
      const targetScale = clicking.current ? 0.75 : 1;
      scale.current += (targetScale - scale.current) * 0.3;
      const rx = Math.round(pos.current.x);
      const ry = Math.round(pos.current.y);
      const s = scale.current.toFixed(3);
      const t = `translate(${rx}px, ${ry}px) translate(-50%, -50%) scale(${s})`;
      base.style.transform = t;
      dot.style.transform = t;
      // Position text bubble above cursor
      textBubble.style.transform = `translate(${pos.current.x}px, ${pos.current.y - 24}px) translate(-50%, -100%)`;
      raf = requestAnimationFrame(tick);
    };

    const handleScroll = () => {
      if (!visible.current) return;
      const el = document.elementFromPoint(mouse.current.x, mouse.current.y);
      if (el) {
        const { state, label: labelText, icon } = detectState(el);
        applyState(state, labelText, icon);
      }
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseleave", handleMouseLeave);
    document.addEventListener("mousedown", handleMouseDown);
    document.addEventListener("mouseup", handleMouseUp);
    document.addEventListener("click", handleClick, true);
    window.addEventListener("scroll", handleScroll, { passive: true, capture: true });
    raf = requestAnimationFrame(tick);

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseleave", handleMouseLeave);
      document.removeEventListener("mousedown", handleMouseDown);
      document.removeEventListener("mouseup", handleMouseUp);
      document.removeEventListener("click", handleClick, true);
      window.removeEventListener("scroll", handleScroll, true);
      cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <>
      <div ref={baseRef} className={styles.cursorBase} aria-hidden />
      <div ref={dotRef} className={styles.cursor} aria-hidden>
        <span ref={labelRef} className={styles.label} />
      </div>
      <div ref={textBubbleRef} className={styles.textBubble} aria-hidden>
        <span ref={textBubbleLabelRef} className={styles.textBubbleLabel} />
      </div>
    </>
  );
}
