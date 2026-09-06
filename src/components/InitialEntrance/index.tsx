"use client";

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import BloomingLogo from '../BloomingLogo';
import styles from './InitialEntrance.module.css';

/** One decorative entrance per document, only when entering through the homepage.
 * CSS reveals the page even if hydration is slow or JavaScript is unavailable.
 * It never delays routing, steals focus or waits on authentication/network requests.
 */
export default function InitialEntrance() {
  const pathname = usePathname();
  const [visible, setVisible] = useState(pathname === '/');
  useEffect(() => {
    if (pathname !== '/' || window.matchMedia('(prefers-reduced-motion: reduce)').matches) setVisible(false);
  }, [pathname]);
  if (!visible) return null;
  return <div className={styles.entrance} aria-hidden="true" data-initial-entrance
    onAnimationEnd={event => { if (event.target === event.currentTarget) setVisible(false); }}>
    <div className={styles.columns}>
      {Array.from({ length: 6 }, (_, index) => <div key={index} style={{ '--column': index } as React.CSSProperties} />)}
    </div>
    <div className={styles.logo}><BloomingLogo show size={120} /></div>
  </div>;
}
