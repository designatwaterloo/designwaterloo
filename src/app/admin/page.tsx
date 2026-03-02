"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/auth/AuthProvider";
import { createClient } from "@/lib/supabase/client";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import Link from "@/components/Link";
import type { Member } from "@/types/database";
import styles from "./page.module.css";

export default function AdminPage() {
  const { member, loading: authLoading } = useAuth();
  const router = useRouter();
  const supabase = createClient();

  const [pendingMembers, setPendingMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && (!member || !member.is_admin)) {
      router.push("/");
    }
  }, [authLoading, member, router]);

  useEffect(() => {
    const fetchPendingMembers = async () => {
      const { data } = await supabase
        .from("members")
        .select("*")
        .eq("onboarding_completed", true)
        .eq("is_approved", false)
        .order("created_at", { ascending: false });

      setPendingMembers((data || []) as Member[]);
      setLoading(false);
    };

    if (member?.is_admin) {
      fetchPendingMembers();
    }
  }, [member, supabase]);

  const handleApprove = async (memberId: string) => {
    setActionLoading(memberId);
    const { error } = await supabase
      .from("members")
      .update({ is_approved: true } as never)
      .eq("id", memberId);

    if (!error) {
      setPendingMembers((prev) => prev.filter((m) => m.id !== memberId));
    }
    setActionLoading(null);
  };

  const handleReject = async (memberId: string) => {
    if (!confirm("Are you sure you want to reject and delete this member?")) {
      return;
    }

    setActionLoading(memberId);
    const { error } = await supabase
      .from("members")
      .delete()
      .eq("id", memberId);

    if (!error) {
      setPendingMembers((prev) => prev.filter((m) => m.id !== memberId));
    }
    setActionLoading(null);
  };

  if (authLoading || !member?.is_admin) {
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
      <main className="w-full">
        <section className={styles.section}>
          <h1>Admin Dashboard</h1>
          <p className={styles.subtitle}>
            Manage member approvals and site content.
          </p>

          <div className={styles.card}>
            <h2>Pending Approvals ({pendingMembers.length})</h2>
            {loading ? (
              <p>Loading pending members...</p>
            ) : pendingMembers.length === 0 ? (
              <p className={styles.empty}>No pending approvals</p>
            ) : (
              <div className={styles.memberList}>
                {pendingMembers.map((m) => (
                  <div key={m.id} className={styles.memberItem}>
                    <div className={styles.memberInfo}>
                      <p className={styles.memberName}>
                        {m.first_name} {m.last_name}
                      </p>
                      <p className={styles.memberEmail}>{m.school_email}</p>
                      <p className={styles.memberSchool}>{m.school}</p>
                      {m.program && (
                        <p className={styles.memberProgram}>{m.program}</p>
                      )}
                    </div>
                    <div className={styles.memberActions}>
                      <Link
                        href={`/directory/${m.slug}`}
                        className={styles.previewLink}
                      >
                        Preview
                      </Link>
                      <button
                        onClick={() => handleApprove(m.id)}
                        disabled={actionLoading === m.id}
                        className={styles.approveButton}
                      >
                        {actionLoading === m.id ? "..." : "Approve"}
                      </button>
                      <button
                        onClick={() => handleReject(m.id)}
                        disabled={actionLoading === m.id}
                        className={styles.rejectButton}
                      >
                        {actionLoading === m.id ? "..." : "Reject"}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
