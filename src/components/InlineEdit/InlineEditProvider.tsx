"use client";

import {
  createContext,
  useContext,
  useCallback,
  useState,
  useRef,
  useEffect,
  useMemo,
  ReactNode,
} from "react";
import { useAuth } from "@/components/auth/AuthProvider";
import { createClient } from "@/lib/supabase/client";
import type { ReviewStatus } from "@/types/database";

// ---------- Types ----------

export interface ExperienceEntry {
  id?: string;
  positionTitle: string | null;
  company: string;
  startMonth: string | null;
  startYear: string | null;
  isCurrent: boolean;
  isIncoming?: boolean;
  link?: string | null;
}

export interface LeadershipEntry {
  id?: string;
  positionTitle: string | null;
  org: string;
  startMonth: string | null;
  startYear: string | null;
  isCurrent: boolean;
  isIncoming?: boolean;
  link?: string | null;
}

/** Flat member fields that can be edited inline. */
export type EditableFields = {
  program: string | null;
  graduating_class: string | null;
  bio: string | null;
  public_email: string | null;
  specialties: string[];
  work_schedule: string[];
  profile_image_url: string | null;
  // Social links
  linkedin: string | null;
  portfolio: string | null;
  instagram: string | null;
  twitter: string | null;
  github: string | null;
  behance: string | null;
  dribbble: string | null;
};

interface InlineEditContextType {
  isOwner: boolean;
  /** Whether the user has opted into edit mode */
  editMode: boolean;
  /** Toggle edit mode on/off */
  setEditMode: (on: boolean) => void;
  /** Current working values (reflect unsaved edits) */
  fields: EditableFields;
  experiences: ExperienceEntry[];
  leadership: LeadershipEntry[];
  /** Whether any field has been modified */
  isDirty: boolean;
  /** Whether a save is in-flight */
  saving: boolean;
  /** True for a few seconds after a successful save */
  savedRecently: boolean;
  /** Last save error message, null if no error */
  saveError: string | null;
  /** Current review status */
  reviewStatus: ReviewStatus;
  /** Update a flat field */
  setField: <K extends keyof EditableFields>(key: K, value: EditableFields[K]) => void;
  /** Update a field that was already persisted server-side (e.g. image upload). Flashes the save toast. */
  setFieldPersisted: <K extends keyof EditableFields>(key: K, value: EditableFields[K]) => void;
  /** Replace the entire experiences list */
  setExperiences: (entries: ExperienceEntry[]) => void;
  /** Replace the entire leadership list */
  setLeadership: (entries: LeadershipEntry[]) => void;
  /** Persist all pending changes to Supabase */
  save: () => Promise<void>;
  /** Save and submit for review */
  submitForReview: () => Promise<void>;
  /** Revert all unsaved edits */
  discard: () => void;
}

const InlineEditContext = createContext<InlineEditContextType | null>(null);

// ---------- Provider ----------

interface ProviderProps {
  memberSlug: string;
  initialFields: EditableFields;
  initialExperiences: ExperienceEntry[];
  initialLeadership: LeadershipEntry[];
  initialReviewStatus?: ReviewStatus;
  children: ReactNode;
}

export function InlineEditProvider({
  memberSlug,
  initialFields,
  initialExperiences,
  initialLeadership,
  initialReviewStatus = "draft",
  children,
}: ProviderProps) {
  const { member, refreshMember } = useAuth();
  const supabase = useMemo(() => createClient(), []);

  const isOwner = !!member && member.slug === memberSlug;
  const reviewStatus: ReviewStatus = (member?.review_status as ReviewStatus) ?? initialReviewStatus;

  // Snapshot of the last-saved state (updated after successful save)
  const savedFields = useRef<EditableFields>({ ...initialFields });
  const savedExperiences = useRef<ExperienceEntry[]>([...initialExperiences]);
  const savedLeadership = useRef<LeadershipEntry[]>([...initialLeadership]);

  const [fields, setFields] = useState<EditableFields>({ ...initialFields });
  const [experiences, setExperiences] = useState<ExperienceEntry[]>([...initialExperiences]);
  const [leadership, setLeadership] = useState<LeadershipEntry[]>([...initialLeadership]);
  const [editMode, setEditMode] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savedRecently, setSavedRecently] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const savedTimerRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const savingRef = useRef(false);

  // Auto-clear savedRecently after 3 seconds
  useEffect(() => {
    return () => {
      if (savedTimerRef.current) clearTimeout(savedTimerRef.current);
    };
  }, []);

  // Dirty check — deep compare current vs saved (defined here so the
  // beforeunload effect below can depend on it).
  const isDirty =
    JSON.stringify(fields) !== JSON.stringify(savedFields.current) ||
    JSON.stringify(experiences) !== JSON.stringify(savedExperiences.current) ||
    JSON.stringify(leadership) !== JSON.stringify(savedLeadership.current);

  // Native browser warning if the user tries to close/refresh/leave with
  // unsaved profile changes. Only handles browser-level navigation —
  // internal <Link> navigation is unaffected.
  useEffect(() => {
    if (!isDirty) return;
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      // returnValue is required for Chrome to show the prompt; the actual
      // string is ignored by modern browsers, which show a generic dialog.
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [isDirty]);

  const setField = useCallback(
    <K extends keyof EditableFields>(key: K, value: EditableFields[K]) => {
      setFields((prev) => ({ ...prev, [key]: value }));
    },
    []
  );

  const setFieldPersisted = useCallback(
    <K extends keyof EditableFields>(key: K, value: EditableFields[K]) => {
      setFields((prev) => ({ ...prev, [key]: value }));
      savedFields.current = { ...savedFields.current, [key]: value };
      // Flash the save toast
      setSavedRecently(true);
      if (savedTimerRef.current) clearTimeout(savedTimerRef.current);
      savedTimerRef.current = setTimeout(() => setSavedRecently(false), 3000);
    },
    []
  );

  const discard = useCallback(() => {
    setFields({ ...savedFields.current });
    setExperiences([...savedExperiences.current]);
    setLeadership([...savedLeadership.current]);
    setEditMode(false);
    setSaveError(null);
  }, []);

  const save = useCallback(async () => {
    console.log("[InlineEdit] save called, isOwner:", isOwner, "member:", member?.id);
    if (!isOwner || !member) {
      console.error("[InlineEdit] save aborted: isOwner=", isOwner, "member=", member);
      return;
    }
    // Synchronous concurrency guard — prevents rapid double-clicks
    if (savingRef.current) {
      console.log("[InlineEdit] save blocked by concurrency guard");
      return;
    }
    savingRef.current = true;
    setSaving(true);
    setSaveError(null);

    try {
      // 1. Update flat member fields via JS client (handles token refresh automatically)
      const updatePayload = {
        program: fields.program,
        graduating_class: fields.graduating_class,
        bio: fields.bio,
        public_email: fields.public_email,
        specialties: fields.specialties,
        work_schedule: fields.work_schedule,
        profile_image_url: fields.profile_image_url,
        linkedin: fields.linkedin,
        portfolio: fields.portfolio,
        instagram: fields.instagram,
        twitter: fields.twitter,
        github: fields.github,
        behance: fields.behance,
        dribbble: fields.dribbble,
      };

      console.log("[InlineEdit] Starting update...");
      const { data, error: updateError } = await supabase
        .from("members")
        .update(updatePayload)
        .eq("id", member.id)
        .select();

      if (updateError) {
        console.error("[InlineEdit] Update error:", updateError);
        throw new Error(updateError.message);
      }
      if (!data || data.length === 0) {
        // Zero rows from an UPDATE under RLS means the policy refused it (the
        // row isn't linked to this auth user) — NOT an expired session. Saying
        // "session expired" here sent people into pointless sign-out loops.
        throw new Error(
          "Couldn't save — your account isn't linked to this profile. Refresh the page; if this keeps happening, contact us."
        );
      }
      console.log("[InlineEdit] Update done, rows:", data.length);

      // 2. Sync experiences and leadership in parallel (independent tables)
      console.log("[InlineEdit] Syncing experiences & leadership...");
      await Promise.all([
        (async () => {
          const { error: delExpError } = await supabase
            .from("member_experiences")
            .delete()
            .eq("member_id", member.id);
          if (delExpError) throw new Error(delExpError.message);

          if (experiences.length > 0) {
            const { error: expError } = await supabase
              .from("member_experiences")
              .insert(
                experiences.map((e) => ({
                  member_id: member.id,
                  position_title: e.positionTitle,
                  company: e.company,
                  start_month: e.startMonth,
                  start_year: e.startYear,
                  is_current: e.isCurrent,
                  link: e.link ?? null,
                }))
              );
            if (expError) throw new Error(expError.message);
          }
        })(),
        (async () => {
          const { error: delLeadError } = await supabase
            .from("member_leadership")
            .delete()
            .eq("member_id", member.id);
          if (delLeadError) throw new Error(delLeadError.message);

          if (leadership.length > 0) {
            const { error: leadError } = await supabase
              .from("member_leadership")
              .insert(
                leadership.map((l) => ({
                  member_id: member.id,
                  position_title: l.positionTitle,
                  organization: l.org,
                  start_month: l.startMonth,
                  start_year: l.startYear,
                  is_current: l.isCurrent,
                  link: l.link ?? null,
                }))
              );
            if (leadError) throw new Error(leadError.message);
          }
        })(),
      ]);

      console.log("[InlineEdit] Experiences & leadership synced");
      // 3. Update saved snapshots
      savedFields.current = { ...fields };
      savedExperiences.current = [...experiences];
      savedLeadership.current = [...leadership];

      // 4. Exit edit mode and show "Saved" confirmation
      setEditMode(false);
      setSavedRecently(true);
      if (savedTimerRef.current) clearTimeout(savedTimerRef.current);
      savedTimerRef.current = setTimeout(() => setSavedRecently(false), 3000);
    } catch (err) {
      console.error("Failed to save profile:", err);
      setSaveError(
        err instanceof Error ? err.message : "Failed to save. Please try again."
      );
    } finally {
      savingRef.current = false;
      setSaving(false);
    }

    // Non-critical post-save work (don't block UI)
    refreshMember().catch(() => {});
    fetch("/api/revalidate-profile", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ slug: memberSlug }),
    }).catch(() => {});
  }, [isOwner, member, supabase, fields, experiences, leadership, memberSlug, refreshMember]);

  const submitForReview = useCallback(async () => {
    // First save any pending changes
    await save();

    // Then update review_status
    if (!isOwner || !member) return;

    const { error: submitError } = await supabase
      .from("members")
      .update({
        review_status: "pending_review" as const,
        submitted_at: new Date().toISOString(),
        is_approved: false,
      })
      .eq("id", member.id);

    if (submitError) {
      setSaveError(submitError.message);
      return;
    }

    setSavedRecently(true);
    if (savedTimerRef.current) clearTimeout(savedTimerRef.current);
    savedTimerRef.current = setTimeout(() => setSavedRecently(false), 3000);

    refreshMember().catch(() => {});
  }, [save, isOwner, member, supabase, refreshMember]);

  return (
    <InlineEditContext.Provider
      value={{
        isOwner,
        editMode,
        setEditMode,
        fields,
        experiences,
        leadership,
        isDirty,
        saving,
        savedRecently,
        saveError,
        reviewStatus,
        setField,
        setFieldPersisted,
        setExperiences,
        setLeadership,
        save,
        submitForReview,
        discard,
      }}
    >
      {children}
    </InlineEditContext.Provider>
  );
}

export function useInlineEdit() {
  const ctx = useContext(InlineEditContext);
  if (!ctx) throw new Error("useInlineEdit must be inside InlineEditProvider");
  return ctx;
}
