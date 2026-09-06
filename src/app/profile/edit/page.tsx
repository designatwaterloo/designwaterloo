"use client";

import { useEffect, useState, useRef, useCallback, useMemo } from "react";
import { useAuth } from "@/components/auth/AuthProvider";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { findOrInitMember } from "@/lib/supabase/member-init";
import { getSchoolFromEmail, generateSlug } from "@/lib/supabase/auth-utils";
import { validateUsername } from "@/lib/usernames";
import { PROGRAMS } from "@/data/programs";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import styles from "./page.module.css";

// ─── Slug helpers ───

function useSupabase() {
  return useMemo(() => createClient(), []);
}

export default function EditProfilePage() {
  const { user, member, loading: authLoading, refreshMember } = useAuth();
  const router = useRouter();
  const supabase = useSupabase();

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [needsUsernamePrompt, setNeedsUsernamePrompt] = useState(false);
  const submittingRef = useRef(false);

  // Loader
  const [loaderPhase, setLoaderPhase] = useState(1);
  const loaderStarted = useRef(false);
  const rowCreated = useRef(false);

  // Form
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [program, setProgram] = useState("");
  const [graduatingClass, setGraduatingClass] = useState("");

  // Program combobox
  const [programSearch, setProgramSearch] = useState("");
  const [programOpen, setProgramOpen] = useState(false);
  const programRef = useRef<HTMLDivElement>(null);

  // Slug
  const [slug, setSlug] = useState("");
  const [slugManuallyEdited, setSlugManuallyEdited] = useState(false);
  const [slugStatus, setSlugStatus] = useState<
    "idle" | "checking" | "available" | "taken"
  >("idle");
  const slugCheckRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  // Derived
  const school = user?.email ? getSchoolFromEmail(user.email) : null;
  const fullName = (user?.user_metadata?.full_name as string) || null;
  const schoolPrograms = school ? PROGRAMS[school] ?? [] : [];
  const filteredPrograms = schoolPrograms.filter(
    (p) => p.toLowerCase().includes(programSearch.toLowerCase())
  );

  // Close program dropdown on outside click
  useEffect(() => {
    if (!programOpen) return;
    const handleClick = (e: MouseEvent) => {
      if (programRef.current && !programRef.current.contains(e.target as Node)) {
        setProgramOpen(false);
        setProgramSearch("");
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [programOpen]);

  // Redirect if not authenticated
  useEffect(() => {
    if (!authLoading && !user) router.push("/sign-in");
  }, [authLoading, user, router]);

  // If member exists AND onboarding is completed, redirect (unless we're mid-submit)
  useEffect(() => {
    if (!authLoading && member?.onboarding_completed && !submittingRef.current) {
      router.push("/dashboard");
    }
  }, [authLoading, member, router]);

  // Pre-fill form from OAuth metadata or existing draft member
  useEffect(() => {
    if (authLoading) return;
    if (member) {
      // Prefill from existing member (draft or completed — covers backtracking)
      console.log("[Onboarding] Prefill from member:", member.slug);
      setFirstName(member.first_name || "");
      setLastName(member.last_name || "");
      setProgram(member.program || "");
      setGraduatingClass(member.graduating_class || "");
      setSlug(member.slug || "");
      setSlugManuallyEdited(true);
      setSlugStatus("available");
      setNeedsUsernamePrompt(member.slug_confirmed === false);
    } else if (user && !member && fullName) {
      console.log("[Onboarding] Prefill from OAuth name:", fullName);
      const parts = fullName.trim().split(/\s+/);
      if (parts.length >= 2) {
        setFirstName(parts[0]);
        setLastName(parts.slice(1).join(" "));
      } else if (parts.length === 1) {
        setFirstName(parts[0]);
      }
    }
  }, [authLoading, user, member, fullName]);

  // ─── Slug helpers using Supabase client ───

  const findAvailableSlug = useCallback(
    async (baseSlug: string, excludeId?: string): Promise<string> => {
      // Fast path: check exact match first
      let query = supabase
        .from("members")
        .select("slug")
        .eq("slug", baseSlug);
      if (excludeId) query = query.neq("id", excludeId);
      const { data: exact } = await query;
      if (!exact || exact.length === 0) return baseSlug;

      // Slug is taken — find next available variant
      let likeQuery = supabase
        .from("members")
        .select("slug")
        .like("slug", `${baseSlug}%`);
      if (excludeId) likeQuery = likeQuery.neq("id", excludeId);
      const { data: similar } = await likeQuery;

      const escaped = baseSlug.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const pattern = new RegExp(`^${escaped}-(\\d+)$`);
      let maxN = 0;
      for (const s of similar || []) {
        const m = s.slug.match(pattern);
        if (m) maxN = Math.max(maxN, parseInt(m[1], 10));
      }
      return `${baseSlug}-${maxN + 1}`;
    },
    [supabase]
  );

  const checkSlugTaken = useCallback(
    async (slugVal: string, excludeId?: string): Promise<boolean> => {
      let query = supabase
        .from("members")
        .select("slug")
        .eq("slug", slugVal);
      if (excludeId) query = query.neq("id", excludeId);
      const { data } = await query;
      return (data?.length ?? 0) > 0;
    },
    [supabase]
  );

  // Auto-generate slug from name changes
  useEffect(() => {
    if (slugManuallyEdited || !firstName) return;
    const baseSlug = generateSlug(firstName, lastName);
    if (!baseSlug) return;

    console.log("[Slug] Auto-setting from name:", baseSlug);
    setSlug(baseSlug);
    setSlugStatus("checking");

    if (slugCheckRef.current) clearTimeout(slugCheckRef.current);
    let cancelled = false;

    slugCheckRef.current = setTimeout(async () => {
      try {
        const available = await findAvailableSlug(baseSlug, member?.id);
        if (!cancelled) {
          console.log("[Slug] Auto resolved:", available);
          setSlug(available);
          setSlugStatus("available");
        }
      } catch (err) {
        console.error("[Slug] Auto check error:", err);
        if (!cancelled) setSlugStatus("available"); // optimistic
      }
    }, 300);

    return () => {
      cancelled = true;
      if (slugCheckRef.current) clearTimeout(slugCheckRef.current);
    };
  }, [firstName, lastName, slugManuallyEdited, member, findAvailableSlug]);

  // Manual slug edit
  const handleSlugChange = (rawValue: string) => {
    const value = rawValue
      .toLowerCase()
      .replace(/[^a-z0-9-]/g, "")
      .replace(/-+/g, "-");
    setSlug(value);
    setSlugManuallyEdited(true);

    if (slugCheckRef.current) clearTimeout(slugCheckRef.current);
    if (!value) { setSlugStatus("idle"); return; }

    // Synchronous validity gate before scheduling the availability network check.
    const check = validateUsername(value);
    if (!check.ok) {
      setSlugStatus("taken");
      setError(check.error ?? null);
      return;
    }
    setError(null);

    setSlugStatus("checking");
    slugCheckRef.current = setTimeout(async () => {
      if (member?.slug === value) { setSlugStatus("available"); return; }
      try {
        const taken = await checkSlugTaken(value, member?.id);
        setSlugStatus(taken ? "taken" : "available");
      } catch {
        setSlugStatus("available");
      }
    }, 400);
  };

  // Refresh the shared profile snapshot after account initialization.
  const safeRefresh = useCallback(async () => {
    await refreshMember();
  }, [refreshMember]);

  // Create draft member row during loader — delegates to shared findOrInitMember
  const createDraftRow = useCallback(async () => {
    if (!user?.email || rowCreated.current) return;
    rowCreated.current = true;

    try {
      await findOrInitMember(supabase);
      await safeRefresh();
    } catch (err) {
      rowCreated.current = false;
      setError(err instanceof Error ? err.message : "Could not set up your profile. Please retry.");
    }

  }, [user, supabase, safeRefresh]);

  // Skip loader if member appears
  useEffect(() => {
    if (member && loaderPhase > 0 && loaderPhase < 5) setLoaderPhase(5);
  }, [member, loaderPhase]);

  // Run loader
  useEffect(() => {
    if (authLoading || loaderStarted.current) return;
    if (member) { setLoaderPhase(5); return; }
    loaderStarted.current = true;
    const timers: ReturnType<typeof setTimeout>[] = [];
    timers.push(setTimeout(() => setLoaderPhase(2), 1200));
    timers.push(setTimeout(() => setLoaderPhase(3), 2400));
    createDraftRow();
    timers.push(setTimeout(() => setLoaderPhase(4), 3600));
    timers.push(setTimeout(() => setLoaderPhase(5), 4800));
    return () => timers.forEach(clearTimeout);
  }, [authLoading, member, createDraftRow]);

  // ─── Submit ───

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.email) return;
    if (!slug) { setError("Profile URL is required."); return; }
    if (slugStatus === "taken") {
      setError("This profile URL is already taken.");
      return;
    }

    setSaving(true);
    setError(null);
    submittingRef.current = true;

    console.log("[Onboarding] handleSubmit — slug:", slug, "member:", member?.id);

    try {
      const usernameCheck = validateUsername(slug);
      if (!usernameCheck.ok) {
        setError(usernameCheck.error ?? "Invalid username.");
        setSaving(false);
        return;
      }
      const finalSlug = usernameCheck.normalized;

      const updatePayload = {
        first_name: firstName,
        last_name: lastName,
        slug: finalSlug,
        slug_confirmed: true,
        program: program || null,
        graduating_class: graduatingClass || null,
        onboarding_completed: true,
      };

      // Resolve the one account row first; never infer permission to insert from a failed read.
      await findOrInitMember(supabase);
      const { data, error: updateErr } = await supabase.from("members")
        .update(updatePayload).eq("auth_user_id", user.id).select("id").single();
      if (updateErr || !data) throw new Error(updateErr?.message ?? "Profile could not be saved. Please retry.");
      await refreshMember();
      window.location.assign(`/directory/${finalSlug}`);

    } catch (err) {
      console.error("[Onboarding] Unexpected error:", err);
      setError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
      setSaving(false);
      submittingRef.current = false;
    }
  };

  // ─── Render ───

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
              Confirm your details to get started. You&apos;ll be able to fill
              out the rest of your profile next.
            </p>
          </div>

          {error && <div className={styles.error}>{error}</div>}

          <form onSubmit={handleSubmit} className={styles.form}>
            <div className={styles.section}>
              <div className={styles.fieldGroup}>
                <div className={styles.field}>
                  <label htmlFor="firstName">First Name *</label>
                  <input id="firstName" type="text" value={firstName}
                    onChange={(e) => setFirstName(e.target.value)} required />
                </div>
                <div className={styles.field}>
                  <label htmlFor="lastName">Last Name *</label>
                  <input id="lastName" type="text" value={lastName}
                    onChange={(e) => setLastName(e.target.value)} required />
                </div>
              </div>

              {needsUsernamePrompt && (
                <p className={styles.hint}>
                  Pick the username for your public profile URL — you can change
                  it anytime.
                </p>
              )}

              <div className={styles.field}>
                <label htmlFor="slug">Profile URL</label>
                <div className={styles.slugInput}>
                  <span className={styles.slugPrefix}>/directory/</span>
                  <input id="slug" type="text" value={slug}
                    onChange={(e) => handleSlugChange(e.target.value)}
                    placeholder="your-profile-url" required />
                </div>
                <span className={
                  slugStatus === "available" ? styles.hintSuccess
                    : slugStatus === "taken" ? styles.hintError
                    : slugStatus === "checking" ? styles.hintChecking
                    : styles.hint
                }>
                  {slugStatus === "checking" && (
                    <span className={styles.spinner} />
                  )}
                  {slugStatus === "checking" ? "Checking availability..."
                    : slugStatus === "available" ? "Available"
                    : slugStatus === "taken" ? "Already taken — choose a different URL"
                    : "This will be your profile link"}
                </span>
              </div>

              <div className={styles.field}>
                <label>School</label>
                <input type="text" value={school || ""} disabled />
                <span className={styles.hint}>
                  Detected from your email ({user?.email})
                </span>
              </div>

              <div className={styles.fieldGroup}>
                <div className={styles.field} ref={programRef}>
                  <label htmlFor="program">Program</label>
                  <div className={styles.programInputWrapper}>
                    <input
                      id="program"
                      type="text"
                      value={programOpen ? programSearch : program}
                      onChange={(e) => {
                        setProgramSearch(e.target.value);
                        setProgramOpen(true);
                      }}
                      onFocus={() => {
                        setProgramSearch("");
                        setProgramOpen(true);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === "Tab" && programOpen && filteredPrograms.length > 0) {
                          e.preventDefault();
                          setProgram(filteredPrograms[0]);
                          setProgramOpen(false);
                          setProgramSearch("");
                        }
                      }}
                      placeholder="Search programs..."
                      autoComplete="off"
                    />
                    {programOpen && programSearch && filteredPrograms.length > 0 &&
                      filteredPrograms[0].toLowerCase().startsWith(programSearch.toLowerCase()) && (
                      <span className={styles.programGhost} aria-hidden>
                        {programSearch}{filteredPrograms[0].slice(programSearch.length)}
                      </span>
                    )}
                    {program && !programOpen && (
                      <button
                        type="button"
                        className={styles.clearButton}
                        onClick={() => setProgram("")}
                      >
                        Clear
                      </button>
                    )}
                  </div>
                  {programOpen && filteredPrograms.length > 0 && (
                    <div className={styles.comboboxDropdown} data-lenis-prevent data-cursor="default">
                      {filteredPrograms.map((p) => (
                        <button
                          key={p}
                          type="button"
                          className={styles.comboboxItem}
                          onMouseDown={() => {
                            setProgram(p);
                            setProgramOpen(false);
                            setProgramSearch("");
                          }}
                        >
                          {p}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                <div className={styles.field}>
                  <label htmlFor="graduatingClass">Graduating Year</label>
                  <input id="graduatingClass" type="number" value={graduatingClass}
                    onChange={(e) => setGraduatingClass(e.target.value)}
                    min={2020}
                    max={new Date().getFullYear() + 6}
                    placeholder={`e.g., ${new Date().getFullYear()}`} />
                  {graduatingClass && (
                    Number(graduatingClass) < 2020 ||
                    Number(graduatingClass) > new Date().getFullYear() + 6
                  ) && (
                    <span className={styles.hintError}>
                      Must be between 2020 and {new Date().getFullYear() + 6}
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className={styles.actions}>
              <button type="submit" className={styles.primaryButton}
                disabled={saving || !firstName || !lastName || !slug
                  || slugStatus === "taken" || slugStatus === "checking"
                  || (!!graduatingClass && (
                    Number(graduatingClass) < 2020 ||
                    Number(graduatingClass) > new Date().getFullYear() + 6
                  ))}>
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
