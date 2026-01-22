import Header from "@/components/Header";
import Footer from "@/components/Footer";
import Image from "next/image";
import styles from "./page.module.css";
import Button from "@/components/Button";
import Link from "@/components/Link";
import { createClient } from "@/lib/supabase/server";
import { createStaticClient } from "@/lib/supabase/static";
import type {
  Member as SupabaseMember,
  MemberExperience,
  MemberLeadership,
} from "@/types/database";
import { notFound } from "next/navigation";
import { getNextAvailableTerm, getTermsWithStatus } from "@/lib/termUtils";
import { ensureHttps } from "@/lib/urlUtils";
import type { Metadata } from "next";

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
    .eq("onboarding_completed", true);

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

  const nextAvailableTerm = getNextAvailableTerm(member.work_schedule);
  const allTerms = getTermsWithStatus(member.work_schedule);

  // Map experience and leadership to expected format
  const experience = member.member_experiences.map((exp) => ({
    positionTitle: exp.position_title,
    company: exp.company,
    startMonth: exp.start_month,
    startYear: exp.start_year,
    isCurrent: exp.is_current,
  }));

  const leadership = member.member_leadership.map((lead) => ({
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
        <Link href="/directory" className={styles.backButton}>
          ← Back to directory
        </Link>
        <section className={styles.section}>
          <h1 className={styles.name}>
            {member.first_name} {member.last_name}
          </h1>
          <div className={styles.imageContainer}>
            {member.profile_image_url && (
              <Image
                src={member.profile_image_url}
                alt={`${member.first_name} ${member.last_name}`}
                width={800}
                height={1067}
                className={styles.image}
                priority
              />
            )}
            <div className={styles.tradingCard}>
              <p className={styles.tradingCardName}>
                {member.first_name} {member.last_name}
              </p>
              <div className={styles.tradingCardLinks}>
                {member.portfolio && (
                  <a
                    href={ensureHttps(member.portfolio)}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src="/globe.svg"
                      width={20}
                      height={20}
                      alt=""
                      className={styles.tradingCardIcon}
                    />
                    {member.portfolio
                      .replace(/^https?:\/\/(www\.)?/, "")
                      .replace(/\/$/, "")}
                  </a>
                )}
                {member.twitter && (
                  <a
                    href={ensureHttps(member.twitter)}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src="/twitter_logo.svg"
                      width={20}
                      height={20}
                      alt=""
                      className={styles.tradingCardIcon}
                    />
                    {member.twitter.match(
                      /(?:twitter\.com\/|x\.com\/|@)([^\/\?]+)/
                    )?.[1]
                      ? `@${member.twitter.match(/(?:twitter\.com\/|x\.com\/|@)([^\/\?]+)/)?.[1]}`
                      : "twitter"}
                  </a>
                )}
                {member.linkedin && (
                  <a
                    href={ensureHttps(member.linkedin)}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src="/linkedin_logo.svg"
                      width={20}
                      height={20}
                      alt=""
                      className={styles.tradingCardIcon}
                    />
                    {member.linkedin.match(/\/in\/([^\/\?]+)/)?.[1]
                      ? `in/${member.linkedin.match(/\/in\/([^\/\?]+)/)?.[1]}`
                      : "linkedin"}
                  </a>
                )}
                {member.instagram && (
                  <a
                    href={ensureHttps(member.instagram)}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src="/instagram_logo.svg"
                      width={20}
                      height={20}
                      alt=""
                      className={styles.tradingCardIcon}
                    />
                    {member.instagram.match(
                      /(?:instagram\.com\/|@)([^\/\?]+)/
                    )?.[1]
                      ? `@${member.instagram.match(/(?:instagram\.com\/|@)([^\/\?]+)/)?.[1]}`
                      : "instagram"}
                  </a>
                )}
                {member.github && (
                  <a
                    href={ensureHttps(member.github)}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src="/github_logo.svg"
                      width={20}
                      height={20}
                      alt=""
                      className={styles.tradingCardIcon}
                    />
                    {member.github.match(/(?:github\.com\/)([^\/\?]+)/)?.[1] ||
                      "github"}
                  </a>
                )}
                {member.behance && (
                  <a
                    href={ensureHttps(member.behance)}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    behance
                  </a>
                )}
                {member.dribbble && (
                  <a
                    href={ensureHttps(member.dribbble)}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    dribbble
                  </a>
                )}
              </div>
            </div>
          </div>
          {nextAvailableTerm && member.public_email && (
            <div className={styles.nextAvailable}>
              <dt className={styles.label}>Next available</dt>
              <dd>
                <Button
                  variant="secondary"
                  href={`mailto:${member.public_email}`}
                  icon="/mail.svg"
                >
                  {nextAvailableTerm}
                </Button>
              </dd>
            </div>
          )}
          <div className={styles.content}>
            <div className={styles.rowGroup}>
              {member.school && (
                <div className={styles.infoRow}>
                  <dt className={styles.label}>School</dt>
                  <dd>{member.school}</dd>
                </div>
              )}
              {member.program && (
                <div className={styles.infoRow}>
                  <dt className={styles.label}>Program</dt>
                  <dd>{member.program}</dd>
                </div>
              )}
              {member.graduating_class && (
                <div className={styles.infoRow}>
                  <dt className={styles.label}>Class</dt>
                  <dd>{member.graduating_class}</dd>
                </div>
              )}
            </div>
            {member.specialties && member.specialties.length > 0 && (
              <div className={styles.rowGroup}>
                <div className={styles.infoRow}>
                  <dt className={styles.label}>Specialties</dt>
                  <dd>
                    <div className="flex flex-wrap gap-2">
                      {member.specialties.slice(0, 5).map((specialty) => (
                        <span
                          key={specialty}
                          className="px-3 py-1 bg-[var(--foreground)] text-[var(--background)] rounded-full text-sm"
                        >
                          {specialty}
                        </span>
                      ))}
                    </div>
                  </dd>
                </div>
              </div>
            )}
            {allTerms.length > 0 && (
              <div className={styles.rowGroup}>
                <div className={styles.infoRow}>
                  <dt className={styles.label}>Work terms</dt>
                  <dd>
                    <div className="flex flex-wrap gap-2">
                      {allTerms.map((term) => (
                        <span
                          key={term.code}
                          className={`px-3 py-1 border-2 rounded-full text-sm ${
                            term.isPast
                              ? "border-[var(--muted)] text-[var(--muted)] line-through"
                              : "border-[var(--foreground)] text-[var(--foreground)]"
                          }`}
                        >
                          {term.displayName}
                        </span>
                      ))}
                    </div>
                  </dd>
                </div>
              </div>
            )}
            {member.bio && (
              <div className={styles.rowGroup}>
                <div className={styles.infoRow}>
                  <dt className={styles.label}>Bio</dt>
                  <dd>{member.bio}</dd>
                </div>
              </div>
            )}
            {experience.length > 0 && (
              <dl className={styles.experienceGroup}>
                <dt className={styles.label}>Experience</dt>
                <dd className={styles.experienceList}>
                  {[...experience]
                    .sort((a, b) => {
                      if (a.isCurrent && !b.isCurrent) return -1;
                      if (!a.isCurrent && b.isCurrent) return 1;
                      const yearA = a.startYear ? parseInt(a.startYear) : 0;
                      const yearB = b.startYear ? parseInt(b.startYear) : 0;
                      if (yearA !== yearB) return yearB - yearA;
                      const monthA = a.startMonth ? parseInt(a.startMonth) : 0;
                      const monthB = b.startMonth ? parseInt(b.startMonth) : 0;
                      return monthB - monthA;
                    })
                    .map((exp, index) => (
                      <div key={index} className={styles.experienceItem}>
                        <div className={styles.experienceInfo}>
                          {exp.positionTitle && (
                            <p className={styles.jobTitle}>{exp.positionTitle}</p>
                          )}
                          <p className={styles.companyName}>{exp.company}</p>
                        </div>
                        {exp.startYear && (
                          <span className={styles.year}>
                            {exp.startYear}
                            {exp.isCurrent ? " - Present" : ""}
                          </span>
                        )}
                      </div>
                    ))}
                </dd>
              </dl>
            )}
            {leadership.length > 0 && (
              <dl className={styles.experienceGroup}>
                <dt className={styles.label}>Leadership</dt>
                <dd className={styles.experienceList}>
                  {[...leadership]
                    .sort((a, b) => {
                      if (a.isCurrent && !b.isCurrent) return -1;
                      if (!a.isCurrent && b.isCurrent) return 1;
                      const yearA = a.startYear ? parseInt(a.startYear) : 0;
                      const yearB = b.startYear ? parseInt(b.startYear) : 0;
                      if (yearA !== yearB) return yearB - yearA;
                      const monthA = a.startMonth ? parseInt(a.startMonth) : 0;
                      const monthB = b.startMonth ? parseInt(b.startMonth) : 0;
                      return monthB - monthA;
                    })
                    .map((lead, index) => (
                      <div key={index} className={styles.experienceItem}>
                        <div className={styles.experienceInfo}>
                          {lead.positionTitle && (
                            <p className={styles.jobTitle}>{lead.positionTitle}</p>
                          )}
                          <p className={styles.companyName}>{lead.org}</p>
                        </div>
                        {lead.startYear && (
                          <span className={styles.year}>
                            {lead.startYear}
                            {lead.isCurrent ? " - Present" : ""}
                          </span>
                        )}
                      </div>
                    ))}
                </dd>
              </dl>
            )}
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
