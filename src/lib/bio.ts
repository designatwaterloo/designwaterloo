export const BIO_WORD_LIMIT = 100;

/** Words plus every space, tab, or newline — a trailing space counts immediately. */
export function bioWordCount(text: string) {
  if (text === "") return 0;
  return text.split(/\s/).length;
}
