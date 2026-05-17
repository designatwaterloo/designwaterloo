// Dev-only test personas live in the same Supabase project as real users.
// This constant identifies their emails so production queries can filter
// them out of public-facing surfaces. Hardcoded (not env-driven) so the
// filter works in any environment, including production builds where the
// dev sign-in route is disabled but the rows still exist.
export const TEST_EMAIL_DOMAIN = "test.designwaterloo.local";
export const TEST_ACCOUNT_EMAIL_SUFFIX = `@${TEST_EMAIL_DOMAIN}`;

export function isTestAccountEmail(email: string | null | undefined): boolean {
  return !!email?.toLowerCase().endsWith(TEST_ACCOUNT_EMAIL_SUFFIX);
}
