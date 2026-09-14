"use client";
import { useEffect, useState } from 'react';
import Link from '@/components/Link';
import styles from './RecruitmentBanner.module.css';

function useLocalHost() {
  const [local, setLocal] = useState(false);
  useEffect(() => {
    setLocal(['localhost', '127.0.0.1'].includes(window.location.hostname));
  }, []);
  return local;
}

/** Visible on localhost only so production stays clear until recruitment is ready. */
export default function RecruitmentBanner({ dark = false }: { dark?: boolean }) {
  const local = useLocalHost();
  if (!local) return null;
  return <aside aria-label="Core team recruitment" className={`${styles.banner} ${dark ? styles.dark : ''}`}>
    <span className={styles.dot} aria-hidden="true" />
    <p>We’re recruiting our first core team<span className={styles.detail}> at Design Waterloo</span>.</p>
    <Link href="/apply" className={styles.apply}>Apply <span aria-hidden="true">↗</span></Link>
  </aside>;
}

export function HomeRecruitmentSlot({ className }: { className: string }) {
  const local = useLocalHost();
  if (!local) return null;
  return <div data-recruitment-top className={className}><RecruitmentBanner /></div>;
}
