export const CORE_TEAM_UPDATES_KEY = 'core_team_updates_first_2026';

export function hasCoreTeamUpdates(metadata: Record<string, unknown> | undefined) {
  const preference = metadata?.[CORE_TEAM_UPDATES_KEY];
  return !!preference && typeof preference === 'object' &&
    'subscribed' in preference && preference.subscribed === true;
}
