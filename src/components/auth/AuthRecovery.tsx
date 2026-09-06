"use client";
import Link from "next/link";
import { usePathname } from 'next/navigation';
import { useAuth } from './AuthProvider';
import type { ReactNode } from 'react';
export function AuthRecovery({ children }: { children: ReactNode }) {
  const { error, retry, member } = useAuth();
  const pathname = usePathname();
  if (error && !member && /^\/(dashboard|profile|admin|claim|pending-approval)(\/|$)/.test(pathname)) {
    return <main className="min-h-[60vh] flex flex-col items-center justify-center gap-4 p-8">
      <h1>We couldn’t load your account</h1><p role="alert">{error}</p>
      <button onClick={() => void retry()}>Try again</button><Link href="/">Back to home</Link>
    </main>;
  }
  return <>{error && <div role="alert" className="p-4 text-center">{error} <button onClick={() => void retry()}>Retry loading</button></div>}{children}</>;
}
