import Header from "@/components/Header";
import Footer from "@/components/Footer";
import Image from "next/image";
import styles from "./page.module.css";
import Button from "@/components/Button";
import Link from "@/components/Link";
import { client } from "@/sanity/lib/client";
import { memberBySlugQuery, memberSlugsQuery, projectsByMemberQuery } from "@/sanity/queries";
import { urlFor, getBlurDataURL } from "@/sanity/lib/image";
import type { Member, Project, FeaturedMedia } from "@/sanity/types";
import { notFound } from "next/navigation";
import { getNextAvailableTerm, getTermsWithStatus } from "@/lib/termUtils";
import { ensureHttps } from "@/lib/urlUtils";
import type { Metadata } from "next";

// Revalidate every 30 seconds
export const revalidate = 30;

export async function generateStaticParams() {
  const members = await client.fetch<{ slug: string }[]>(memberSlugsQuery);
  return members.map((member) => ({
    slug: member.slug,
  }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const member = await client.fetch<Member>(memberBySlugQuery, { slug });
  
  if (!member) {
    return { title: "Member Not Found | Design Waterloo" };
  }
  
  const title = `${member.firstName} ${member.lastName} | Design Waterloo`;
  
  const ogImage = member.profileImage 
    ? urlFor(member.profileImage).width(1200).height(630).url()
    : '/ogimage.png';
  
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

export default async function PersonDetail({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const member = await client.fetch<Member>(memberBySlugQuery, { slug });

  if (!member) {
    notFound();
  }

  // Fetch projects where this member is credited
  type MemberProject = Pick<Project, '_id' | 'title' | 'slug' | 'yearCompleted' | 'client' | 'featuredMedia'> & { role?: string };
  const projects = await client.fetch<MemberProject[]>(projectsByMemberQuery, { memberId: member._id });

  const nextAvailableTerm = getNextAvailableTerm(member.workSchedule);
  const allTerms = getTermsWithStatus(member.workSchedule);

  return (
    <div>
      <Header />

      <main className="w-full">
        <Link href="/directory" className={styles.backButton}>
          ← Back to directory
        </Link>
        <section className={styles.section}>
          <h1 className={styles.name}>{member.firstName} {member.lastName}</h1>
          <div className={styles.imageContainer}>
            {member.profileImage && (
              <Image
                src={urlFor(member.profileImage).width(800).height(1067).url()}
                alt={`${member.firstName} ${member.lastName}`}
                width={800}
                height={1067}
                className={styles.image}
                priority
                placeholder={getBlurDataURL(member.profileImage) ? "blur" : "empty"}
                blurDataURL={getBlurDataURL(member.profileImage)}
              />
            )}
            <div className={styles.tradingCard}>
              <p className={styles.tradingCardName}>{member.firstName} {member.lastName}</p>
              <div className={styles.tradingCardLinks}>
                {member.portfolio && (
                  <a href={ensureHttps(member.portfolio)} target="_blank" rel="noopener noreferrer">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src="/globe.svg" width={20} height={20} alt="" className={styles.tradingCardIcon} />
                    {member.portfolio.replace(/^https?:\/\/(www\.)?/, '').replace(/\/$/, '')}
                  </a>
                )}
                {member.twitter && (
                  <a href={ensureHttps(member.twitter)} target="_blank" rel="noopener noreferrer">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src="/twitter_logo.svg" width={20} height={20} alt="" className={styles.tradingCardIcon} />
                    {member.twitter.match(/(?:twitter\.com\/|x\.com\/|@)([^\/\?]+)/)?.[1] ? `@${member.twitter.match(/(?:twitter\.com\/|x\.com\/|@)([^\/\?]+)/)?.[1]}` : 'twitter'}
                  </a>
                )}
                {member.linkedin && (
                  <a href={ensureHttps(member.linkedin)} target="_blank" rel="noopener noreferrer">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src="/linkedin_logo.svg" width={20} height={20} alt="" className={styles.tradingCardIcon} />
                    {member.linkedin.match(/\/in\/([^\/\?]+)/)?.[1] ? `in/${member.linkedin.match(/\/in\/([^\/\?]+)/)?.[1]}` : 'linkedin'}
                  </a>
                )}
                {member.instagram && (
                  <a href={ensureHttps(member.instagram)} target="_blank" rel="noopener noreferrer">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src="/instagram_logo.svg" width={20} height={20} alt="" className={styles.tradingCardIcon} />
                    {member.instagram.match(/(?:instagram\.com\/|@)([^\/\?]+)/)?.[1] ? `@${member.instagram.match(/(?:instagram\.com\/|@)([^\/\?]+)/)?.[1]}` : 'instagram'}
                  </a>
                )}
                {member.github && (
                  <a href={ensureHttps(member.github)} target="_blank" rel="noopener noreferrer">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src="/github_logo.svg" width={20} height={20} alt="" className={styles.tradingCardIcon} />
                    {member.github.match(/(?:github\.com\/)([^\/\?]+)/)?.[1] || 'github'}
                  </a>
                )}
                {member.behance && (
                  <a href={ensureHttps(member.behance)} target="_blank" rel="noopener noreferrer">behance</a>
                )}
                {member.dribbble && (
                  <a href={ensureHttps(member.dribbble)} target="_blank" rel="noopener noreferrer">dribbble</a>
                )}
              </div>
            </div>
          </div>
          {nextAvailableTerm && member.publicEmail && (
            <div className={styles.nextAvailable}>
              <dt className={styles.label}>Next available</dt>
              <dd>
                <Button variant="secondary" href={`mailto:${member.publicEmail}`} icon="/mail.svg">
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
              {member.graduatingClass && (
                <div className={styles.infoRow}>
                  <dt className={styles.label}>Class</dt>
                  <dd>{member.graduatingClass}</dd>
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
                              ? 'border-[var(--muted)] text-[var(--muted)] line-through'
                              : 'border-[var(--foreground)] text-[var(--foreground)]'
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
            <div className={styles.rowGroup}>
              <div className={styles.infoRow}>
                <dt className={styles.label}>Bio</dt>
                <dd>{member.bio?.map((block) => block.children.map((child) => child.text)).join('')}</dd>
              </div>
            </div>
            {member.experience && member.experience.length > 0 && (
              <dl className={styles.experienceGroup}>
                <dt className={styles.label}>Experience</dt>
                <dd className={styles.experienceList}>
                  {[...member.experience]
                    .sort((a, b) => {
                      // Current positions first
                      if (a.isCurrent && !b.isCurrent) return -1;
                      if (!a.isCurrent && b.isCurrent) return 1;
                      // Then by year (latest first)
                      const yearA = a.startYear ? parseInt(a.startYear) : 0;
                      const yearB = b.startYear ? parseInt(b.startYear) : 0;
                      if (yearA !== yearB) return yearB - yearA;
                      // Then by month within year
                      const monthA = a.startMonth ? parseInt(a.startMonth) : 0;
                      const monthB = b.startMonth ? parseInt(b.startMonth) : 0;
                      return monthB - monthA;
                    })
                    .map((exp, index) => (
                    <div key={index} className={styles.experienceItem}>
                      <div className={styles.experienceInfo}>
                        {exp.positionTitle && <p className={styles.jobTitle}>{exp.positionTitle}</p>}
                        <p className={styles.companyName}>{exp.company}</p>
                      </div>
                      {exp.startYear && (
                        <span className={styles.year}>
                          {exp.startYear}
                          {exp.isCurrent ? ' - Present' : ''}
                        </span>
                      )}
                    </div>
                  ))}
                </dd>
              </dl>
            )}
            {member.leadership && member.leadership.length > 0 && (
              <dl className={styles.experienceGroup}>
                <dt className={styles.label}>Leadership</dt>
                <dd className={styles.experienceList}>
                  {[...member.leadership]
                    .sort((a, b) => {
                      // Current positions first
                      if (a.isCurrent && !b.isCurrent) return -1;
                      if (!a.isCurrent && b.isCurrent) return 1;
                      // Then by year (latest first)
                      const yearA = a.startYear ? parseInt(a.startYear) : 0;
                      const yearB = b.startYear ? parseInt(b.startYear) : 0;
                      if (yearA !== yearB) return yearB - yearA;
                      // Then by month within year
                      const monthA = a.startMonth ? parseInt(a.startMonth) : 0;
                      const monthB = b.startMonth ? parseInt(b.startMonth) : 0;
                      return monthB - monthA;
                    })
                    .map((lead, index) => (
                    <div key={index} className={styles.experienceItem}>
                      <div className={styles.experienceInfo}>
                        {lead.positionTitle && <p className={styles.jobTitle}>{lead.positionTitle}</p>}
                        <p className={styles.companyName}>{lead.org}</p>
                      </div>
                      {lead.startYear && (
                        <span className={styles.year}>
                          {lead.startYear}
                          {lead.isCurrent ? ' - Present' : ''}
                        </span>
                      )}
                    </div>
                  ))}
                </dd>
              </dl>
            )}
          </div>
        </section>

        {/* Work Projects Section */}
        {projects && projects.length > 0 && (
          <section className="grid-section !pt-0">
            <div className="col-span-full">
              <p className="text-[#7f7f7f] mb-[var(--gap)]">Work</p>
            </div>
            <div className="col-span-full grid grid-cols-4 gap-[var(--gap)] max-lg:grid-cols-2">
              {projects.map((project) => {
                const featuredImage = project.featuredMedia?.image;
                const imageUrl = featuredImage?.asset?.url;
                const lqip = featuredImage?.asset?.metadata?.lqip;
                
                return (
                  <Link
                    key={project._id}
                    href={`/work/${project.slug?.current}`}
                    className="flex flex-col gap-4 group"
                    underline={false}
                  >
                    {imageUrl ? (
                      <Image
                        src={imageUrl}
                        alt={project.featuredMedia?.alt || project.title}
                        width={800}
                        height={600}
                        className="w-full aspect-[4/3] object-cover rounded bg-[#d9d9d9]"
                        sizes="(max-width: 768px) 50vw, 25vw"
                        placeholder={lqip ? "blur" : "empty"}
                        blurDataURL={lqip}
                      />
                    ) : (
                      <div className="w-full aspect-[4/3] rounded bg-[#d9d9d9]" />
                    )}
                    <div className="flex flex-col gap-0">
                      <p className="text-[var(--foreground)]">{project.title}</p>
                      <p className="text-[#7f7f7f]">{project.role || project.client}</p>
                    </div>
                  </Link>
                );
              })}
            </div>
          </section>
        )}
      </main>

      <Footer />
    </div>
  );
}