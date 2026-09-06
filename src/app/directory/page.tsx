import { Suspense } from "react";
import { createStaticClient } from "@/lib/supabase/static";
import { Member } from "@/sanity/types";
import { Member as SupabaseMember } from "@/types/database";
import { TEST_ACCOUNT_EMAIL_SUFFIX } from "@/lib/supabase/test-accounts";
import DirectoryClient from "./DirectoryClient";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Directory | Design Waterloo",
  openGraph: {
    title: "Directory | Design Waterloo",
    images: [{ url: "/ogimage.png", width: 1200, height: 630 }],
  },
  twitter: {
    title: "Directory | Design Waterloo",
    images: ["/ogimage.png"],
  },
};

export const revalidate = 30;

export default async function DirectoryPage() {
  const supabase = createStaticClient();

  const { data } = await supabase
    .from("members")
    .select("id, created_at, member_id, first_name, last_name, slug, profile_image_url, school, program, graduating_class, specialties, work_schedule")
    .eq("onboarding_completed", true)
    .eq("is_approved", true)
    .not("school_email", "ilike", `%${TEST_ACCOUNT_EMAIL_SUFFIX}`)
    .order("member_id", { ascending: true });

  const supabaseMembers = (data || []) as SupabaseMember[];

  // Transform Supabase data to match existing Member interface
  const members: Member[] = (supabaseMembers || []).map((m) => ({
    _id: m.id,
    _type: "member",
    _createdAt: m.created_at,
    memberId: m.member_id,
    firstName: m.first_name,
    lastName: m.last_name,
    slug: { current: m.slug },
    profileImage: m.profile_image_url
      ? {
          _type: "image",
          asset: {
            url: m.profile_image_url,
          },
        }
      : undefined,
    school: m.school as Member["school"],
    program: m.program || undefined,
    graduatingClass: m.graduating_class || undefined,
    specialties: m.specialties,
    workSchedule: m.work_schedule,
  }));

  return <Suspense fallback={<main className="min-h-screen" aria-label="Loading directory" />}><DirectoryClient members={members} /></Suspense>;
}
