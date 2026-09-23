import type { ExperienceEntry } from '@/components/InlineEdit/InlineEditProvider';

export const experienceAnchor = (id: string) => `experience-${id}`;

/** Link a saved work term to a position that starts in that term. Prefer a
 * completed placement over a concurrent ongoing community role. Missing dates
 * are left unlinked rather than guessing a placement. */
export function experienceTermLinks(terms: string[], experiences: ExperienceEntry[]) {
  const links: Record<string, { href: string; label: string; alternatives?: { href: string; label: string }[] }> = {};
  for (const term of terms) {
    if (!/^1\d{2}[159]$/.test(term)) continue;
    const year = String(2000 + Number(term.slice(1, 3)));
    const month = Number(term[3]);
    const matches = experiences.filter(e => e.id && e.startYear === year && e.startMonth
      && Number(e.startMonth) >= month && Number(e.startMonth) < month + 4);
    matches.sort((a, b) => Number(a.isCurrent) - Number(b.isCurrent));
    const preferred = matches.some(e => !e.isCurrent) ? matches.filter(e => !e.isCurrent) : matches;
    const match = preferred[0];
    if (match?.id) {
      const targets = preferred.map(e => ({ href: `#${experienceAnchor(e.id!)}`, label: `View ${e.positionTitle || 'position'} at ${e.company}` }));
      links[term] = { ...targets[0], ...(targets.length > 1 ? { alternatives: targets } : {}) };
    }
  }
  return links;
}
