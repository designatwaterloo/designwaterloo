import { notFound, redirect } from 'next/navigation';
import ProfilePage, { generateMetadata as profileMetadata } from '../directory/[slug]/ProfilePage';
import { resolveUsername } from '@/lib/supabase/resolve-username';
import { profileDestination, type ProfileSearch } from '@/lib/profile-urls';
export const dynamic = 'force-dynamic';
type Props = { params: Promise<{ handle: string }>; searchParams: Promise<ProfileSearch> };
async function username(params: Props['params']) {
  const { handle: rawHandle } = await params;
  let handle: string;
  try { handle = decodeURIComponent(rawHandle); } catch { notFound(); }
  if (!/^@[a-zA-Z0-9-]+$/.test(handle)) notFound();
  const current = await resolveUsername(handle.slice(1));
  if (!current) notFound();
  return { current, handle };
}
export async function generateMetadata({ params }: Props) {
  const { current } = await username(params);
  return profileMetadata({ params: Promise.resolve({ slug: current }) });
}
export default async function HandlePage({ params, searchParams }: Props) {
  const { current, handle } = await username(params);
  // Temporary redirects avoid cached cycles when reclaiming a previous handle.
  if (handle !== `@${current}`) redirect(profileDestination(current, await searchParams));
  return <ProfilePage params={Promise.resolve({ slug: current })} />;
}
