/** Normalize accents, punctuation and spacing without changing displayed values. */
function normalize(value: string): string {
  return value.normalize("NFKD").replace(/[\u0300-\u036f]/g, "").toLowerCase()
    .replace(/&/g, " and ").replace(/[^a-z0-9]+/g, " ").trim().replace(/\s+/g, " ");
}

/** Exact names/aliases, phrase prefixes, word prefixes, then substring matches. */
export function rankAutocomplete<T>(items: readonly T[], query: string, label: (item: T) => string, aliases: (item: T) => string[] = () => []): T[] {
  const search = normalize(query);
  if (!search) return [...items];
  const tokens = search.split(" ");
  return items.map((item, index) => {
    const name = normalize(label(item));
    const alternate = aliases(item).map(normalize).filter(Boolean);
    let rank = Infinity;
    if (name === search) rank = 0;
    else if (alternate.includes(search)) rank = 1;
    else if (name.startsWith(search)) rank = 2;
    else if (alternate.some(alias => alias.startsWith(search))) rank = 3;
    else if (tokens.every(token => name.split(" ").some(word => word.startsWith(token)))) rank = 4;
    else if ([name, ...alternate].some(text => tokens.every(token => text.includes(token)))) rank = 5;
    const position = name.indexOf(tokens[0]);
    return { item, index, rank, position: position < 0 ? Infinity : position, name };
  }).filter(match => Number.isFinite(match.rank))
    .sort((a, b) => a.rank - b.rank || a.position - b.position || a.name.localeCompare(b.name) || a.index - b.index)
    .map(match => match.item);
}
