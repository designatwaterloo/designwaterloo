"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/auth/AuthProvider";
import Link from "@/components/Link";
import AccountWorkspace from "./AccountWorkspace";

export default function DashboardPage() {
  const { user, member, loading: authLoading } = useAuth();
  const router = useRouter();
  const [showFallback, setShowFallback] = useState(false);

  const hasMember = !!member;

  useEffect(() => {
    if (authLoading) return;

    // Replace recovery routes so Back does not return to a stale loading screen.
    if (!user) {
      router.replace("/sign-in");
      return;
    }

    if (!hasMember) {
      router.replace("/welcome");
    }
  }, [authLoading, user, hasMember, router]);

  // Show a manual escape hatch if we've been stuck on Loading for too long.
  useEffect(() => {
    if (!authLoading && user && member) {
      setShowFallback(false);
      return;
    }
    const t = setTimeout(() => setShowFallback(true), 3000);
    return () => clearTimeout(t);
  }, [authLoading, user, member]);

  if (authLoading || !user || !member) {
    return (
      <div>
        <main data-account-workspace className="w-full min-h-[60vh] flex flex-col items-center justify-center gap-4">
          <p>Loading...</p>
          {showFallback && (
            <div className="flex flex-col items-center gap-2 text-sm opacity-70">
              <p>Trouble loading?</p>
              <div className="flex gap-3">
                <Link href="/sign-in" className="underline">Sign in</Link>
                {/* Full navigation resets both server cookies and the in-memory auth store. */}
                {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
                <a href="/auth/reset" className="underline">Reset auth state</a>
              </div>
            </div>
          )}
        </main>
      </div>
    );
  }

  return <AccountWorkspace member={member} />;
}
