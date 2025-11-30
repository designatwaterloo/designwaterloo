/**
 * Decode Waterloo term code to display name
 * @param code - 4-digit term code (e.g., "1261" for Winter 2026)
 */
export function decodeTermCode(code: string): string {
  if (!code || code.length !== 4) return code;

  const yy = code.substring(1, 3);
  const year = `20${yy}`;
  const monthCode = code[3];

  const seasonMap: Record<string, string> = {
    '1': 'Winter',
    '5': 'Spring',
    '9': 'Fall',
  };

  const season = seasonMap[monthCode];
  return season ? `${season} ${year}` : code;
}

/**
 * Get current term code based on today's date
 */
export function getCurrentTermCode(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1; // 0-indexed

  const yy = year.toString().slice(-2);

  // Determine current/approaching term
  let termMonth: string;
  if (month >= 9) {
    termMonth = '9'; // Fall
  } else if (month >= 5) {
    termMonth = '5'; // Spring
  } else {
    termMonth = '1'; // Winter
  }

  return `1${yy}${termMonth}`;
}

/**
 * Get the next available future term from a list of term codes
 * @param termCodes - Array of term codes (e.g., ["1255", "1259", "1261"])
 */
export function getNextAvailableTerm(termCodes: string[] | undefined): string | null {
  if (!termCodes || termCodes.length === 0) return null;

  const currentCode = getCurrentTermCode();

  // Sort and find first term AFTER current (> not >=)
  const sorted = [...termCodes].sort();
  const nextCode = sorted.find(code => code > currentCode);

  return nextCode ? decodeTermCode(nextCode) : null;
}

/**
 * Check if a term code is in the past
 */
export function isTermPast(termCode: string): boolean {
  const currentCode = getCurrentTermCode();
  return termCode < currentCode;
}

/**
 * Get all terms with past/future status
 * @param termCodes - Array of term codes
 * @returns Array of terms with decoded names and past/future status
 */
export function getTermsWithStatus(termCodes: string[] | undefined): Array<{ code: string; displayName: string; isPast: boolean }> {
  if (!termCodes || termCodes.length === 0) return [];

  return [...termCodes]
    .sort()
    .map(code => ({
      code,
      displayName: decodeTermCode(code),
      isPast: isTermPast(code),
    }));
}
