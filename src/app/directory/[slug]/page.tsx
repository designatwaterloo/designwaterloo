import Header from "@/components/Header";
import Footer from "@/components/Footer";
import Image from "next/image";
import styles from "./page.module.css";
import Button from "@/components/Button";
import { client } from "@/sanity/lib/client";
import { memberBySlugQuery, memberSlugsQuery } from "@/sanity/queries";
import { urlFor } from "@/sanity/lib/image";
import type { Member } from "@/sanity/types";
import { notFound } from "next/navigation";

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

  return (
    <div>
      <Header />

      <main>
        <section className={styles.section}>
          <div className={styles.content}>
            <div className={`${styles.infoRow} ${styles.infoRowCentered}`}>
              <dt className={styles.label}>Next available</dt>
              <dd>
                <Button variant="secondary">Summer 2026 ↗</Button>
              </dd>
            </div>
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
            <div className={styles.rowGroup}>
              <div className={styles.infoRow}>
                <dt className={styles.label}>Bio</dt>
                <dd>Lorem ipsum dolor sit amet consectetur adipisicing elit. Quisquam, quos. Lorem ipsum dolor sit amet consectetur adipisicing elit. Quisquam, quos.</dd>
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
                <a href="https://braydenpetersen.com" target="_blank" rel="noopener noreferrer">braydenpetersen.com</a>
                <a href="https://linkedin.com/in/braydenpetersen" target="_blank" rel="noopener noreferrer">linkedin</a>
                <a href="https://twitter.com/braydenpetersen" target="_blank" rel="noopener noreferrer">twitter</a>
                <a href="https://instagram.com/braydenpetersen" target="_blank" rel="noopener noreferrer">instagram</a>
              </div>
            </div>
          </div>
        </section>

        <section className={styles.section}>
          <div className={`${styles.infoRow} ${styles.infoRowFull}`}>
            <dt className={styles.label}>Label</dt>
            <dd>Content goes here</dd>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
