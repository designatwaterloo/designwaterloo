"use client";

import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import ConfirmDialog from "@/components/ConfirmDialog";
import { ArrowLeftIcon, ArrowRightIcon } from "@heroicons/react/24/solid";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/components/auth/AuthProvider";
import { createClient } from "@/lib/supabase/client";
import { findOrInitMember } from "@/lib/supabase/member-init";
import { validateUsername } from "@/lib/usernames";
import { PROGRAMS } from "@/data/programs";
import { SPECIALTIES } from "@/lib/specialties";
import Link from "@/components/Link";
import Footer from "@/components/Footer";
import styles from "./page.module.css";
import { useOnboardingFinale } from "@/components/OnboardingFinale";
import ScheduleFields from "./ScheduleFields";
import { workSequences } from "@/lib/work-sequences";
import StudiesFields from "./StudiesFields";
import { normalizePortfolioUrl } from "@/lib/portfolio-url";

const steps = ["Your details", "Creative profile", "Preview & submit"];
const titles = ["First, a little about you.", "What do you like to make?", "Your profile, ready for review."];
const descriptions = [
  "Help people put a name to your work. Your university account is already connected.",
  "Give people a sense of your interests and the things you’re working on. Just starting out? You belong here, too.",
  "Here’s a preview of your introduction. Submit it for review to join the directory.",
];
const empty = { first_name: "", last_name: "", slug: "", program: "", graduating_class: "", bio: "", portfolio: "", linkedin: "", profile_image_url: "", specialties: [] as string[] };

function EditProfileContent() {
  const { user, member, loading, error: authError, refreshMember } = useAuth();
  const router = useRouter();
  const replay = useSearchParams().get("replay") === "true";
  const startFinale = useOnboardingFinale();
  const [finishing, setFinishing] = useState(false);
  const supabase = useMemo(() => createClient(), []);
  const [fields, setFields] = useState(empty);
  const [editingSchedule, setEditingSchedule] = useState(false);
  const [schedule, setSchedule] = useState<string[] | null>(null);
  const scheduleChoices = workSequences(member?.school || "", fields.program, fields.graduating_class);
  const workSchedule = schedule ?? ((scheduleChoices.find(choice => choice.recommended) || scheduleChoices[0])?.terms || []);
  const [step, setStep] = useState(0);
  const [ready, setReady] = useState(false);
  const [introPhase, setIntroPhase] = useState(1);
  const [introDone, setIntroDone] = useState(false);
  const [canvasStep, setCanvasStep] = useState(0);
  const [nextCanvasStep, setNextCanvasStep] = useState<number | null>(null);
  const slideLeaving = nextCanvasStep !== null || finishing;

  function changeCanvasStep(next: number) {
    if (slideLeaving) return;
    if (member && !replay) {
      try {
        const key = `dw-onboarding-step:${member.id}`;
        if (next >= 7) sessionStorage.removeItem(key);
        else sessionStorage.setItem(key, String(next));
      } catch { /* Onboarding still works when browser storage is disabled. */ }
    }
    if (canvasStep > 6 || window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      if (next === 7) { router.push("/dashboard"); return; }
      setCanvasStep(next);
      canvasRef.current?.focus({ preventScroll: true });
    } else {
      setNextCanvasStep(next);
    }
  }

  useEffect(() => {
    if (nextCanvasStep === null) return;
    const timer = window.setTimeout(() => {
      if (nextCanvasStep === 7) { router.push("/dashboard"); return; }
      setCanvasStep(nextCanvasStep);
      setNextCanvasStep(null);
      canvasRef.current?.focus({ preventScroll: true });
    }, 300);
    return () => window.clearTimeout(timer);
  }, [nextCanvasStep, router]);
  const [usernameStatus, setUsernameStatus] = useState("");
  const [checkedUsername, setCheckedUsername] = useState<string | null>(null);
  const [usernameRetry, setUsernameRetry] = useState(0);
  const [usernameCheckFailed, setUsernameCheckFailed] = useState(false);
  useEffect(() => {
    if (canvasStep !== 2) return;
    let cancelled = false;
    setCheckedUsername(null);
    setUsernameCheckFailed(false);
    const check = validateUsername(fields.slug);
    if (!check.ok) { setUsernameStatus(check.error || "Choose a username."); return; }
    if (check.normalized === member?.slug) { setUsernameStatus("Available"); setCheckedUsername(check.normalized); return; }
    setUsernameStatus("Checking availability…");
    const timer = window.setTimeout(async () => {
      const result = await supabase.rpc("username_available", { candidate: check.normalized });
      if (!cancelled) {
        setUsernameStatus(result.error ? "Couldn’t check availability." : result.data ? "Available" : "That username is taken.");
        setUsernameCheckFailed(!!result.error);
        if (!result.error && result.data) setCheckedUsername(check.normalized);
      }
    }, 400);
    return () => { cancelled = true; window.clearTimeout(timer); };
  }, [canvasStep, fields.slug, member?.slug, supabase, usernameRetry]);
  const [expansion, setExpansion] = useState<React.CSSProperties | null>(null);
  const canvasRef = useRef<HTMLElement>(null);
  const photoInputRef = useRef<HTMLInputElement>(null);

  function openCanvas(event: React.MouseEvent<HTMLButtonElement>) {
    if (expansion || introDone) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setIntroDone(true);
      return;
    }
    const button = event.currentTarget;
    const rect = button.getBoundingClientRect();
    const arrow = button.querySelector("svg")!.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    // The pill contains a circle of this radius. Scale that circle past the
    // farthest viewport corner so even the rounded ends fully cover the screen.
    const distance = Math.hypot(
      Math.max(centerX, window.innerWidth - centerX),
      Math.max(centerY, window.innerHeight - centerY),
    );
    setExpansion({
      "--pill-top": `${rect.top}px`,
      "--pill-width": `${rect.width}px`,
      "--pill-height": `${rect.height}px`,
      "--pill-scale": distance / (Math.min(rect.width, rect.height) / 2) + 1,
      "--pill-left": `${rect.left}px`,
      "--pill-color": getComputedStyle(button).backgroundColor,
      "--arrow-x": `${arrow.left + arrow.width / 2}px`,
      "--arrow-y": `${arrow.top + arrow.height / 2}px`,
    } as React.CSSProperties);
  }

  useEffect(() => {
    if (!expansion) return;
    // Finish even if a browser cancels the CSS animation mid-transition.
    const timer = setTimeout(() => setIntroDone(true), 1100);
    return () => clearTimeout(timer);
  }, [expansion]);

  useEffect(() => {
    if (introDone) canvasRef.current?.focus({ preventScroll: true });
  }, [introDone]);
  const [busy, setBusy] = useState(false);
  const [photoWarning, setPhotoWarning] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const initialized = useRef<string | null>(null);
  const initializing = useRef(false);
  const inFlight = useRef(false);
  const heading = useRef<HTMLHeadingElement>(null);
  const form = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setIntroPhase(5);
      return;
    }
    const timers = [2, 3, 4, 5].map(phase =>
      setTimeout(() => setIntroPhase(phase), (phase - 1) * 1200),
    );
    return () => timers.forEach(clearTimeout);
  }, []);

  useEffect(() => {
    if (loading) return;
    if (!user) { router.replace("/sign-in"); return; }
    if (member && !replay && (member.onboarding_completed || member.review_status !== "draft") && !inFlight.current && !submitted && !finishing) {
      router.replace("/dashboard"); return;
    }
    if (member && initialized.current !== member.id) {
      initialized.current = member.id;
      if (!replay && !member.onboarding_completed) {
        try {
          const savedStep = Number(sessionStorage.getItem(`dw-onboarding-step:${member.id}`));
          if (Number.isInteger(savedStep) && savedStep > 0 && savedStep <= 7) { setCanvasStep(Math.min(savedStep, 6)); setIntroDone(true); }
        } catch { /* Start at the introduction if storage is unavailable. */ }
      }
      if (member.work_schedule?.length) setSchedule(member.work_schedule);
      setFields({ first_name: member.first_name || "", last_name: member.last_name || "", slug: member.slug_confirmed ? member.slug || "" : "", program: member.program || "", graduating_class: member.graduating_class || "", bio: member.bio || "", portfolio: member.portfolio || "", linkedin: member.linkedin || "", profile_image_url: member.profile_image_url || "", specialties: member.specialties || [] });
      setReady(true);
    }
  }, [loading, user, member, router, submitted, replay, finishing]);

  async function initialize() {
    if (initializing.current) return;
    initializing.current = true;
    setError(null);
    try { await findOrInitMember(supabase); await refreshMember(); }
    catch { setError("We couldn’t load your profile. Try again; your account is still connected."); }
    finally { initializing.current = false; }
  }

  useEffect(() => {
    if (!loading && user && !member && !authError && !error && !initializing.current) void initialize();
    // Initialization is only for a missing row. An explicit retry handles failure.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, user, member, authError]);

  useEffect(() => {
    if (ready && introDone) {
      heading.current?.focus({ preventScroll: true });
      window.scrollTo({ top: 0, behavior: "instant" });
    }
  }, [step, ready, submitted, introDone]);

  // Refreshing the account snapshot must not replace unsaved form input.
  function change<K extends keyof typeof empty>(key: K, value: typeof empty[K]) {
    setFields(previous => ({ ...previous, [key]: value }));
    setSaved(false);
  }

  function detailsError() {
    if (!fields.first_name.trim() || !fields.last_name.trim()) return "Add your first and last name to continue.";
    const username = validateUsername(fields.slug);
    if (!username.ok) return username.error || "Choose a valid username.";
    if (normalizePortfolioUrl(fields.portfolio) === null) return "Enter a valid portfolio website, like yourname.com.";
    if (fields.graduating_class && (!/^\d{4}$/.test(fields.graduating_class) || +fields.graduating_class < 2020 || +fields.graduating_class > new Date().getFullYear() + 6)) return "Check your graduating year.";
    return null;
  }

  async function save(submit = false) {
    if (!user || !member || inFlight.current || uploading) return false;
    const invalid = detailsError();
    if (invalid) { setError(invalid); setStep(0); return false; }
    inFlight.current = true;
    setBusy(true); setError(null); setSaved(false);
    try {
      const slug = validateUsername(fields.slug).normalized;
      if (slug !== member.slug) {
        const availability = await supabase.rpc("username_available", { candidate: slug });
        if (availability.error) throw new Error("We couldn’t check your username. Please try again.");
        if (!availability.data) { setStep(0); throw new Error("That username is taken. Choose another one."); }
      }
      // A single row update saves and submits atomically. Existing experience,
      // leadership, work schedule and other social links are left intact.
      const { data, error: writeError } = await supabase.from("members").update({
        ...fields, first_name: fields.first_name.trim(), last_name: fields.last_name.trim(), slug,
        program: fields.program.trim() || null, graduating_class: fields.graduating_class || null,
        bio: fields.bio.trim() || null, portfolio: normalizePortfolioUrl(fields.portfolio) || null,
        linkedin: fields.linkedin.trim() || null, profile_image_url: fields.profile_image_url || null,
        slug_confirmed: true,

      }).eq("id", member.id).eq("review_status", "draft").select("id");
      if (writeError) throw new Error(writeError.code === "23505" ? "That username is taken. Choose another one." : "Your changes couldn’t be saved. Please try again.");
      if (!data?.length) throw new Error("Your profile status changed in another tab. Reload to see the latest version.");
      setFields(previous => ({ ...previous, slug }));
      setSaved(true);
      if (submit) {const response=await fetch("/api/profile/submit",{method:"POST"});if(!response.ok)throw new Error("Your draft was saved, but submission failed. Please try again.");setSubmitted(true);}
      // The write has succeeded even if refreshing the shared header is unavailable.
      await refreshMember().catch(() => {});
      return true;
    } catch (err) { setError(err instanceof Error ? err.message : "Something went wrong. Please try again."); return false; }
    finally { setBusy(false); inFlight.current = false; }
  }

  async function upload(file?: File) {
    if (!file || busy || uploading) return;
    if (file.size > 10 * 1024 * 1024) { setError("That photo is too large. Choose one under 10 MB."); return; }
    if (!["image/jpeg", "image/png", "image/webp", "image/gif"].includes(file.type)) { setError("Choose a JPG, PNG, WebP or GIF."); return; }
    setUploading(true); setError(null);
    try {
      const body = new FormData(); body.append("file", file);
      const response = await fetch("/api/upload-image", { method: "POST", body });
      const data = await response.json();
      if (!response.ok || !data.imageUrl) throw new Error(data.error || "Photo upload failed. Please try again.");
      change("profile_image_url", data.imageUrl);
    } catch (err) { setError(err instanceof Error ? err.message : "Photo upload failed. Please try again."); }
    finally { setUploading(false); }
  }

  async function advance(event: React.FormEvent) {
    event.preventDefault();
    if (step === 2 && !window.confirm("Submit your profile for review? We hand-curate students in the directory. Review usually takes about a day, and your profile becomes public once approved.")) return;
    if (await save(step === 2)) { if (step < 2) setStep(step + 1); }
  }

  async function saveName(event: React.FormEvent) {
    event.preventDefault();
    if (!member || inFlight.current || slideLeaving) return;
    if (replay) { changeCanvasStep(2); return; }
    const firstName = fields.first_name.trim();
    const lastName = fields.last_name.trim();
    if (!firstName || !lastName) { setError("Add your first and last name to continue."); return; }
    inFlight.current = true;
    setBusy(true);
    setError(null);
    try {
      const result = await supabase.from("members")
        .update({ first_name: firstName, last_name: lastName })
        .eq("id", member.id).eq("review_status", "draft").select("id");
      if (result.error) throw new Error("We couldn’t save your name. Please try again.");
      if (!result.data?.length) throw new Error("Your profile changed in another tab. Reload to continue.");
      setFields(previous => ({ ...previous, first_name: firstName, last_name: lastName }));
      await refreshMember().catch(() => {});
      changeCanvasStep(2);
      canvasRef.current?.focus({ preventScroll: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : "We couldn’t save your name. Please try again.");
    } finally { inFlight.current = false; setBusy(false); }
  }

  async function saveCanvasDetails(event?: React.FormEvent, skipPhotoConfirmed = false) {
    event?.preventDefault();
    if (!member || inFlight.current || uploading || slideLeaving) return;
    if (canvasStep === 3 && !fields.profile_image_url && !skipPhotoConfirmed) { setPhotoWarning(true); return; }
    if (replay) {
      if (canvasStep === 6) {
        setFinishing(true);
        startFinale(Array.from(canvasRef.current?.querySelectorAll<HTMLElement>('input[type="checkbox"]:checked + span') || []));
      } else changeCanvasStep(canvasStep + 1);
      return;
    }
    inFlight.current = true; setBusy(true); setError(null);
    try {
      const username = validateUsername(fields.slug);
      if (canvasStep === 2) {
        if (!username.ok) throw new Error(username.error);
        if (username.normalized !== member.slug) {
          const check = await supabase.rpc("username_available", { candidate: username.normalized });
          if (check.error) throw new Error("We couldn’t check your username. Please try again.");
          if (!check.data) throw new Error("That username is taken. Choose another one.");
        }
      } else if (canvasStep === 4) {
        if (fields.graduating_class && (!/^\d{4}$/.test(fields.graduating_class) || +fields.graduating_class < 2020 || +fields.graduating_class > new Date().getFullYear() + 6)) throw new Error("Check your graduating year.");
      }
      if (canvasStep === 6 && (!fields.specialties.length || fields.specialties.length > 5)) throw new Error("Pick one to five top skills.");
      const patch = canvasStep === 6 ? { specialties: fields.specialties, onboarding_completed: true } : canvasStep === 2
        ? { slug: username.normalized, slug_confirmed: true }
        : canvasStep === 5 ? { work_schedule: workSchedule }
        : canvasStep === 3 ? { profile_image_url: fields.profile_image_url || null }
        : { program: fields.program.trim() || null, graduating_class: fields.graduating_class || null };
      const result = await supabase.from("members").update(patch).eq("id", member.id).eq("review_status", "draft").select("id");
      if (result.error) {
        const connectionError = !result.error.code || /fetch|network|timeout/i.test(result.error.message);
        throw new Error(result.error.code === "23505" ? "That username is taken. Choose another one." : connectionError ? "We couldn’t save your changes because the connection failed. Your entries are still here—please try again." : "We couldn’t save your details. Please try again.");
      }
      if (!result.data?.length) throw new Error("Your profile changed in another tab. Reload to continue.");
      if (canvasStep === 2) setFields(previous => ({ ...previous, slug: username.normalized }));
      if (canvasStep === 6) {
        const selected = Array.from(canvasRef.current?.querySelectorAll<HTMLElement>('input[type="checkbox"]:checked + span') || []);
        setFinishing(true);
        startFinale(selected);
      } else changeCanvasStep(canvasStep + 1);
      await refreshMember().catch(() => {});
    } catch (err) { setError(err instanceof Error ? err.message : "We couldn’t save your details."); }
    finally { inFlight.current = false; setBusy(false); }
  }

  const usernameReady = validateUsername(fields.slug).ok && checkedUsername === validateUsername(fields.slug).normalized;
  const canvasNotReady = (canvasStep === 2 && !usernameReady) || (canvasStep === 6 && (!fields.specialties.length || fields.specialties.length > 5));
  const usernameTone = usernameReady ? "good" : usernameStatus && usernameStatus !== "Checking availability…" ? "bad" : "neutral";
  const missing = [!fields.profile_image_url && "a photo", !fields.bio.trim() && "a short bio", !fields.specialties.length && "your creative interests"].filter(Boolean);
  const name = `${fields.first_name} ${fields.last_name}`.trim();
  const school = member?.school || "";

  if (!replay && !finishing && (loading || (member && (member.onboarding_completed || member.review_status !== "draft")))) {
    return <main data-account-workspace aria-busy="true" className="min-h-screen" />;
  }

  if (introDone) {
    return <main ref={canvasRef} tabIndex={-1} aria-label="Next onboarding step" data-account-workspace data-onboarding-intro data-finishing={finishing} className={styles.onboardingCanvas}>
      {photoWarning && <ConfirmDialog title="Add a photo later?" message="You’ll need to add a real photo of yourself before your profile can go live. You can add it from your profile after onboarding." cancelLabel="Go back" confirmLabel="Continue without photo" onCancel={() => setPhotoWarning(false)} onConfirm={() => { setPhotoWarning(false); void saveCanvasDetails(undefined, true); }} />}
      {canvasStep > 0 && <button type="button" className={styles.canvasBack} aria-label="Previous slide" disabled={busy || uploading || slideLeaving} onClick={() => { setError(null); changeCanvasStep(Math.max(0, canvasStep - 1)); canvasRef.current?.focus({ preventScroll: true }); }}><ArrowLeftIcon className="size-6 fill-current" aria-hidden="true" /></button>}
      <ol className={styles.storyProgress} role="list" aria-label={`Onboarding step ${canvasStep + 1} of 7`}>
        {[0, 1, 2, 3, 4, 5, 6].map(index => <li key={index} aria-current={canvasStep === index ? "step" : undefined}><span className="sr-only">Step {index + 1}</span></li>)}
      </ol>
      {canvasStep === 0 ? <>
        <section key="welcome" data-leaving={slideLeaving} className={styles.welcomeCopy} aria-labelledby="welcome-heading">
          <h1 id="welcome-heading">{fields.first_name.trim() ? `Welcome, ${fields.first_name.trim()}.` : "Welcome to Design Waterloo."}</h1>
          <p>Welcome to Design Waterloo. We made this space to help creative people at Waterloo and Laurier find each other, share their work, and make things together.</p>
        </section>
      </> : canvasStep === 1 ? <>
        <section key="name" data-leaving={slideLeaving} className={`${styles.welcomeCopy} ${styles.nextSlideCopy}`} aria-labelledby="name-heading">
          <h1 id="name-heading">{school === "University of Waterloo" && member?.first_name?.trim() ? "Does this look right?" : "What’s your name?"}</h1>
          <p>{school === "University of Waterloo" && member?.first_name?.trim() ? "We got your name from your university account. You can edit it before we carry on." : "Add the name you’d like to use in the directory."}</p>
          <form id="onboarding-name" className={styles.nameForm} onSubmit={saveName}>
            <fieldset disabled={busy} className={styles.nameFields}>
              <legend className="sr-only">Your details</legend>
              <div><label htmlFor="onboarding-first-name">First name</label><input id="onboarding-first-name" size={Math.min(24, Math.max(8, fields.first_name.length + 1))} name="given-name" autoComplete="given-name" value={fields.first_name} onChange={event => change("first_name", event.target.value)} required maxLength={100} /></div>
              <div><label htmlFor="onboarding-last-name">Last name</label><input id="onboarding-last-name" size={Math.min(24, Math.max(8, fields.last_name.length + 1))} name="family-name" autoComplete="family-name" value={fields.last_name} onChange={event => change("last_name", event.target.value)} required maxLength={100} /></div>
            </fieldset>
            {error && <p className={styles.nameError} role="alert">{error}</p>}
            <div role="status" className="sr-only">{busy ? "Saving your name…" : ""}</div>
          </form>
        </section>
      </> : canvasStep >= 2 && canvasStep <= 4 ? <section key={canvasStep} data-leaving={slideLeaving} className={`${styles.welcomeCopy} ${styles.nextSlideCopy}`} aria-labelledby="details-heading">
        <h1 id="details-heading">{canvasStep === 2 ? "Pick a username." : canvasStep === 3 ? "Put a face to your name." : "A little more about you."}</h1>
        <p>{canvasStep === 2 ? "Choose the handle for your profile." : canvasStep === 3 ? "Add a photo for your profile." : "Add your program and graduation year. You can update these later."}</p>
        <form id="onboarding-details" className={styles.nameForm} onSubmit={saveCanvasDetails}>
          <fieldset disabled={busy || uploading || slideLeaving} className={styles.detailsFields}>
            <legend className="sr-only">{canvasStep === 2 ? "Username" : canvasStep === 3 ? "Profile photo" : "Studies"}</legend>
            {canvasStep === 2 ? <>
              <div className={styles.usernameField}>
                <div className={styles.inputChip}><label htmlFor="onboarding-username">Username</label><div className={styles.usernameEntry}><span aria-hidden="true">@</span><input id="onboarding-username" placeholder="username" value={fields.slug} onChange={e => change("slug", e.target.value.toLowerCase())} required minLength={3} maxLength={40} pattern="[a-z0-9]+(-[a-z0-9]+)*" autoComplete="username" autoCapitalize="none" spellCheck={false} aria-describedby="username-rules username-status" /></div></div>
                <span id="username-rules" className="sr-only">3–40 characters. Letters, numbers, and single hyphens.</span>
                <small id="username-status" role="status" data-tone={usernameTone} className={styles.usernameStatus}>{usernameStatus}</small>
                {usernameCheckFailed && <button type="button" className={styles.retryUsername} onClick={() => setUsernameRetry(count => count + 1)}>Retry check</button>}
              </div>
            </> : canvasStep === 3 ? <>
              <div className={styles.onboardingPhoto}>
                <input ref={photoInputRef} id="onboarding-photo" aria-label="Profile photo" className="sr-only" tabIndex={-1} type="file" accept="image/jpeg,image/png,image/webp,image/gif" onChange={e => { void upload(e.target.files?.[0]); e.target.value = ""; }} />
                <button type="button" className={styles.photoPreview} aria-label={fields.profile_image_url ? "Change profile photo" : "Upload profile photo"} onClick={() => photoInputRef.current?.click()}>
                  <span className={styles.cameraCorners} aria-hidden="true"><i /><i /><i /><i /></span>
                  {fields.profile_image_url ? <Image src={fields.profile_image_url} alt="Your profile photo" width={192} height={240} unoptimized /> : <span className={styles.photoPlaceholder}><span aria-hidden="true">+</span>Upload photo</span>}
                  {fields.profile_image_url && <span className={styles.photoOverlay}>Change photo</span>}
                </button>
                <div><small role="status">{uploading ? "Uploading…" : ""}</small>{fields.profile_image_url && <button type="button" className={styles.removePhoto} onClick={() => change("profile_image_url", "")}>Remove photo</button>}</div>
              </div>
            </> : <>
              <StudiesFields school={school} program={fields.program} year={fields.graduating_class} onProgram={value => change("program", value)} onYear={value => change("graduating_class", value)} />
            </>}
          </fieldset>
          {error && <p className={styles.nameError} role="alert">{error}</p>}
        </form>
      </section> : canvasStep === 5 ? <section key="schedule" data-leaving={slideLeaving} className={`${styles.welcomeCopy} ${styles.nextSlideCopy} ${styles.scheduleSlide}`} aria-labelledby="schedule-heading">
        <h1 id="schedule-heading">{scheduleChoices.length ? "Does this schedule look right?" : "When do you plan to work?"}</h1>
        <form id="onboarding-details" className={styles.nameForm} onSubmit={saveCanvasDetails}>
          <fieldset disabled={busy || slideLeaving} className={styles.scheduleFields}>
            <legend className="sr-only">Work terms</legend>
            <ScheduleFields editing={editingSchedule || !scheduleChoices.length} choices={scheduleChoices} year={fields.graduating_class} value={workSchedule} onChange={setSchedule} />
          </fieldset>
          {error && <p className={styles.nameError} role="alert">{error}</p>}
        </form>
      </section> : canvasStep === 6 ? <section key="skills" data-leaving={slideLeaving} className={`${styles.welcomeCopy} ${styles.nextSlideCopy}`} aria-labelledby="skills-heading">
        <h1 id="skills-heading">What are your top skills?</h1>
        <p>You can edit these later.</p>
        <form id="onboarding-details" className={styles.nameForm} onSubmit={saveCanvasDetails}>
          <fieldset disabled={busy || slideLeaving} className={styles.skillChoices}>
            <legend className="sr-only">Top skills</legend>
            {Array.from(new Set([...SPECIALTIES, ...fields.specialties])).map(skill => <label key={skill}><input type="checkbox" checked={fields.specialties.includes(skill)} disabled={!fields.specialties.includes(skill) && fields.specialties.length >= 5} onChange={event => change("specialties", event.target.checked ? [...fields.specialties, skill] : fields.specialties.filter(value => value !== skill))} /><span>{skill}</span></label>)}
          </fieldset>
          <small className={styles.skillCount} role="status">{fields.specialties.length} / 5 selected</small>
          {error && <p className={styles.nameError} role="alert">{error}</p>}
        </form>
      </section> : <div aria-label="Next step canvas" />}
      <div className={styles.canvasAction} data-schedule-action={canvasStep === 5 || undefined} data-stream-picker={canvasStep === 5 || undefined} style={canvasStep > 6 ? { visibility: "hidden" } : undefined}>
        {canvasStep === 5 && scheduleChoices.length > 1 && <div className={styles.scheduleStreams} role="group" aria-label="Co-op sequence">
          {scheduleChoices.map((choice, index) => <button key={choice.label} type="button" style={{ "--choice-delay": `${850 + index * 65}ms` } as React.CSSProperties} disabled={busy || slideLeaving} aria-pressed={workSchedule.join() === choice.terms.join()} onClick={() => { setSchedule(choice.terms); }}><span className={styles.streamCheck} aria-hidden="true"><svg viewBox="0 0 16 16" fill="none"><path d="m4 8 2.5 2.5L12 5" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round" /></svg></span><span>{choice.label}{choice.recommended ? " (default)" : ""}</span></button>)}
        </div>}
        {canvasStep === 5 && scheduleChoices.length > 0 && <button type="button" className={styles.editScheduleButton} aria-pressed={editingSchedule} disabled={busy || slideLeaving} onClick={() => setEditingSchedule(value => !value)}>{editingSchedule ? "Done editing" : "Edit schedule"}</button>}
        <button type={canvasStep > 0 ? "submit" : "button"} form={canvasStep === 1 ? "onboarding-name" : canvasStep > 1 ? "onboarding-details" : undefined} className={styles.settleNext} aria-label={canvasStep === 5 ? "Confirm schedule" : "Continue"} aria-busy={busy || uploading} data-unready={canvasNotReady} disabled={busy || uploading || slideLeaving || canvasStep > 6 || canvasNotReady} onClick={event => { if (canvasStep === 0) { event.preventDefault(); changeCanvasStep(1); canvasRef.current?.focus({ preventScroll: true }); } }}><span className={styles.settleArrow}><ArrowRightIcon className="size-6 shrink-0 fill-current" aria-hidden="true" /></span></button>
      </div>
    </main>;
  }

  if (!introDone && !error && !authError) {
    const fullName = [member?.first_name, member?.last_name].filter(Boolean).join(" ") || user?.user_metadata?.full_name;
    const lines = [
      "Connecting to your account…",
      fullName ? `Found you — ${fullName}` : "Setting things up…",
      school || "Finding your school…",
      "Getting everything ready…",
    ];
    return <main className={styles.settlePage} data-onboarding-intro>
      <div className={styles.settleLines} aria-hidden="true">
        {lines.map((line, index) => <p key={index} className={`${styles.settleLine} ${introPhase > index ? styles.settleVisible : ""}`}>{line}</p>)}
      </div>
      <p className="sr-only" role="status">{ready && introPhase === 5 ? "Your account is ready. Continue when you’re ready." : "Getting your account ready."}</p>
      <div className={styles.settleAction}>
        {introPhase === 5 && ready && <button type="button" className={styles.settleNext} aria-label="Continue" disabled={!!expansion} data-expanding={!!expansion} onClick={openCanvas}><span className={styles.settleArrow}><ArrowRightIcon className="size-6 shrink-0 fill-current" aria-hidden="true" /></span></button>}
      </div>
      {expansion && <div className={styles.canvasTransition} style={expansion} aria-hidden="true">
        <div className={styles.expandingPill} onAnimationEnd={() => setIntroDone(true)} />
        <span className={styles.departingArrow}><ArrowRightIcon className="size-6 fill-current" /></span>
      </div>}
    </main>;
  }

  return <>
    <main data-account-workspace className={styles.page}>
      {!ready ? <div className={styles.loading}>
        <h1>Let’s get you settled.</h1>
        {error || authError ? <><p role="alert">{error || "We couldn’t load your profile."}</p><button type="button" className={styles.primary} onClick={initialize}>Try again</button></> : <p role="status">Loading your profile…</p>}
        <Link href="/dashboard">Your dashboard</Link>
      </div> : submitted ? <div className={styles.success}>
        <p className={styles.eyebrow}>Profile submitted</p>
        <h1 ref={heading} tabIndex={-1}>You’re on your way, {fields.first_name}.</h1>
        <p>Your profile is now with the Design Waterloo team for review. Once approved, it will appear in the directory.</p>
        <div className={styles.nextSteps}><h2>What happens next</h2><p>Check your dashboard for your review status. You can still edit your profile and add projects or experience while you wait.</p></div>
        <div className={styles.actions}><Link href="/dashboard" className={styles.primary}>Go to dashboard</Link><Link href={`/@${fields.slug}?edit=true`} className={styles.secondary}>Keep adding to your profile</Link></div>
      </div> : <div className={styles.layout}>
        <aside className={styles.sidebar}>
          <p className={styles.eyebrow}>Join Design Waterloo</p>
          <h2>A place for<br />what you make.</h2>
          <p>A few details. A little personality.<br />Your introduction to the community.</p>
          <ol className={styles.steps} role="list" aria-label="Profile setup progress">
            {steps.map((label, index) => <li key={label} aria-current={index === step ? "step" : undefined}><span className={styles.stepNumber}>{index + 1}</span><span>{label}</span></li>)}
          </ol>
          <p className={styles.privateNote}>Your draft is private until you submit it and the team approves it.</p>
        </aside>
        <section className={styles.main} aria-labelledby="step-heading">
          <header className={styles.heading}><p className={styles.eyebrow}>Step {step + 1} of 3</p><h1 id="step-heading" ref={heading} tabIndex={-1}>{titles[step]}</h1><p>{descriptions[step]}</p></header>
          {error && <p className={styles.error} role="alert">{error}</p>}
          <form ref={form} onSubmit={advance} className={styles.form}>
            <fieldset disabled={busy || uploading} className={styles.fields}>
              <legend className="sr-only">{steps[step]}</legend>
              {step === 0 && <>
                <div className={styles.pair}>
                  <div className={styles.field}><label htmlFor="first-name">First name</label><input id="first-name" name="given-name" autoComplete="given-name" value={fields.first_name} onChange={e => change("first_name", e.target.value)} required /></div>
                  <div className={styles.field}><label htmlFor="last-name">Last name</label><input id="last-name" name="family-name" autoComplete="family-name" value={fields.last_name} onChange={e => change("last_name", e.target.value)} required /></div>
                </div>
                <div className={styles.school}><p>{school}</p><p>{user?.email}</p></div>
                <div className={styles.pair}>
                  <div className={styles.field}><label htmlFor="program">Program <span>(optional)</span></label><input id="program" name="program" list="programs" placeholder="Find or enter your program" value={fields.program} onChange={e => change("program", e.target.value)} /><datalist id="programs">{(PROGRAMS[school] || []).map(p => <option key={p} value={p} />)}</datalist></div>
                  <div className={styles.field}><label htmlFor="year">Graduating year <span>(optional)</span></label><input id="year" name="graduating-year" type="number" min="2020" max={new Date().getFullYear() + 6} placeholder="2030" value={fields.graduating_class} onChange={e => change("graduating_class", e.target.value)} /></div>
                </div>
                <div className={styles.field}><label htmlFor="username">Your profile link</label><div className={styles.username}><span>designwaterloo.com/@</span><input id="username" name="username" autoComplete="username" autoCapitalize="none" spellCheck={false} value={fields.slug} onChange={e => change("slug", e.target.value.toLowerCase())} required aria-describedby="username-hint" /></div><p id="username-hint" className={styles.hint}>We’ve picked a username for you. Make it yours, or keep this one.</p></div>
              </>}
              {step === 1 && <>
                <div className={styles.photoRow}>
                  <div className={styles.avatar}>{fields.profile_image_url ? <Image src={fields.profile_image_url} alt="" width={400} height={500} unoptimized /> : <span aria-hidden="true">{fields.first_name[0]}{fields.last_name[0]}</span>}</div>
                  <div className={styles.field}><label htmlFor="photo">Put a face to your name <span>(optional)</span></label><input id="photo" name="photo" type="file" accept="image/jpeg,image/png,image/webp,image/gif" onChange={e => { void upload(e.target.files?.[0]); e.target.value = ""; }} /><p className={styles.hint}>{uploading ? "Uploading your photo…" : "JPG, PNG, WebP or GIF. Up to 10 MB."}</p></div>
                </div>
                <div className={styles.field}><label htmlFor="bio">A little about you <span>(recommended)</span></label><textarea id="bio" name="bio" rows={4} maxLength={600} placeholder="I’m a designer who loves… Lately, I’ve been working on…" value={fields.bio} onChange={e => change("bio", e.target.value)} aria-describedby="bio-hint" /><p className={styles.hint} id="bio-hint">A sentence or two is plenty. What are you making, learning or curious about?</p></div>
                <fieldset className={styles.interests}><legend>What are you into? <span>(recommended)</span></legend><p className={styles.hint}>Pick the interests you’d like people to find you for.</p><div className={styles.chips}>{Array.from(new Set([...SPECIALTIES, ...fields.specialties])).map(s => <label key={s}><input type="checkbox" name="specialties" value={s} checked={fields.specialties.includes(s)} onChange={e => change("specialties", e.target.checked ? [...fields.specialties, s] : fields.specialties.filter(v => v !== s))} /><span>{s}</span></label>)}</div></fieldset>
              </>}
              {step === 2 && <>
                <article className={styles.preview} aria-label="Your profile preview">
                  <div className={styles.previewImage}>{fields.profile_image_url ? <Image src={fields.profile_image_url} alt="" width={400} height={500} unoptimized /> : <span aria-hidden="true">{fields.first_name[0]}{fields.last_name[0]}</span>}</div>
                  <div className={styles.previewText}><p className={styles.eyebrow}>Design Waterloo</p><h2>{name}</h2><p>{[fields.program, fields.graduating_class && `Class of ${fields.graduating_class}`].filter(Boolean).join(" · ") || school}</p>{fields.bio && <p className={styles.bio}>{fields.bio}</p>}<div className={styles.previewTags}>{fields.specialties.map(s => <span key={s}>{s}</span>)}</div>{(fields.portfolio || fields.linkedin) && <p className={styles.hint}>Links added: {[fields.portfolio && "Portfolio / project", fields.linkedin && "LinkedIn"].filter(Boolean).join(" · ")}</p>}</div>
                </article>
                {missing.length > 0 && <div className={styles.notice}><h2>A little more you goes a long way.</h2><p>You haven’t added {missing.join(", ")}. You can submit as-is, or go back to help people get to know you.</p><button type="button" className={styles.textButton} onClick={() => { setStep(1); setError(null); }}>Add a few details</button></div>}
                <p className={styles.hint}>Submitting sends your profile to the team for review. It becomes public after approval. You can add experience, projects and more links later.</p>
              </>}
            </fieldset>
            <div className={styles.actions}>
              {step > 0 && <button type="button" className={styles.secondary} disabled={busy || uploading} onClick={() => { setStep(step - 1); setError(null); }}>Back</button>}
              <button type="submit" className={styles.primary} disabled={busy || uploading}>{busy ? (step === 2 ? "Submitting…" : "Saving…") : step === 0 ? "Continue to creative profile" : step === 1 ? "Preview your profile" : "Submit for review"}</button>
            </div>
            <div className={styles.saveRow}><button type="button" className={styles.textButton} disabled={busy || uploading} onClick={async () => { if (form.current?.reportValidity() && await save()) router.push("/dashboard"); }}>Save and finish later</button><p className={styles.hint} role="status">{saved ? "Changes saved." : "Your progress saves when you continue."}</p></div>
          </form>
        </section>
      </div>}
    </main><Footer />
  </>;
}

export default function EditProfilePage() {
  return <Suspense fallback={<main data-account-workspace aria-busy="true" className="min-h-screen" />}><EditProfileContent /></Suspense>;
}
