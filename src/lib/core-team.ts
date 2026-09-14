import type { Member } from '@/types/database';

export const APPLICATION_ROUND = 'first-core-team-2026';
export const applicationQuestions = [
  { key: 'community', label: 'What do you feel is missing from the design community on campus?', hint: 'Think about your own experience. What would you like to see more of, or see done differently?', required: true, limit: 6000 },
  { key: 'interests', label: 'What areas are you interested in contributing to or exploring?', hint: 'Tell us what you enjoy doing and what you’d like to try. You don’t need to choose a role.', required: true, limit: 4000 },
  { key: 'proud_of', label: 'What have you created or contributed to in your field that you’re proud of, and why?', hint: 'A personal project, a collaboration, a community contribution—anything that matters to you.', required: true, limit: 8000 },
  { key: 'work_link', label: 'A link to what you’ve shared', hint: 'Optional. A project, document, portfolio, or anything that gives us more context.', required: false, limit: 2000 },
  { key: 'availability', label: 'Anything you’d like us to know about your availability?', hint: 'Optional. Share any commitments or timing that would help us plan together.', required: false, limit: 2000 },
] as const;
export type Answers = Record<(typeof applicationQuestions)[number]['key'], string>;
export const emptyAnswers: Answers = { community: '', interests: '', proud_of: '', work_link: '', availability: '' };
export type CoreTeamApplication = {
  id: string; member_id: string; round: string; answers: Answers; revision: number;
  status: 'draft' | 'submitted'; created_at: string; updated_at: string; submitted_at: string | null;
  profile_snapshot: Record<string, unknown> | null;
}
export function parseAnswers(value: unknown): Answers | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const source = value as Record<string, unknown>;
  const result = { ...emptyAnswers };
  for (const q of applicationQuestions) {
    const v = source[q.key];
    if (typeof v !== 'string' || v.length > q.limit) return null;
    result[q.key] = v;
  }
  return result;
}
export function applicationErrors(answers: Answers) {
  const errors: Partial<Record<keyof Answers, string>> = {};
  for (const q of applicationQuestions) if (q.required && !answers[q.key].trim()) errors[q.key] = 'Please add your answer.';
  if (answers.work_link.trim()) {
    try { const url = new URL(answers.work_link.trim()); if (!['https:', 'http:'].includes(url.protocol) || url.username || url.password) throw Error(); }
    catch { errors.work_link = 'Use a full link beginning with https:// or http://.'; }
  }
  return errors;
}
export function profileRequirements(member: Member) {
  return [
    { label: 'Name', complete: !!member.first_name?.trim() && !!member.last_name?.trim(), href: '/dashboard#account' },
    { label: 'University and studies', complete: !!member.school && !!member.program?.trim() && !!member.graduating_class?.trim(), href: '/dashboard#profile' },
    { label: 'Profile photo', complete: !!member.profile_image_url?.trim(), href: '/dashboard#profile' },
    { label: 'Bio', complete: !!member.bio?.trim(), href: '/dashboard#profile' },
    { label: 'Interests and skills', complete: !!member.specialties?.length, href: '/dashboard#profile' },
    { label: 'Account setup', complete: !!member.onboarding_completed && !!member.slug?.trim(), href: '/welcome?redirectTo=%2Fapply' },
  ];
}
