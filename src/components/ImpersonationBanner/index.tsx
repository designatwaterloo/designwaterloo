"use client";

import { useEffect, useState } from "react";

// Reads the two non-HttpOnly marker cookies set by /api/admin/impersonate.
// The actual stash is HttpOnly and the browser can't see it — these markers
// exist purely for the UI.
function readMarkerCookie(name: string): string | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie
    .split(";")
    .map((c) => c.trim())
    .find((c) => c.startsWith(`${name}=`));
  return match ? decodeURIComponent(match.split("=").slice(1).join("=")) : null;
}

export default function ImpersonationBanner() {
  const [impersonatedAs, setImpersonatedAs] = useState<string | null>(null);
  const [impersonatedBy, setImpersonatedBy] = useState<string | null>(null);
  const [stopping, setStopping] = useState(false);

  useEffect(() => {
    setImpersonatedAs(readMarkerCookie("dw-imp-as"));
    setImpersonatedBy(readMarkerCookie("dw-imp-by"));
  }, []);

  if (!impersonatedAs) return null;

  const onStop = async () => {
    setStopping(true);
    try {
      await fetch("/api/admin/impersonate/stop", { method: "POST" });
    } catch {
      // even on error, reload — cookies may have been partially cleared
    }
    window.location.assign("/admin");
  };

  return (
    <div
      role="alert"
      style={{
        position: "sticky",
        top: 0,
        zIndex: 1000,
        background: "#facc15",
        color: "#000",
        padding: "10px 16px",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: "12px",
        fontSize: "14px",
        fontWeight: 500,
        boxShadow: "0 1px 4px rgba(0,0,0,0.15)",
      }}
    >
      <span>
        Impersonating <strong>{impersonatedAs}</strong>
        {impersonatedBy ? <> (as {impersonatedBy})</> : null}
      </span>
      <button
        type="button"
        onClick={onStop}
        disabled={stopping}
        style={{
          background: "#000",
          color: "#fff",
          border: "none",
          padding: "4px 12px",
          borderRadius: "4px",
          fontSize: "13px",
          cursor: "pointer",
          opacity: stopping ? 0.6 : 1,
        }}
      >
        {stopping ? "Stopping…" : "Stop impersonating"}
      </button>
    </div>
  );
}
