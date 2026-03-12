"use client";

import { useEffect } from "react";
import { useAuth } from "@/components/auth/AuthProvider";
import { useTransition } from "@/context/TransitionContext";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

export default function PendingApprovalPage() {
  const { member, loading } = useAuth();
  const { startTransition } = useTransition();

  useEffect(() => {
    // If member is approved, redirect to their profile
    if (!loading && member?.is_approved) {
      startTransition(`/directory/${member.slug}`);
    }
  }, [loading, member, startTransition]);

  if (loading) {
    return (
      <div>
        <Header />
        <main className="w-full min-h-[60vh] flex items-center justify-center">
          <p>Loading...</p>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div>
      <Header />
      <main className="w-full min-h-[60vh] flex items-center justify-center">
        <section className="w-full max-w-xl px-(--margin) py-12 text-center">
          <h1 className="text-3xl font-bold mb-4">Profile Submitted!</h1>
          <p className="text-lg text-muted-text mb-6">
            Your profile has been submitted and is pending approval from an admin.
            You&apos;ll be able to see your profile in the directory once it&apos;s approved.
          </p>
          <p className="text-sm text-muted-text">
            In the meantime, you can still edit your profile from the menu.
          </p>
        </section>
      </main>
      <Footer />
    </div>
  );
}
