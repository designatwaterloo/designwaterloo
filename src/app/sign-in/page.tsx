"use client";

import { Suspense, useState } from "react";
import { useAuth } from "@/components/auth/AuthProvider";
import { isLaurierEmail } from "@/lib/supabase/auth-utils";
import { useSearchParams, useRouter } from "next/navigation";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import styles from "./page.module.css";

function SignInContent() {
  const { signInWithMicrosoft, signInWithLaurierOtp, verifyLaurierOtp, loading } = useAuth();
  const searchParams = useSearchParams();
  const error = searchParams.get("error");

  const [showLaurierFlow, setShowLaurierFlow] = useState(false);
  const [laurierEmail, setLaurierEmail] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [otpCode, setOtpCode] = useState("");
  const [laurierError, setLaurierError] = useState<string | null>(null);
  const [sendingOtp, setSendingOtp] = useState(false);
  const [verifyingOtp, setVerifyingOtp] = useState(false);

  const handleSendOtp = async () => {
    setLaurierError(null);
    if (!isLaurierEmail(laurierEmail)) {
      setLaurierError("Please enter a valid @mylaurier.ca email address.");
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

  const router = useRouter();

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

    // OTP verified — route the user the same way OAuth callback does
    const { createClient } = await import("@/lib/supabase/client");
    const supabase = createClient();

    const { data: member } = (await supabase
      .from("members")
      .select("slug, onboarding_completed")
      .eq("auth_user_id", user.id)
      .maybeSingle()) as { data: { slug: string; onboarding_completed: boolean } | null };

    if (member?.onboarding_completed) {
      router.push(`/directory/${member.slug}`);
      return;
    }

    // Check for migrated profile by email
    const { data: existingByEmail } = (await supabase
      .from("members")
      .select("id, slug, auth_user_id, onboarding_completed")
      .eq("school_email", user.email!)
      .maybeSingle()) as { data: { id: string; slug: string; auth_user_id: string | null; onboarding_completed: boolean } | null };

    if (existingByEmail && !existingByEmail.auth_user_id) {
      const { error: linkError } = await supabase
        .from("members")
        .update({ auth_user_id: user.id } as never)
        .eq("id", existingByEmail.id);
      if (linkError) {
        console.error("Failed to link migrated profile:", linkError);
        setLaurierError("Failed to link your profile. Please try again or contact support.");
        setVerifyingOtp(false);
        return;
      }
      router.push(`/directory/${existingByEmail.slug}`);
      return;
    }

    router.push("/onboarding");
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

      <button
        className={styles.microsoftButton}
        onClick={signInWithMicrosoft}
        disabled={loading}
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
          <input
            type="email"
            className={styles.emailInput}
            placeholder="you@mylaurier.ca"
            value={laurierEmail}
            onChange={(e) => setLaurierEmail(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSendOtp()}
          />
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
          <input
            type="text"
            className={styles.otpInput}
            placeholder="000000"
            maxLength={6}
            value={otpCode}
            onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ""))}
            onKeyDown={(e) => e.key === "Enter" && handleVerifyOtp()}
          />
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
