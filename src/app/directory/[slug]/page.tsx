import Header from "@/components/Header";
import Footer from "@/components/Footer";
import Image from "next/image";
import styles from "./page.module.css";
import Button from "@/components/Button";
import Link from "@/components/Link";
import { client } from "@/sanity/lib/client";
import { memberBySlugQuery, memberSlugsQuery } from "@/sanity/queries";
import { urlFor } from "@/sanity/lib/image";
import type { Member } from "@/sanity/types";
import { notFound } from "next/navigation";
import { getNextAvailableTerm, getTermsWithStatus } from "@/lib/termUtils";

export async function generateStaticParams() {
  const members = await client.fetch<{ slug: string }[]>(memberSlugsQuery);
  return members.map((member) => ({
    slug: member.slug,
  }));
}

export default async function PersonDetail({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const member = await client.fetch<Member>(memberBySlugQuery, { slug });

  if (!member) {
    notFound();
  }

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
          <div className={styles.content}>
            {nextAvailableTerm && (
              <div className={`${styles.infoRow} ${styles.infoRowCentered}`}>
                <dt className={styles.label}>Next available</dt>
                <dd>
                  <Button variant="secondary">{nextAvailableTerm} ↗</Button>
                </dd>
              </div>
            )}
            <h1>{member.firstName} {member.lastName}</h1>
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
                  {member.experience.map((exp, index) => (
                    <div key={index} className={styles.experienceItem}>
                      <div className={styles.experienceInfo}>
                        <p className={styles.jobTitle}>{exp.positionTitle}</p>
                        <p className={styles.companyName}>{exp.company}</p>
                      </div>
                      <span className={styles.year}>
                        {new Date(exp.dateStart).getFullYear()}
                        {exp.isCurrent ? ' - Present' : ''}
                      </span>
                    </div>
                  ))}
                </dd>
              </dl>
            )}
            {member.leadership && member.leadership.length > 0 && (
              <dl className={styles.experienceGroup}>
                <dt className={styles.label}>Leadership</dt>
                <dd className={styles.experienceList}>
                  {member.leadership.map((lead, index) => (
                    <div key={index} className={styles.experienceItem}>
                      <div className={styles.experienceInfo}>
                        <p className={styles.jobTitle}>{lead.positionTitle}</p>
                        <p className={styles.companyName}>{lead.org}</p>
                      </div>
                      <span className={styles.year}>
                        {new Date(lead.dateStart).getFullYear()}
                        {lead.isCurrent ? ' - Present' : ''}
                      </span>
                    </div>
                  ))}
                </dd>
              </dl>
            )}
          </div>
          <div className={styles.imageContainer}>
            {member.profileImage && (
              <Image
                src={urlFor(member.profileImage).width(800).height(1067).url()}
                alt={`${member.firstName} ${member.lastName}`}
                width={800}
                height={1067}
                className= {styles.image}
                priority
              />
            )}
            <div className={styles.tradingCard}>
              <p className={styles.tradingCardName}>{member.firstName} {member.lastName}</p>
              <div className={styles.tradingCardLinks}>
                {member.portfolio && (
                  <a href={member.portfolio} target="_blank" rel="noopener noreferrer">
                    {member.portfolio.replace(/^https?:\/\/(www\.)?/, '').replace(/\/$/, '')}
                  </a>
                )}
                {member.linkedin && (
                  <a href={member.linkedin} target="_blank" rel="noopener noreferrer">linkedin</a>
                )}
                {member.behance && (
                  <a href={member.behance} target="_blank" rel="noopener noreferrer">behance</a>
                )}
                {member.dribbble && (
                  <a href={member.dribbble} target="_blank" rel="noopener noreferrer">dribbble</a>
                )}
                {member.instagram && (
                  <a href={member.instagram} target="_blank" rel="noopener noreferrer">instagram</a>
                )}
                {member.github && (
                  <a href={member.github} target="_blank" rel="noopener noreferrer">github</a>
                )}
                {member.twitter && (
                  <a href={member.twitter} target="_blank" rel="noopener noreferrer">twitter</a>
                )}
              </div>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
