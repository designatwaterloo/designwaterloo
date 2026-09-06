export const profilePath = (username: string) => `/@${encodeURIComponent(username)}`;
export type ProfileSearch = Record<string, string | string[] | undefined>;
export function profileDestination(username: string, search: ProfileSearch = {}) {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(search)) {
    if (Array.isArray(value)) value.forEach(item => query.append(key, item));
    else if (value !== undefined) query.set(key, value);
  }
  return profilePath(username) + (query.size ? `?${query}` : '');
}
