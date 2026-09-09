import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
export async function POST() {
  const client = await createClient();
  const { data: { user }, error } = await client.auth.getUser();
  if (error || !user) return NextResponse.json({ error: 'Please sign in again.' }, { status: 401 });
  const { error: setupError } = await client.rpc('ensure_member', {});
  if (setupError) return NextResponse.json({ error: setupError.message }, { status: 409 });
  return NextResponse.json({ ok: true, redirectTo: '/welcome' });
}
