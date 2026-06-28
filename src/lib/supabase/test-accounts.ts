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

// Single allowlisted email for the gated fixed-OTP test login (Unit 1).
// Not a secret — the server-side TEST_LOGIN_ENABLED flag is the actual gate.
// Uses a real @mylaurier.ca shape so it flows through the existing Laurier
// OTP UI. The fixed code is 424242.
export const TEST_LOGIN_EMAIL = "dwtest@mylaurier.ca";
export const TEST_LOGIN_CODE = "424242";

export function isTestLoginEmail(email: string | null | undefined): boolean {
  return email?.trim().toLowerCase() === TEST_LOGIN_EMAIL;
}
