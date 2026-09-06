import { NextRequest, NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { validateUsername } from '@/lib/usernames';
export async function POST(request: NextRequest) {
  if (request.headers.get('origin') !== request.nextUrl.origin) {
    return NextResponse.json({ error: 'Please save from your account settings.' }, { status: 403 });
  }
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return NextResponse.json({ error: 'Please sign in again.' }, { status: 401 });
  const body = await request.json().catch(() => null);
  if (typeof body?.username !== 'string' || typeof body?.currentUsername !== 'string') {
    return NextResponse.json({ error: 'Enter a username.' }, { status: 400 });
  }
  const check = validateUsername(body.username);
  if (!check.ok) return NextResponse.json({ error: check.error }, { status: 400 });
  const { data, error } = await supabase.rpc('change_my_username', {
    new_username: check.normalized, expected_username: body.currentUsername,
  });
  if (error) {
    const conflict = error.code === '23505' || error.code === '40001';
    const message = error.code === '23505' ? 'That username is already taken or reserved.'
      : error.code === '40001' ? 'Your profile changed. Refresh the page and try again.'
      : 'Your username could not be saved. Please try again.';
    return NextResponse.json({ error: message }, { status: conflict ? 409 : 500 });
  }
  revalidatePath('/directory');
  revalidatePath('/');
  revalidatePath('/[handle]', 'page');
  revalidatePath('/directory/[slug]', 'page');
  return NextResponse.json({ username: data });
}
