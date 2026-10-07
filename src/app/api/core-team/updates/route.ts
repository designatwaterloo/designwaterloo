import { NextRequest, NextResponse } from 'next/server';
import { requestOrigin } from '@/lib/auth/request-origin';
import { createRouteClient } from '@/lib/supabase/route-client';
import { CORE_TEAM_UPDATES_KEY, hasCoreTeamUpdates } from '@/lib/core-team-updates';

export async function PUT(request: NextRequest) {
  const { client, applyCookies } = createRouteClient(request);
  const reply = (body: unknown, status = 200) => applyCookies(NextResponse.json(body, { status }));
  if (request.headers.get('origin') !== requestOrigin(request)) return reply({ error: 'Please use the updates page to sign up.' }, 403);
  const { data: { user }, error } = await client.auth.getUser();
  if (error || !user) return reply({ error: 'Please sign in again to save your preference.' }, 401);
  if (!user.email || !user.email_confirmed_at) return reply({ error: 'Verify your account email before signing up.' }, 422);
  let body;
  try { body = await request.json(); } catch { return reply({ error: 'Invalid preference.' }, 400); }
  if (typeof body?.subscribed !== 'boolean') return reply({ error: 'Invalid preference.' }, 400);
  if (hasCoreTeamUpdates(user.user_metadata) === body.subscribed) return reply({ subscribed: body.subscribed });
  // Keep consent with the existing authenticated account; no recruitment tables or
  // finished profile are needed. updateUser merges this key with other metadata.
  const { data: updated, error: updateError } = await client.auth.updateUser({ data: {
    [CORE_TEAM_UPDATES_KEY]: { subscribed: body.subscribed, updated_at: new Date().toISOString(), source: 'core-team-updates' },
  } });
  if (updateError || !updated.user || hasCoreTeamUpdates(updated.user.user_metadata) !== body.subscribed) return reply({ error: 'We couldn’t save your preference. Please try again.' }, 503);
  return reply({ subscribed: body.subscribed });
}
