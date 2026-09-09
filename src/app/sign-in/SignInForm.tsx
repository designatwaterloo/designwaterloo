"use client";

import { useRef, useState } from "react";
import { useAuth } from "@/components/auth/AuthProvider";
import { safeRedirect } from "@/lib/auth/redirect";
import { isTestLoginEmail } from "@/lib/supabase/test-accounts";
import { useSearchParams } from "next/navigation";

import styles from "./page.module.css";

export default function SignInForm() {
  const { signInWithMicrosoft, signInWithLaurierOtp, verifyLaurierOtp } = useAuth();
  const searchParams = useSearchParams();
  const error = searchParams.get("error");
  const reset = searchParams.get("reset");
  const redirectTo = searchParams.get("redirectTo");

  const [oauthError, setOauthError] = useState<string | null>(null);
  const [oauthBusy, setOauthBusy] = useState(false);
  const [showLaurierFlow, setShowLaurierFlow] = useState(false);
  const [laurierUsername, setLaurierUsername] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [otpCode, setOtpCode] = useState("");
  const [laurierError, setLaurierError] = useState<string | null>(null);
  const [sendingOtp, setSendingOtp] = useState(false);
  const [verifyingOtp, setVerifyingOtp] = useState(false);
  const [otpFocused, setOtpFocused] = useState(false);
  const otpRef = useRef<HTMLInputElement>(null);

  const laurierEmail = laurierUsername ? `${laurierUsername}@mylaurier.ca` : "";

  const handleSendOtp = async () => {
    setLaurierError(null);
    if (!laurierUsername.trim()) {
      setLaurierError("Please enter your Laurier username.");
      return;
    }
    // Test login: no real OTP is sent; just reveal the code box. The server
    // endpoint enforces the gate + fixed code on verify.
    if (isTestLoginEmail(laurierEmail)) {
      setOtpSent(true);
      return;
    }

    setSendingOtp(true);
    const { error } = await signInWithLaurierOtp(laurierEmail);
    setSendingOtp(false);
    if (error) {
      setLaurierError(error);
      return;
    }
    setOtpSent(true);
  };



  const handleVerifyOtp = async () => {
    setLaurierError(null);
    if (otpCode.length !== 6) {
      setLaurierError("Please enter the 6-digit code.");
      return;
    }
    setVerifyingOtp(true);

    // Test login path: POST the fixed code to the gated endpoint.
    if (isTestLoginEmail(laurierEmail)) {
      try {
        const res = await fetch("/api/auth/test-login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: laurierEmail,
            code: otpCode,
            redirectTo: redirectTo || undefined,
          }),
        });
        const data = (await res.json().catch(() => ({}))) as {
          ok?: boolean;
          redirectTo?: string;
          error?: string;
        };
        if (!res.ok || !data.ok) {
          setVerifyingOtp(false);
          setLaurierError(data.error || "Test login failed.");
          return;
        }
        window.location.assign(safeRedirect(data.redirectTo, "/welcome"));
        return;
      } catch {
        setVerifyingOtp(false);
        setLaurierError("Test login failed. Please try again.");
        return;
      }
    }

    const { error, user } = await verifyLaurierOtp(laurierEmail, otpCode);
    if (error) {
      setVerifyingOtp(false);
      setLaurierError(error);
      return;
    }

    if (!user) {
      setVerifyingOtp(false);
      setLaurierError("Authentication failed. Please try again.");
      return;
    }

    // OTP verified — find or create the member record using the same logic as
    // the OAuth callback, then redirect appropriately.
    const { createClient } = await import("@/lib/supabase/client");
    const { findOrInitMember } = await import("@/lib/supabase/member-init");
    const supabase = createClient();

    try {
      const result = await findOrInitMember(supabase);
      if (result.onboardingCompleted) {
        window.location.assign(safeRedirect(redirectTo, `/@${result.slug}`));
      } else {
        window.location.assign("/welcome");
      }
    } catch (err) {
      console.error("[OTP] Failed to initialise member record:", err);
      setLaurierError("Something went wrong. Please try again.");
      setVerifyingOtp(false);
    }
  };

  return (
    <div className={styles.content}>
      <h1 id="sign-in-title" className={styles.title}>Your work belongs here.</h1>
      <p id="sign-in-description" className={styles.description}>
        Join the directory of creatives at Waterloo and Laurier. Connect your
        university account, make a short profile, and submit it for review.
      </p>

      {error === "invalid-email" && (
        <div role="alert" className={styles.error}>
          Please sign in with a @uwaterloo.ca or @mylaurier.ca email address.
        </div>
      )}

      {error === "auth-failed" && (
        <div role="alert" className={styles.error}>
          Authentication failed. Please try again.
        </div>
      )}

      {error === "init-failed" && (
        <div role="alert" className={styles.error}>
          Failed to set up your profile. Please try signing in again.
        </div>
      )}

      {error === "session-expired" && (
        <div role="alert" className={styles.error}>
          Your session has expired. Please sign in again.
        </div>
      )}

      {error === "refresh-failed" && (
        <div role="alert" className={styles.error}>
          We couldn&apos;t refresh your session. Please sign in again.
        </div>
      )}

      {error === "access_denied" && (
        <div role="alert" className={styles.error}>
          Sign-in was canceled. Try again when you&apos;re ready.
        </div>
      )}

      {error === "consent_required" && (
        <div role="alert" className={styles.error}>
          Additional permission is required from Microsoft. Please try again.
        </div>
      )}

      {reset === "1" && !error && (
        <div role="alert" className={styles.error}>
          Auth state cleared. Sign in to continue.
        </div>
      )}

      {oauthError && <p role="alert">{oauthError}</p>}
      <button
        className={styles.microsoftButton}
        disabled={oauthBusy}
        onClick={async () => {
          setOauthBusy(true); setOauthError(null);
          try { await signInWithMicrosoft(redirectTo || undefined); }
          catch { setOauthError("Could not start Microsoft sign-in. Please retry."); setOauthBusy(false); }
        }}
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="21"
          height="21"
          viewBox="0 0 21 21"
        >
          <rect x="1" y="1" width="9" height="9" fill="#f25022" />
          <rect x="11" y="1" width="9" height="9" fill="#7fba00" />
          <rect x="1" y="11" width="9" height="9" fill="#00a4ef" />
          <rect x="11" y="11" width="9" height="9" fill="#ffb900" />
        </svg>
        <span>Sign in with LEARN</span>
      </button>

      <div className={styles.divider}>
        <span>or</span>
      </div>

      {!showLaurierFlow ? (
        <button
          className={styles.laurierButton}
          onClick={() => setShowLaurierFlow(true)}
        >
          Sign in with @mylaurier.ca
        </button>
      ) : !otpSent ? (
        <div className={styles.otpFlow}>
          <div className={styles.emailInputGroup}>
            <input
              type="text"
              name="laurier-username"
              aria-label="Laurier username"
              className={styles.emailInput}
              placeholder="username"
              value={laurierUsername}
              onChange={(e) => setLaurierUsername(e.target.value.replace(/[@\s]/g, ""))}
              onKeyDown={(e) => e.key === "Enter" && handleSendOtp()}
              autoComplete="username"
            />
            <span className={styles.emailDomain}>@mylaurier.ca</span>
          </div>
          {laurierError && <div role="alert" className={styles.error}>{laurierError}</div>}
          <button
            className={styles.sendButton}
            onClick={handleSendOtp}
            disabled={sendingOtp}
          >
            {sendingOtp ? "Sending..." : "Send Code"}
          </button>
        </div>
      ) : (
        <div className={styles.otpFlow}>
          <p className={styles.otpHint}>
            Enter the 6-digit code sent to {laurierEmail}
          </p>
          <div
            className={styles.otpBoxes}
            onClick={() => otpRef.current?.focus()}
          >
            <input
              ref={otpRef}
              name="verification-code"
              aria-label="Six-digit verification code"
              type="text"
              className={styles.otpHiddenInput}
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={6}
              value={otpCode}
              onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ""))}
              onKeyDown={(e) => e.key === "Enter" && handleVerifyOtp()}
              onFocus={() => setOtpFocused(true)}
              onBlur={() => setOtpFocused(false)}
            />
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className={`${styles.otpDigit}${otpFocused && i === otpCode.length ? ` ${styles.otpDigitActive}` : ""}${otpCode[i] ? ` ${styles.otpDigitFilled}` : ""}`}
              >
                {otpCode[i] || ""}
              </div>
            ))}
          </div>
          {laurierError && <div role="alert" className={styles.error}>{laurierError}</div>}
          <button
            className={styles.sendButton}
            onClick={handleVerifyOtp}
            disabled={verifyingOtp}
          >
            {verifyingOtp ? "Verifying..." : "Verify"}
          </button>
          <button
            className={styles.backLink}
            onClick={() => {
              setOtpSent(false);
              setOtpCode("");
              setLaurierUsername("");
              setLaurierError(null);
            }}
          >
            Use a different email
          </button>
        </div>
      )}
    </div>
  );
}
