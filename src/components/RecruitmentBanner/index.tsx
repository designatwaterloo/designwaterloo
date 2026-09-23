import Link from '@/components/Link';
import styles from './RecruitmentBanner.module.css';

/** The entry page handles sign-in; application answers stay private. */
export default function RecruitmentBanner({ dark = false }: { dark?: boolean }) {
  return <aside aria-label="Core team recruitment" className={`${styles.banner} ${dark ? styles.dark : ''}`}>
    <span className={styles.dot} aria-hidden="true" />
    <p>We’re recruiting our first core team<span className={styles.detail}> at Design Waterloo</span>.</p>
    <Link href="/apply" className={styles.apply}>Apply <span aria-hidden="true">↗</span></Link>
  </aside>;
}
