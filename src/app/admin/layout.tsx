'use client';
import { useEffect, useState, type ReactNode } from 'react';
import { usePathname } from 'next/navigation';
import { canReview } from '@/lib/admin-access';
import Link from '@/components/Link';
import { useAuth } from '@/components/auth/AuthProvider';
import { UsersIcon, InboxStackIcon, WrenchScrewdriverIcon, ChevronDoubleLeftIcon, ChevronDoubleRightIcon, ArrowLeftIcon, UserCircleIcon } from '@heroicons/react/24/outline';
import styles from './layout.module.css';

export default function AdminLayout({children}:{children:ReactNode}) {
  const pathname=usePathname();
  const {member,user}=useAuth();
  const [collapsed,setCollapsed]=useState(false);
  useEffect(()=>{const saved=localStorage.getItem('dw-admin-sidebar');setCollapsed(saved?saved==='collapsed':window.matchMedia('(max-width:700px)').matches);},[]);
  function toggle(){setCollapsed(value=>{localStorage.setItem('dw-admin-sidebar',value?'expanded':'collapsed');return !value;});}
  return <div data-admin-workspace className={styles.workspace} data-collapsed={collapsed}>
    {canReview(member,user)&&<aside className={styles.sidebar}>
      <div className={styles.brand}><Link href="/dashboard" aria-label="Design Waterloo dashboard"><span className={styles.logo}/></Link><span className={styles.label}>Admin</span>
      <button className={styles.toggle} onClick={toggle} aria-label={collapsed?'Expand admin sidebar':'Collapse admin sidebar'} aria-expanded={!collapsed} aria-controls="admin-sidebar-navigation" title={collapsed?'Expand sidebar':'Collapse sidebar'}>{collapsed?<ChevronDoubleRightIcon/>:<ChevronDoubleLeftIcon/>}</button></div>
      <nav id="admin-sidebar-navigation" aria-label="Admin navigation">{[
        {href:'/admin/members',label:'Members',Icon:UsersIcon},
        {href:'/admin',label:'Submissions',Icon:InboxStackIcon},
        {href:'/admin/data-issues',label:'Data issues',Icon:WrenchScrewdriverIcon},
      ].filter(item=>member?.is_admin || item.href==='/admin').map(({href,label,Icon})=><Link key={href} href={href} aria-label={label} title={collapsed?label:undefined} aria-current={pathname===href?'page':undefined}><Icon aria-hidden="true"/><span className={styles.label}>{label}</span></Link>)}</nav>
      <div className={styles.bottom}><Link href="/dashboard#profile" aria-label="Your profile" title={collapsed?'Your profile':undefined}><UserCircleIcon aria-hidden="true"/><span className={styles.label}>Your profile</span></Link><Link href="/directory" aria-label="Back to site" title={collapsed?'Back to site':undefined}><ArrowLeftIcon aria-hidden="true"/><span className={styles.label}>Back to site</span></Link></div>
    </aside>}
    <div className={styles.content}>{children}</div>
  </div>;
}
