import { requestOrigin } from "@/lib/auth/request-origin";
import { NextRequest, NextResponse } from 'next/server';
import { createRouteClient } from '@/lib/supabase/route-client';
import { applicationErrors, parseAnswers, profileRequirements, APPLICATION_ROUND } from '@/lib/core-team';

export async function GET(request: NextRequest) {
  const { client, applyCookies } = createRouteClient(request);
  const reply = (body: unknown, status = 200) => applyCookies(NextResponse.json(body, { status }));
  const { data: { user }, error: authError } = await client.auth.getUser();
  if (authError || !user) return reply({ error: 'Please sign in to view your application.' }, 401);
  const { data: member, error: memberError } = await client.from('members').select('*').eq('auth_user_id', user.id).maybeSingle();
  if (memberError) return reply({ error: 'Couldn’t load your profile. Please try again.' }, 503);
  if (!member) return reply({ error: 'Set up your profile first.', needsSetup: true }, 409);
  const { data: application, error } = await client.from('core_team_applications').select('*').eq('member_id', member.id).eq('round', APPLICATION_ROUND).maybeSingle();
  if (error) return reply({ error: 'Applications are temporarily unavailable. Please try again later.' }, 503);
  return reply({ application, member, requirements: profileRequirements(member) });
}

async function write(request: NextRequest, submit: boolean) {
  const { client, applyCookies } = createRouteClient(request);
  const reply = (body: unknown, status = 200) => applyCookies(NextResponse.json(body, { status }));
  if (request.headers.get('origin') !== requestOrigin(request)) return reply({ error: 'Please use the application page to save.' }, 403);
  const { data: { user }, error: authError } = await client.auth.getUser();
  if (authError || !user) return reply({ error: 'Your session expired. Sign in again to save your answers.' }, 401);
  const raw = await request.text();
  if (raw.length > 100000) return reply({ error: 'Your application is too long.' }, 413);
  let body;
  try { body = JSON.parse(raw); } catch { return reply({ error: 'Invalid application.' }, 400); }
  const answers = parseAnswers(body?.answers);
  if (!answers || !Number.isSafeInteger(body.revision) || body.revision < 0) return reply({ error: 'Check your answers and try again.' }, 400);
  if (submit && Object.keys(applicationErrors(answers)).length) return reply({ error: 'Check the required answers and project link.', fields: applicationErrors(answers) }, 422);
  const { data, error } = await client.rpc('save_core_team_application', { draft_answers: answers, expected_revision: body.revision, submit_application: submit });
  if (error) {
    const conflict = error.code === '40001' || error.code === '55000';
    return reply({ error: conflict ? 'This application changed in another tab. Copy your unsaved answers before reloading the latest version.' : error.code === '23514' ? 'Complete your profile and required answers before submitting.' : 'Couldn’t save your application. Your answers are still here. Please retry.', conflict }, conflict ? 409 : error.code === '23514' ? 422 : 503);
  }
  return reply({ application: data });
}
export const PUT = (request: NextRequest) => write(request, false);
export const POST = (request: NextRequest) => write(request, true);
