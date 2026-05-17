"use client";

import { Suspense, useRef, useState } from "react";
import { useAuth } from "@/components/auth/AuthProvider";
import { isLaurierEmail } from "@/lib/supabase/auth-utils";
import { useSearchParams } from "next/navigation";
import { useTransition } from "@/context/TransitionContext";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import styles from "./page.module.css";

function SignInContent() {
  const { signInWithMicrosoft, signInWithLaurierOtp, verifyLaurierOtp, loading } = useAuth();
  const searchParams = useSearchParams();
  const error = searchParams.get("error");
  const reset = searchParams.get("reset");
  const redirectTo = searchParams.get("redirectTo");

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
    setSendingOtp(true);
    const { error } = await signInWithLaurierOtp(laurierEmail);
    setSendingOtp(false);
    if (error) {
      setLaurierError(error);
      return;
    }
    setOtpSent(true);
  };

  const { startTransition } = useTransition();

  const handleVerifyOtp = async () => {
    setLaurierError(null);
    if (otpCode.length !== 6) {
      setLaurierError("Please enter the 6-digit code.");
      return;
    }
    setVerifyingOtp(true);
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
      const result = await findOrInitMember(supabase, user.id, user.email!);
      if (result.onboardingCompleted) {
        startTransition(redirectTo || `/directory/${result.slug}`);
      } else {
        startTransition(redirectTo || "/profile/edit");
      }
    } catch (err) {
      console.error("[OTP] Failed to initialise member record:", err);
      setLaurierError("Something went wrong. Please try again.");
      setVerifyingOtp(false);
    }
  };

  return (
    <div className={styles.content}>
      <h1 className={styles.title}>Join the Directory</h1>
      <p className={styles.description}>
        Sign in with your university account to create your profile and join the
        Design Waterloo community.
      </p>

      {error === "invalid-email" && (
        <div className={styles.error}>
          Please sign in with a @uwaterloo.ca or @mylaurier.ca email address.
        </div>
      )}

      {error === "auth-failed" && (
        <div className={styles.error}>
          Authentication failed. Please try again.
        </div>
      )}

      {error === "init-failed" && (
        <div className={styles.error}>
          Failed to set up your profile. Please try signing in again.
        </div>
      )}

      {error === "session-expired" && (
        <div className={styles.error}>
          Your session has expired. Please sign in again.
        </div>
      )}

      {error === "refresh-failed" && (
        <div className={styles.error}>
          We couldn&apos;t refresh your session. Please sign in again.
        </div>
      )}

      {error === "access_denied" && (
        <div className={styles.error}>
          Sign-in was canceled. Try again when you&apos;re ready.
        </div>
      )}

      {error === "consent_required" && (
        <div className={styles.error}>
          Additional permission is required from Microsoft. Please try again.
        </div>
      )}

      {reset === "1" && !error && (
        <div className={styles.error}>
          Auth state cleared. Sign in to continue.
        </div>
      )}

      <button
        className={styles.microsoftButton}
        onClick={() => signInWithMicrosoft(redirectTo || undefined)}
        disabled={loading}
        data-cursor="button"
        data-cursor-label="UWaterloo SSO →"
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
          data-cursor="button"
          data-cursor-label="Email Code →"
        >
          Sign in with @mylaurier.ca
        </button>
      ) : !otpSent ? (
        <div className={styles.otpFlow}>
          <div className={styles.emailInputGroup}>
            <input
              type="text"
              className={styles.emailInput}
              placeholder="username"
              value={laurierUsername}
              onChange={(e) => setLaurierUsername(e.target.value.replace(/[@\s]/g, ""))}
              onKeyDown={(e) => e.key === "Enter" && handleSendOtp()}
              autoComplete="username"
            />
            <span className={styles.emailDomain}>@mylaurier.ca</span>
          </div>
          {laurierError && <div className={styles.error}>{laurierError}</div>}
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
            data-cursor="text"
            data-cursor-label="Enter Code"
          >
            <input
              ref={otpRef}
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
          {laurierError && <div className={styles.error}>{laurierError}</div>}
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

      <p className={styles.hint}>
        Use your @uwaterloo.ca or @mylaurier.ca email
      </p>

      <p className={styles.hint} style={{ marginTop: "1rem", opacity: 0.6 }}>
        Having trouble?{" "}
        <a href="/auth/reset" style={{ textDecoration: "underline" }}>
          Reset auth state
        </a>
      </p>
    </div>
  );
}

export default function SignInPage() {
  return (
    <div>
      <Header />
      <main className="w-full">
        <section className="w-full px-(--margin) py-12 flex flex-col gap-8 min-h-[60vh] justify-center items-center">
          <Suspense fallback={<div className={styles.content}>Loading...</div>}>
            <SignInContent />
          </Suspense>
        </section>
      </main>
      <Footer />
    </div>
  );
}
