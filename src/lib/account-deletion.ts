export const ACCOUNT_DELETION_PHRASE = 'delete my account';

export function validDeletionConfirmation(body: unknown, fullName: string): boolean {
  if (!body || typeof body !== 'object') return false;
  const input = body as Record<string, unknown>;
  return input.phrase === ACCOUNT_DELETION_PHRASE
    && typeof input.fullName === 'string'
    && fullName.trim().length > 0
    && input.fullName.trim() === fullName.trim();
}
