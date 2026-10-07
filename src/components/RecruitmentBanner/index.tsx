import Link from '@/components/Link';
import styles from './RecruitmentBanner.module.css';

/** Recruitment stays in updates-only mode until applications are ready. */
export default function RecruitmentBanner({ dark = false }: { dark?: boolean }) {
  return <aside aria-label="Core team recruitment" className={`${styles.banner} ${dark ? styles.dark : ''}`}>
    <span className={styles.dot} aria-hidden="true" />
    <p>Our first core team is coming.</p>
    <Link href="/apply/updates" className={styles.apply}>Sign up for updates <span aria-hidden="true">↗</span></Link>
  </aside>;
}
