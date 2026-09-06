/** Account tasks should navigate immediately, without the marketing-page curtain delay. */
export function isAccountDestination(href: string): boolean {
  const path = href.split(/[?#]/, 1)[0];
  return /^\/(dashboard|profile|sign-in|auth|admin|claim|pending-approval)(\/|$)/.test(path) || /^\/directory\/[^/]+\/?$/.test(path);
}
