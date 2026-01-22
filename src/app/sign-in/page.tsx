"use client";

import { Suspense } from "react";
import { useAuth } from "@/components/auth/AuthProvider";
import { useSearchParams } from "next/navigation";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import styles from "./page.module.css";

function SignInContent() {
  const { signInWithMicrosoft, loading } = useAuth();
  const searchParams = useSearchParams();
  const error = searchParams.get("error");

  return (
    <div className={styles.content}>
      <h1 className={styles.title}>Join the Directory</h1>
      <p className={styles.description}>
        Sign in with your university Microsoft account to create your
        profile and join the Design Waterloo community.
      </p>

      {error === "invalid-email" && (
        <div className={styles.error}>
          Please sign in with a @uwaterloo.ca or @mylaurier.ca email
          address.
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
        <span>Sign in with Microsoft</span>
      </button>

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
