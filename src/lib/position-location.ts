/** Strip work arrangement and province/state from an imported location. */
export function cityCountry(location: string | null | undefined): string | null {
  const place = (location ?? '').split(/[·•|]/)[0].trim();
  if (!place || /^(remote|hybrid|on[- ]site)$/i.test(place)) return null;
  const parts = place.split(',').map(part => part.trim()).filter(Boolean);
  return parts.length > 2 ? `${parts[0]}, ${parts.at(-1)}` : parts.join(', ');
}
