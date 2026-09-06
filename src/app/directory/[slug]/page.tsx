import { notFound, redirect } from 'next/navigation';
import { resolveUsername } from '@/lib/supabase/resolve-username';
import { profileDestination, type ProfileSearch } from '@/lib/profile-urls';
export const dynamic = 'force-dynamic';
export default async function LegacyProfile({ params, searchParams }: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<ProfileSearch>;
}) {
  const current = await resolveUsername((await params).slug);
  if (!current) notFound();
  redirect(profileDestination(current, await searchParams));
}
