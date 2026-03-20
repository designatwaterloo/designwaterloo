"use client";

import { Suspense, useState } from "react";
import { useAuth } from "@/components/auth/AuthProvider";
import { isLaurierEmail, getSchoolFromEmail, generateSlug } from "@/lib/supabase/auth-utils";
import { useSearchParams } from "next/navigation";
import { useTransition } from "@/context/TransitionContext";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import styles from "./page.module.css";

function SignInContent() {
  const { signInWithMicrosoft, signInWithLaurierOtp, verifyLaurierOtp, loading } = useAuth();
  const searchParams = useSearchParams();
  const error = searchParams.get("error");
  const redirectTo = searchParams.get("redirectTo");

  const [showLaurierFlow, setShowLaurierFlow] = useState(false);
  const [laurierUsername, setLaurierUsername] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [otpCode, setOtpCode] = useState("");
  const [laurierError, setLaurierError] = useState<string | null>(null);
  const [sendingOtp, setSendingOtp] = useState(false);
  const [verifyingOtp, setVerifyingOtp] = useState(false);

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

    // OTP verified — route the user the same way OAuth callback does
    const { createClient } = await import("@/lib/supabase/client");
    const supabase = createClient();

    const { data: member } = (await supabase
      .from("members")
      .select("slug, onboarding_completed")
      .eq("auth_user_id", user.id)
      .maybeSingle()) as { data: { slug: string; onboarding_completed: boolean } | null };

    if (member?.onboarding_completed) {
      startTransition(redirectTo || `/directory/${member.slug}`);
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
      startTransition(redirectTo || `/directory/${existingByEmail.slug}`);
      return;
    }

    // No existing profile — create draft member (same as OAuth callback)
    if (!member && !existingByEmail) {
      try {
        const email = user.email!;
        const school = getSchoolFromEmail(email);
        const emailPrefix = email.split("@")[0].replace(/\./g, "-");
        const baseSlug = generateSlug(emailPrefix, "");

        // Check slug availability
        let finalSlug = baseSlug || "member";
        const { data: slugTaken } = await supabase
          .from("members")
          .select("slug")
          .eq("slug", finalSlug)
          .maybeSingle();

        if (slugTaken) {
          const { data: similar } = await supabase
            .from("members")
            .select("slug")
            .like("slug", `${finalSlug}%`);

          const escaped = finalSlug.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
          const pattern = new RegExp(`^${escaped}-(\\d+)$`);
          let maxN = 0;
          for (const s of (similar || []) as { slug: string }[]) {
            const m = s.slug.match(pattern);
            if (m) maxN = Math.max(maxN, parseInt(m[1], 10));
          }
          finalSlug = `${finalSlug}-${maxN + 1}`;
        }

        await supabase.from("members").insert({
          auth_user_id: user.id,
          first_name: null,
          last_name: null,
          slug: finalSlug,
          school_email: email,
          school,
          onboarding_completed: false,
          is_approved: false,
          review_status: "draft",
        } as never);
      } catch (err) {
        console.error("Failed to create draft member for OTP user:", err);
      }
    }

    startTransition("/profile/edit");
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
        onClick={() => signInWithMicrosoft(redirectTo || undefined)}
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
