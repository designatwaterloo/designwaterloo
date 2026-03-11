"use client";

import {
  createContext,
  useContext,
  useCallback,
  useState,
  useRef,
  useEffect,
  ReactNode,
} from "react";
import { useAuth } from "@/components/auth/AuthProvider";
import { createClient } from "@/lib/supabase/client";

// ---------- Types ----------

export interface ExperienceEntry {
  id?: string;
  positionTitle: string | null;
  company: string;
  startMonth: string | null;
  startYear: string | null;
  isCurrent: boolean;
}

export interface LeadershipEntry {
  id?: string;
  positionTitle: string | null;
  org: string;
  startMonth: string | null;
  startYear: string | null;
  isCurrent: boolean;
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
  /** Update a flat field */
  setField: <K extends keyof EditableFields>(key: K, value: EditableFields[K]) => void;
  /** Replace the entire experiences list */
  setExperiences: (entries: ExperienceEntry[]) => void;
  /** Replace the entire leadership list */
  setLeadership: (entries: LeadershipEntry[]) => void;
  /** Persist all pending changes to Supabase */
  save: () => Promise<void>;
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
  children: ReactNode;
}

export function InlineEditProvider({
  memberSlug,
  initialFields,
  initialExperiences,
  initialLeadership,
  children,
}: ProviderProps) {
  const { member, refreshMember } = useAuth();
  const supabase = createClient();

  const isOwner = !!member && member.slug === memberSlug;

  // Snapshot of the last-saved state (updated after successful save)
  const savedFields = useRef<EditableFields>({ ...initialFields });
  const savedExperiences = useRef<ExperienceEntry[]>([...initialExperiences]);
  const savedLeadership = useRef<LeadershipEntry[]>([...initialLeadership]);

  const [fields, setFields] = useState<EditableFields>({ ...initialFields });
  const [experiences, setExperiences] = useState<ExperienceEntry[]>([...initialExperiences]);
  const [leadership, setLeadership] = useState<LeadershipEntry[]>([...initialLeadership]);
  const [saving, setSaving] = useState(false);
  const [savedRecently, setSavedRecently] = useState(false);
  const savedTimerRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  // Auto-clear savedRecently after 3 seconds
  useEffect(() => {
    return () => {
      if (savedTimerRef.current) clearTimeout(savedTimerRef.current);
    };
  }, []);

  // Dirty check — deep compare current vs saved
  const isDirty =
    JSON.stringify(fields) !== JSON.stringify(savedFields.current) ||
    JSON.stringify(experiences) !== JSON.stringify(savedExperiences.current) ||
    JSON.stringify(leadership) !== JSON.stringify(savedLeadership.current);

  const setField = useCallback(
    <K extends keyof EditableFields>(key: K, value: EditableFields[K]) => {
      setFields((prev) => ({ ...prev, [key]: value }));
    },
    []
  );

  const discard = useCallback(() => {
    setFields({ ...savedFields.current });
    setExperiences([...savedExperiences.current]);
    setLeadership([...savedLeadership.current]);
  }, []);

  const save = useCallback(async () => {
    if (!isOwner || !member) return;
    setSaving(true);

    try {
      // 1. Update flat member fields
      const { error: memberError } = await supabase
        .from("members")
        .update({
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
        } as never)
        .eq("id", member.id);

      if (memberError) throw memberError;

      // 2. Sync experiences — delete all then re-insert
      await supabase
        .from("member_experiences")
        .delete()
        .eq("member_id", member.id);

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
            })) as never[]
          );
        if (expError) throw expError;
      }

      // 3. Sync leadership
      await supabase
        .from("member_leadership")
        .delete()
        .eq("member_id", member.id);

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
            })) as never[]
          );
        if (leadError) throw leadError;
      }

      // 4. Revalidate
      try {
        await fetch("/api/revalidate-profile", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ slug: memberSlug }),
        });
      } catch {
        // non-critical
      }

      // 5. Update saved snapshots
      savedFields.current = { ...fields };
      savedExperiences.current = [...experiences];
      savedLeadership.current = [...leadership];

      await refreshMember();

      // 6. Show "Saved" confirmation
      setSavedRecently(true);
      if (savedTimerRef.current) clearTimeout(savedTimerRef.current);
      savedTimerRef.current = setTimeout(() => setSavedRecently(false), 3000);
    } catch (err) {
      console.error("Failed to save profile:", err);
    } finally {
      setSaving(false);
    }
  }, [isOwner, member, fields, experiences, leadership, memberSlug, supabase, refreshMember]);

  return (
    <InlineEditContext.Provider
      value={{
        isOwner,
        fields,
        experiences,
        leadership,
        isDirty,
        saving,
        savedRecently,
        setField,
        setExperiences,
        setLeadership,
        save,
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
