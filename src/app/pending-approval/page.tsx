"use client";

import { useEffect } from "react";
import { useTransition } from "@/context/TransitionContext";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

export default function PendingApprovalPage() {
  const { startTransition } = useTransition();

  useEffect(() => {
    startTransition("/dashboard");
  }, [startTransition]);

  return (
    <div>
      <Header />
      <main className="w-full min-h-[60vh] flex items-center justify-center">
        <p>Redirecting to your dashboard...</p>
      </main>
      <Footer />
    </div>
  );
}
