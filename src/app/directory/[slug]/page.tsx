import Header from "@/components/Header";
import Footer from "@/components/Footer";
import Link from "@/components/Link";
import styles from "./page.module.css";
import { createClient } from "@/lib/supabase/server";
import { createStaticClient } from "@/lib/supabase/static";
import type {
  Member as SupabaseMember,
  MemberExperience,
  MemberLeadership,
} from "@/types/database";
import { notFound } from "next/navigation";
import { getNextAvailableTerm, getTermsWithStatus } from "@/lib/termUtils";
import type { Metadata } from "next";
import ProfileContent from "./ProfileContent";
import AdminReviewBar from "@/components/AdminReviewBar";
import type { EditableFields, ExperienceEntry, LeadershipEntry } from "@/components/InlineEdit";

export const revalidate = 30;

interface MemberWithRelations extends SupabaseMember {
  member_experiences: MemberExperience[];
  member_leadership: MemberLeadership[];
}

export async function generateStaticParams() {
  const supabase = createStaticClient();
  const { data: members } = await supabase
    .from("members")
    .select("slug")
    .eq("onboarding_completed", true)
    .eq("is_approved", true);

  return ((members || []) as { slug: string }[]).map((member) => ({
    slug: member.slug,
  }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const supabase = await createClient();

  const { data: member } = (await supabase
    .from("members")
    .select("first_name, last_name, profile_image_url")
    .eq("slug", slug)
    .single()) as {
    data: { first_name: string; last_name: string; profile_image_url: string | null } | null;
  };

  if (!member) {
    return { title: "Member Not Found | Design Waterloo" };
  }

  const title = `${member.first_name} ${member.last_name} | Design Waterloo`;
  const ogImage = member.profile_image_url || "/ogimage.png";

  return {
    title,
    openGraph: {
      title,
      images: [{ url: ogImage, width: 1200, height: 630 }],
    },
    twitter: {
      title,
      images: [ogImage],
    },
  };
}

export default async function PersonDetail({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const supabase = await createClient();

  const { data: member } = await supabase
    .from("members")
    .select(
      `
      *,
      member_experiences (*),
      member_leadership (*)
    `
    )
    .eq("slug", slug)
    .single<MemberWithRelations>();

  if (!member) {
    notFound();
  }

  // Only allow the member themselves or an admin to view unapproved profiles
  let isAdminPreview = false;
  if (!member.is_approved) {
    const { data: { user } } = await supabase.auth.getUser();
    const isOwner = user && member.auth_user_id === user.id;
    let isAdmin = false;
    if (user && !isOwner) {
      const { data: viewer } = (await supabase
        .from("members")
        .select("is_admin")
        .eq("auth_user_id", user.id)
        .maybeSingle()) as { data: { is_admin: boolean } | null };
      isAdmin = viewer?.is_admin ?? false;
    }
    if (!isOwner && !isAdmin) {
      notFound();
    }
    isAdminPreview = isAdmin;
  }

  const nextAvailableTerm = getNextAvailableTerm(member.work_schedule);
  const allTerms = getTermsWithStatus(member.work_schedule);

  // Fetch distinct programs for autocomplete suggestions
  const { data: programRows } = (await supabase
    .from("members")
    .select("program")
    .not("program", "is", null)
    .eq("onboarding_completed", true)) as { data: { program: string }[] | null };

  const programSuggestions = [
    ...new Set((programRows || []).map((r) => r.program).filter(Boolean)),
  ].sort();

  // Map to inline-edit shapes
  const initialFields: EditableFields = {
    program: member.program,
    graduating_class: member.graduating_class,
    bio: member.bio,
    public_email: member.public_email,
    specialties: member.specialties ?? [],
    work_schedule: member.work_schedule ?? [],
    profile_image_url: member.profile_image_url,
    linkedin: member.linkedin,
    portfolio: member.portfolio,
    instagram: member.instagram,
    twitter: member.twitter,
    github: member.github,
    behance: member.behance,
    dribbble: member.dribbble,
  };

  const initialExperiences: ExperienceEntry[] = member.member_experiences.map((exp) => ({
    id: exp.id,
    positionTitle: exp.position_title,
    company: exp.company,
    startMonth: exp.start_month,
    startYear: exp.start_year,
    isCurrent: exp.is_current,
  }));

  const initialLeadership: LeadershipEntry[] = member.member_leadership.map((lead) => ({
    id: lead.id,
    positionTitle: lead.position_title,
    org: lead.organization,
    startMonth: lead.start_month,
    startYear: lead.start_year,
    isCurrent: lead.is_current,
  }));

  return (
    <div>
      <Header />

      <main className="w-full">
        {member.is_approved && (
          <Link href={isAdminPreview ? "/admin" : "/directory"} className={styles.backButton}>
            ← Back to {isAdminPreview ? "admin" : "directory"}
          </Link>
        )}
        <ProfileContent
          memberSlug={member.slug}
          firstName={member.first_name}
          lastName={member.last_name}
          school={member.school}
          publicEmail={member.public_email}
          isApproved={member.is_approved}
          nextAvailableTerm={nextAvailableTerm}
          allTerms={allTerms}
          initialFields={initialFields}
          initialExperiences={initialExperiences}
          initialLeadership={initialLeadership}
          programSuggestions={programSuggestions}
        />
      </main>

      <Footer />

      {isAdminPreview && (
        <AdminReviewBar
          memberId={member.id}
          memberName={`${member.first_name} ${member.last_name}`}
        />
      )}
    </div>
  );
}
