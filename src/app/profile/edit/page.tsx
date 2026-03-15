"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useAuth } from "@/components/auth/AuthProvider";
import { useTransition } from "@/context/TransitionContext";
import { rest } from "@/lib/supabase/rest";
import { getSchoolFromEmail, generateSlug } from "@/lib/supabase/auth-utils";
import { PROGRAMS } from "@/data/programs";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import styles from "./page.module.css";

// ─── Slug helpers ───

async function findAvailableSlug(
  baseSlug: string,
  excludeId?: string
): Promise<string> {
  let qs = `members?select=slug&slug=like.${encodeURIComponent(baseSlug)}%25`;
  if (excludeId) qs += `&id=neq.${excludeId}`;

  const { data } = await rest(qs);
  if (data.length === 0) return baseSlug;

  const set = new Set(data.map((r) => r.slug as string));
  if (!set.has(baseSlug)) return baseSlug;

  const escaped = baseSlug.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const pattern = new RegExp(`^${escaped}-(\\d+)$`);
  let maxN = 0;
  for (const s of set) {
    const m = s.match(pattern);
    if (m) maxN = Math.max(maxN, parseInt(m[1], 10));
  }
  const result = `${baseSlug}-${maxN + 1}`;
  console.log("[Slug] findAvailable:", baseSlug, "→", result);
  return result;
}

async function checkSlugTaken(
  slugVal: string,
  excludeId?: string
): Promise<boolean> {
  let qs = `members?select=slug&slug=eq.${encodeURIComponent(slugVal)}`;
  if (excludeId) qs += `&id=neq.${excludeId}`;

  const { data } = await rest(qs);
  return data.length > 0;
}

// ─── Page Component ───

export default function EditProfilePage() {
  const { user, session, member, loading: authLoading, refreshMember } = useAuth();
  const { startTransition } = useTransition();

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
    if (!authLoading && !user) startTransition("/sign-in");
  }, [authLoading, user, startTransition]);

  // If member exists AND onboarding is completed, redirect to profile
  useEffect(() => {
    if (!authLoading && member?.onboarding_completed)
      startTransition(`/directory/${member.slug}`);
  }, [authLoading, member, startTransition]);

  // Pre-fill form from OAuth metadata or existing draft member
  useEffect(() => {
    if (authLoading) return;
    if (member && !member.onboarding_completed) {
      console.log("[Onboarding] Prefill from draft member:", member.slug);
      setFirstName(member.first_name || "");
      setLastName(member.last_name || "");
      setProgram(member.program || "");
      setGraduatingClass(member.graduating_class || "");
      setSlug(member.slug || "");
      setSlugManuallyEdited(true);
      setSlugStatus("available");
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
  }, [firstName, lastName, slugManuallyEdited, member]);

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

  // refreshMember with timeout
  const safeRefresh = useCallback(async () => {
    try {
      await Promise.race([
        refreshMember(),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error("refreshMember timed out")), 5000)
        ),
      ]);
      console.log("[Onboarding] refreshMember succeeded");
    } catch (err) {
      console.warn("[Onboarding] refreshMember timed out, continuing:", err);
    }
  }, [refreshMember]);

  // Create draft member row during loader
  const createDraftRow = useCallback(async () => {
    if (!user?.email || rowCreated.current) return;
    rowCreated.current = true;
    console.log("[Onboarding] createDraftRow for", user.email);

    const token = session?.access_token ?? null;
    if (!token) {
      console.error("[Onboarding] No token, skipping draft creation");
      return;
    }

    // Check for existing member via REST
    const { data: existing } = await rest(
      `members?select=id&auth_user_id=eq.${user.id}`,
      { token }
    );

    if (existing.length > 0) {
      console.log("[Onboarding] Found existing member:", existing[0].id);
      await safeRefresh();
      return;
    }

    const nameFromOAuth = fullName?.trim().split(/\s+/) || [];
    const draftFirst = nameFromOAuth[0] || "";
    const draftLast =
      nameFromOAuth.length >= 2 ? nameFromOAuth.slice(1).join(" ") : "";

    if (!draftFirst) {
      console.log("[Onboarding] No first name from OAuth, skipping draft");
      return;
    }

    const baseSlug = generateSlug(draftFirst, draftLast || "member");
    const finalSlug = await findAvailableSlug(baseSlug);
    console.log("[Onboarding] Inserting draft with slug:", finalSlug);

    const { error: insertErr } = await rest("members", {
      method: "POST",
      token,
      body: {
        auth_user_id: user.id,
        first_name: draftFirst,
        last_name: draftLast,
        slug: finalSlug,
        school_email: user.email,
        school,
        onboarding_completed: false,
        is_approved: false,
      },
    });

    if (insertErr) {
      console.error("[Onboarding] Draft insert failed:", insertErr);
      return;
    }

    console.log("[Onboarding] Draft created, refreshing...");
    await safeRefresh();
  }, [user, fullName, school, session, safeRefresh]);

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
    timers.push(setTimeout(() => createDraftRow(), 1200));
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

    console.log("[Onboarding] handleSubmit — slug:", slug, "member:", member?.id);

    try {
      const token = session?.access_token ?? null;
      if (!token) {
        setError("Your session has expired. Please refresh the page and sign in again.");
        setSaving(false);
        return;
      }

      const finalSlug = slug.replace(/^-|-$/g, "");

      if (member) {
        console.log("[Onboarding] PATCH update for member:", member.id);
        const { data, error: updateErr } = await rest(
          `members?id=eq.${member.id}`,
          {
            method: "PATCH",
            token,
            body: {
              first_name: firstName,
              last_name: lastName,
              slug: finalSlug,
              program: program || null,
              graduating_class: graduatingClass || null,
              onboarding_completed: true,
            },
          }
        );

        if (updateErr) {
          setError(`Failed to save: ${updateErr}`);
          setSaving(false);
          return;
        }
        if (data.length === 0) {
          setError("Update failed — your session may have expired. Please refresh and try again.");
          setSaving(false);
          return;
        }

        console.log("[Onboarding] Update succeeded, navigating...");
        window.location.href = `/directory/${finalSlug}`;
      } else {
        // Draft row may already exist (createDraftRow ran but refreshMember didn't propagate)
        const { data: existing } = await rest(
          `members?select=id&auth_user_id=eq.${user.id}`,
          { token }
        );

        if (existing.length > 0) {
          console.log("[Onboarding] Found existing draft, PATCHing:", existing[0].id);
          const { data, error: updateErr } = await rest(
            `members?id=eq.${existing[0].id}`,
            {
              method: "PATCH",
              token,
              body: {
                first_name: firstName,
                last_name: lastName,
                slug: finalSlug,
                program: program || null,
                graduating_class: graduatingClass || null,
                onboarding_completed: true,
              },
            }
          );

          if (updateErr) {
            setError(`Failed to save: ${updateErr}`);
            setSaving(false);
            return;
          }
          if (data.length === 0) {
            setError("Update failed — please refresh and try again.");
            setSaving(false);
            return;
          }

          console.log("[Onboarding] Draft update succeeded, navigating...");
          window.location.href = `/directory/${finalSlug}`;
        } else {
          console.log("[Onboarding] POST insert (no draft)");
          const { data, error: insertErr } = await rest("members", {
            method: "POST",
            token,
            body: {
              auth_user_id: user.id,
              first_name: firstName,
              last_name: lastName,
              slug: finalSlug,
              school_email: user.email,
              school,
              program: program || null,
              graduating_class: graduatingClass || null,
              onboarding_completed: true,
              is_approved: false,
            },
          });

          if (insertErr) {
            setError(
              insertErr.includes("slug")
                ? "This profile URL was just taken. Please choose a different one."
                : `Failed to create profile: ${insertErr}`
            );
            setSaving(false);
            return;
          }
          if (data.length === 0) {
            setError("Insert failed — please refresh and try again.");
            setSaving(false);
            return;
          }

          console.log("[Onboarding] Insert succeeded, navigating...");
          window.location.href = `/directory/${finalSlug}`;
        }
      }
    } catch (err) {
      console.error("[Onboarding] Unexpected error:", err);
      setError("Something went wrong. Please try again.");
      setSaving(false);
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
                    : styles.hint
                }>
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
                    placeholder="Search programs..."
                    autoComplete="off"
                  />
                  {programOpen && filteredPrograms.length > 0 && (
                    <div className={styles.comboboxDropdown} data-lenis-prevent>
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
                <div className={styles.field}>
                  <label htmlFor="graduatingClass">Graduating Year</label>
                  <input id="graduatingClass" type="text" value={graduatingClass}
                    onChange={(e) => setGraduatingClass(e.target.value)}
                    placeholder="e.g., 2026" />
                </div>
              </div>
            </div>

            <div className={styles.actions}>
              <button type="submit" className={styles.primaryButton}
                disabled={saving || !firstName || !lastName || !slug
                  || slugStatus === "taken" || slugStatus === "checking"}>
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
