/** Accept a public handle or profile URL; never retain tracking or another host. */
export function normalizeLinkedIn(raw: string): string | null {
  const value = raw.trim();
  if (!value) return "";
  let handle: string;
  if (/^(?:https?:\/\/|(?:[a-z]{2,3}\.)?linkedin\.com\/)/i.test(value)) {
    try {
      const url = new URL(/^https?:\/\//i.test(value) ? value : `https://${value}`);
      if (!(url.hostname === "linkedin.com" || url.hostname.endsWith(".linkedin.com")) || url.username || url.password) return null;
      const match = url.pathname.match(/^\/in\/([^/]+)\/?$/i);
      if (!match) return null;
      handle = decodeURIComponent(match[1]);
    } catch { return null; }
  } else {
    handle = value.replace(/^\/?in\//i, "").replace(/^@/, "").split(/[?#]/)[0].replace(/\/$/, "");
  }
  if (!/^[\p{L}\p{N}][\p{L}\p{N}-]*$/u.test(handle) || handle.length > 200) return null;
  return `https://www.linkedin.com/in/${encodeURIComponent(handle)}`;
}

/** Keep the field editable as a handle alongside its fixed URL prefix. */
export function linkedInHandle(raw: string): string {
  const normalized = normalizeLinkedIn(raw);
  return normalized ? decodeURIComponent(normalized.slice("https://www.linkedin.com/in/".length)) : raw;
}
