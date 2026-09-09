/** Legacy is_admin retains full access. Review-only admins use server-managed
 * Auth app metadata; editable user_metadata must never grant permissions. */
export function hasAdminAccess(access: 'superadmin' | 'review', member: { is_admin?: boolean } | null | undefined, user: { app_metadata?: Record<string, unknown> } | null | undefined): boolean {
  if (!member) return false;
  return !!member.is_admin || (access === 'review' && user?.app_metadata?.design_waterloo_role === 'admin');
}
export function canReview(member: { is_admin?: boolean } | null | undefined, user: { app_metadata?: Record<string, unknown> } | null | undefined): boolean {
  return hasAdminAccess('review', member, user);
}
