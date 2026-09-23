import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { createClient as serviceClient } from '@supabase/supabase-js';
import { validDeletionConfirmation } from '@/lib/account-deletion';

export async function POST(request: Request) {
  if (request.headers.get('origin') !== new URL(request.url).origin) {
    return NextResponse.json({ error: 'Please delete your account from account settings.' }, { status: 403 });
  }
  const jar = await cookies();
  if (jar.getAll().some(cookie => cookie.name.startsWith('dw-imp-'))) {
    return NextResponse.json({ error: 'Account deletion is unavailable while impersonating a member.' }, { status: 403 });
  }
  const db = await createClient();
  const { data: { user } } = await db.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Sign in again to delete your account.' }, { status: 401 });
  const { data: member, error } = await db.from('members').select('first_name,last_name,slug').eq('auth_user_id', user.id).single();
  if (error || !member) return NextResponse.json({ error: 'Couldn’t load your account. Please try again.' }, { status: 409 });
  const body: unknown = await request.json().catch(() => null);
  if (!validDeletionConfirmation(body, `${member.first_name} ${member.last_name}`)) {
    return NextResponse.json({ error: 'Enter your full name and “delete my account” exactly as shown.' }, { status: 400 });
  }
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) return NextResponse.json({ error: 'Account deletion is temporarily unavailable.' }, { status: 503 });
  const admin = serviceClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, key, { auth: { persistSession: false, autoRefreshToken: false } });
  // Deleting Auth cascades atomically to the member, experience, leadership and works.
  // Do not delete the member first: an Auth failure must leave the account intact.
  const { error: deletionError } = await admin.auth.admin.deleteUser(user.id);
  if (deletionError) return NextResponse.json({ error: 'Couldn’t delete your account. Please try again.' }, { status: 500 });
  for (const cookie of jar.getAll()) {
    if (cookie.name.startsWith('sb-')) jar.set(cookie.name, '', { maxAge: 0, path: '/' });
  }
  revalidatePath('/', 'layout');
  revalidatePath('/directory');
  revalidatePath('/@' + member.slug);
  revalidatePath('/directory/' + member.slug);
  return NextResponse.json({ success: true });
}
