"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useAuth } from "@/components/auth/AuthProvider";
import { useTransition } from "@/context/TransitionContext";
import { createClient } from "@/lib/supabase/client";
import { getSchoolFromEmail, generateSlug } from "@/lib/supabase/auth-utils";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import styles from "./page.module.css";

export default function EditProfilePage() {
  const { user, member, loading: authLoading, refreshMember } = useAuth();
  const { startTransition } = useTransition();
  const supabase = createClient();

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Loader state — starts visible immediately, plays once
  const [loaderPhase, setLoaderPhase] = useState(1); // 1 = first line visible immediately, 5 = done
  const loaderStarted = useRef(false);
  const rowCreated = useRef(false);

  // Form state
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [program, setProgram] = useState("");
  const [graduatingClass, setGraduatingClass] = useState("");

  // Derived
  const school = user?.email ? getSchoolFromEmail(user.email) : null;
  const fullName = (user?.user_metadata?.full_name as string) || null;

  // Redirect if not authenticated
  useEffect(() => {
    if (!authLoading && !user) {
      startTransition("/sign-in");
    }
  }, [authLoading, user, startTransition]);

  // If member exists AND onboarding is completed, redirect to profile
  useEffect(() => {
    if (!authLoading && member?.onboarding_completed) {
      startTransition(`/directory/${member.slug}`);
    }
  }, [authLoading, member, startTransition]);

  // Pre-fill form from OAuth metadata or existing draft member
  useEffect(() => {
    if (authLoading) return;

    if (member && !member.onboarding_completed) {
      // Draft row exists — populate form from it
      setFirstName(member.first_name || "");
      setLastName(member.last_name || "");
      setProgram(member.program || "");
      setGraduatingClass(member.graduating_class || "");
    } else if (user && !member && fullName) {
      // No member yet — pre-fill from OAuth
      const parts = fullName.trim().split(/\s+/);
      if (parts.length >= 2) {
        setFirstName(parts[0]);
        setLastName(parts.slice(1).join(" "));
      } else if (parts.length === 1) {
        setFirstName(parts[0]);
      }
    }
  }, [authLoading, user, member, fullName]);

  // Create draft member row during loader
  const createDraftRow = useCallback(async () => {
    if (!user?.email || rowCreated.current) return;
    rowCreated.current = true;

    // Check if a draft row already exists for this user
    const { data: existingMember } = await supabase
      .from("members")
      .select("id")
      .eq("auth_user_id", user.id)
      .maybeSingle();

    if (existingMember) {
      // Draft already exists — just make sure AuthProvider has it
      await refreshMember();
      return;
    }

    const nameFromOAuth = fullName?.trim().split(/\s+/) || [];
    const draftFirst = nameFromOAuth[0] || "";
    const draftLast = nameFromOAuth.length >= 2 ? nameFromOAuth.slice(1).join(" ") : "";

    // Need at least a first name to generate a slug
    if (!draftFirst) return;

    const slug = generateSlug(draftFirst, draftLast || "member");

    const { data: existingSlug } = await supabase
      .from("members")
      .select("slug")
      .eq("slug", slug)
      .maybeSingle();

    const finalSlug = existingSlug
      ? `${slug}-${Date.now().toString(36)}`
      : slug;

    const { error: insertError } = await supabase
      .from("members")
      .insert({
        auth_user_id: user.id,
        first_name: draftFirst,
        last_name: draftLast,
        slug: finalSlug,
        school_email: user.email,
        school: school,
        onboarding_completed: false,
        is_approved: false,
      } as never);

    if (insertError) {
      console.error("[Onboarding] Failed to create draft row:", insertError);
      return;
    }

    await refreshMember();
  }, [user, fullName, school, supabase, refreshMember]);

  // If member appears while loader is playing, skip to form
  useEffect(() => {
    if (member && loaderPhase > 0 && loaderPhase < 5) {
      setLoaderPhase(5);
    }
  }, [member, loaderPhase]);

  // Run loader sequence once when auth is ready
  useEffect(() => {
    if (authLoading || loaderStarted.current) return;
    // Skip loader if member already exists (returning to this page)
    if (member) {
      setLoaderPhase(5);
      return;
    }

    loaderStarted.current = true;
    const timers: ReturnType<typeof setTimeout>[] = [];

    // Phase 1 is already visible immediately
    timers.push(setTimeout(() => setLoaderPhase(2), 1200));
    timers.push(setTimeout(() => setLoaderPhase(3), 2400));

    // Create the draft row while the loader is playing
    timers.push(setTimeout(() => {
      createDraftRow();
    }, 1200));

    timers.push(setTimeout(() => setLoaderPhase(4), 3600));
    timers.push(setTimeout(() => setLoaderPhase(5), 4800));

    return () => timers.forEach(clearTimeout);
  }, [authLoading, member, createDraftRow]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log("[Onboarding] handleSubmit called, user:", user?.email, "member:", member?.id, "firstName:", firstName, "lastName:", lastName);
    if (!user?.email) {
      console.log("[Onboarding] No user email, bailing");
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const newSlug = generateSlug(firstName, lastName);
      console.log("[Onboarding] Generated slug:", newSlug, "member exists:", !!member);

      if (member) {
        // Draft row exists — update it
        let finalSlug = member.slug;

        if (newSlug !== member.slug) {
          const { data: existingSlug } = await supabase
            .from("members")
            .select("slug")
            .eq("slug", newSlug)
            .neq("id", member.id)
            .maybeSingle();

          finalSlug = existingSlug
            ? `${newSlug}-${Date.now().toString(36)}`
            : newSlug;
        }

        console.log("[Onboarding] Updating member", member.id, "with slug:", finalSlug);
        const { data: { session } } = await supabase.auth.getSession();
        const res = await fetch(
          `${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/members?id=eq.${member.id}`,
          {
            method: "PATCH",
            headers: {
              "Content-Type": "application/json",
              apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
              Authorization: `Bearer ${session?.access_token}`,
              Prefer: "return=minimal",
            },
            body: JSON.stringify({
              first_name: firstName,
              last_name: lastName,
              slug: finalSlug,
              program: program || null,
              graduating_class: graduatingClass || null,
              onboarding_completed: true,
            }),
          }
        );
        console.log("[Onboarding] Update result, status:", res.status);

        if (!res.ok) {
          const text = await res.text();
          setError(`Failed to save: ${text}`);
          setSaving(false);
          return;
        }

        await refreshMember();
        window.location.href = `/directory/${finalSlug}`;
      } else {
        // No draft row — create fresh
        console.log("[Onboarding] Checking slug availability...");
        const { data: existingSlug } = await supabase
          .from("members")
          .select("slug")
          .eq("slug", newSlug)
          .maybeSingle();
        console.log("[Onboarding] Slug check done, exists:", !!existingSlug);

        const finalSlug = existingSlug
          ? `${newSlug}-${Date.now().toString(36)}`
          : newSlug;

        console.log("[Onboarding] Inserting with slug:", finalSlug);
        const { error: insertError } = await supabase
          .from("members")
          .insert({
            auth_user_id: user.id,
            first_name: firstName,
            last_name: lastName,
            slug: finalSlug,
            school_email: user.email,
            school: school,
            program: program || null,
            graduating_class: graduatingClass || null,
            onboarding_completed: true,
            is_approved: false,
          } as never);
        console.log("[Onboarding] Insert done, error:", insertError);

        if (insertError) {
          setError(`Failed to create profile: ${insertError.message}`);
          setSaving(false);
          return;
        }

        await refreshMember();
        window.location.href = `/directory/${finalSlug}`;
      }
    } catch (err) {
      console.error("[Onboarding] Error:", err);
      setError("Something went wrong. Please try again.");
      setSaving(false);
    }
  };

  // Show loader (plays once, never re-triggers)
  if (loaderPhase < 5) {
    return (
      <div>
        <Header />
        <main className="w-full min-h-[60vh] flex items-center justify-center">
          <div className={styles.loader}>
            <p className={`${styles.loaderLine} ${loaderPhase >= 1 ? styles.loaderLineVisible : ""}`}>
              Connecting to your account...
            </p>
            <p className={`${styles.loaderLine} ${loaderPhase >= 2 ? styles.loaderLineVisible : ""}`}>
              {fullName ? `Found you \u2014 ${fullName}` : "Setting things up..."}
            </p>
            <p className={`${styles.loaderLine} ${loaderPhase >= 3 ? styles.loaderLineVisible : ""}`}>
              {school || "Detecting your school..."}
            </p>
            <p className={`${styles.loaderLine} ${loaderPhase >= 4 ? styles.loaderLineVisible : ""}`}>
              Getting everything ready...
            </p>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  // Member completed onboarding — redirect happening
  if (member?.onboarding_completed) {
    return (
      <div>
        <Header />
        <main className="w-full min-h-[60vh] flex items-center justify-center">
          <p>Redirecting to your profile...</p>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div>
      <Header />
      <main className="w-full">
        <section className="w-full px-(--margin) py-12 flex flex-col gap-8">
          <div className={styles.header}>
            <h1>Welcome to Design Waterloo</h1>
            <p className={styles.subtitle}>
              Confirm your details to get started. You&apos;ll be able to fill out the rest of your profile next.
            </p>
          </div>

          {error && <div className={styles.error}>{error}</div>}

          <form onSubmit={handleSubmit} className={styles.form}>
            <div className={styles.section}>
              <div className={styles.fieldGroup}>
                <div className={styles.field}>
                  <label htmlFor="firstName">First Name *</label>
                  <input
                    id="firstName"
                    type="text"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    required
                  />
                </div>

                <div className={styles.field}>
                  <label htmlFor="lastName">Last Name *</label>
                  <input
                    id="lastName"
                    type="text"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className={styles.field}>
                <label>School</label>
                <input type="text" value={school || ""} disabled />
                <span className={styles.hint}>
                  Detected from your email ({user?.email})
                </span>
              </div>

              <div className={styles.fieldGroup}>
                <div className={styles.field}>
                  <label htmlFor="program">Program</label>
                  <input
                    id="program"
                    type="text"
                    value={program}
                    onChange={(e) => setProgram(e.target.value)}
                    placeholder="e.g., Systems Design Engineering"
                  />
                </div>

                <div className={styles.field}>
                  <label htmlFor="graduatingClass">Graduating Year</label>
                  <input
                    id="graduatingClass"
                    type="text"
                    value={graduatingClass}
                    onChange={(e) => setGraduatingClass(e.target.value)}
                    placeholder="e.g., 2026"
                  />
                </div>
              </div>
            </div>

            <div className={styles.actions}>
              <button
                type="submit"
                className={styles.primaryButton}
                disabled={saving || !firstName || !lastName}
              >
                {saving ? "Creating profile..." : "Continue"}
              </button>
            </div>
          </form>
        </section>
      </main>
      <Footer />
    </div>
  );
}
