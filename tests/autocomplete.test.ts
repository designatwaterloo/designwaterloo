import { test } from 'node:test';
import assert from 'node:assert/strict';
import { rankAutocomplete } from '../src/lib/autocomplete';
const label = (s: string) => s;
test('program prefixes outrank earlier alphabetical substring matches', () => {
  const items = ['Business Administration & Computer Science', 'Computer Science', 'Computer Engineering'];
  assert.deepEqual(rankAutocomplete(items, 'computer', label), ['Computer Engineering', 'Computer Science', 'Business Administration & Computer Science']);
  assert.equal(rankAutocomplete(items, 'computer science', label)[0], 'Computer Science');
});
test('exact abbreviations take priority and multiword searches match word prefixes', () => {
  const items = ['Systems Design Engineering', 'Systemic Computing', 'Computer Science'];
  assert.equal(rankAutocomplete(items, 'SYDE', label, s => s === items[0] ? ['SYDE'] : [])[0], items[0]);
  assert.deepEqual(rankAutocomplete(items, 'design sys', label), [items[0]]);
});
test('punctuation, accents, casing and repeated whitespace are normalized', () => {
  assert.deepEqual(rankAutocomplete(['Arts & Business'], '  ARTS and  bus ', label), ['Arts & Business']);
  assert.deepEqual(rankAutocomplete(['Études françaises'], 'etudes', label), ['Études françaises']);
});
test('empty queries preserve source order and unrelated matches are excluded', () => {
  const items = ['Zoology', 'Arts'];
  assert.deepEqual(rankAutocomplete(items, ' ', label), items);
  assert.deepEqual(rankAutocomplete(items, 'computer', label), []);
});
