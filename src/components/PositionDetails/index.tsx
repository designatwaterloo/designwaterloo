"use client";

import { useEffect, useRef } from 'react';
import type { ExperienceEntry, LeadershipEntry } from '@/components/InlineEdit/InlineEditProvider';
import { experienceAnchor } from '@/lib/experience-term-links';
import { ensureHttps } from '@/lib/urlUtils';
import styles from './position.module.css';
import { cityCountry } from '@/lib/position-location';

export default function PositionDetails({ entry, type }: { entry: ExperienceEntry | LeadershipEntry; type: 'experience' | 'leadership' }) {
  const ref = useRef<HTMLDetailsElement>(null);
  const bodyRef = useRef<HTMLDivElement>(null);
  const id = type === 'experience' && entry.id ? experienceAnchor(entry.id) : undefined;
  const organization = 'company' in entry ? entry.company : entry.org;
  const description = 'description' in entry ? entry.description : null;
  const location = cityCountry('location' in entry ? entry.location : null);
  let href: string | undefined;
  try {
    if (entry.link) {
      const url = new URL(ensureHttps(entry.link));
      if (['https:', 'http:'].includes(url.protocol)) href = url.href;
    }
  } catch { /* Invalid saved links are not exposed as navigation. */ }
  useEffect(() => {
    const reveal = () => {
      if (id && window.location.hash === `#${id}` && ref.current) ref.current.open = true;
    };
    reveal();
    window.addEventListener('hashchange', reveal);
    return () => window.removeEventListener('hashchange', reveal);
  }, [id]);
  return <details ref={ref} id={id} name="profile-positions" className={styles.position} tabIndex={-1} onToggle={event => {
    const body = bodyRef.current;
    if (!body) return;
    body.getAnimations().forEach(animation => animation.cancel());
    if (event.currentTarget.open && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      body.animate([{ height: '0px', opacity: 0 }, { height: `${body.scrollHeight}px`, opacity: 1 }], { duration: 240, easing: 'cubic-bezier(.2,.7,.2,1)' });
    }
  }}>
    <summary className={styles.summary}>
      <div className={styles.identity}>
        {entry.positionTitle && <p>{entry.positionTitle}</p>}
        <p className={styles.organization}>{organization}</p>
      </div>
      <div className={styles.trailing}>
        {entry.startYear && <span>{entry.isIncoming ? 'Incoming ' : ''}{entry.startYear}{!entry.isIncoming && entry.isCurrent ? ' – Present' : ''}</span>}
        <span className={styles.toggle} aria-hidden="true" />
      </div>
    </summary>
    <div ref={bodyRef} className={styles.body}>
      {location && <p className={styles.metadata}>{location}</p>}
      {description && <p className={styles.description}>{description}</p>}
      {href && <a href={href} target="_blank" rel="noopener noreferrer">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img className={styles.favicon} src={`https://www.google.com/s2/favicons?domain=${encodeURIComponent(new URL(href).hostname)}&sz=64`} width={16} height={16} alt="" loading="lazy" referrerPolicy="no-referrer" onError={event => { event.currentTarget.style.display = 'none'; }} />
        Visit {organization} <span aria-hidden="true">↗</span>
      </a>}
      {!description && !location && !href && <p className={styles.metadata}>No additional details added yet.</p>}
    </div>
  </details>;
}
