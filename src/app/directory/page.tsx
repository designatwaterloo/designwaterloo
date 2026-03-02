import { createClient } from "@/lib/supabase/server";
import { Member } from "@/sanity/types";
import { Member as SupabaseMember } from "@/types/database";
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
  const supabase = await createClient();

  const { data } = await supabase
    .from("members")
    .select("*")
    .eq("onboarding_completed", true)
    .eq("is_approved", true)
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

  return <DirectoryClient members={members} />;
}
