import test from 'node:test';
import assert from 'node:assert/strict';
import { experienceTermLinks } from '../src/lib/experience-term-links';
const role = (id: string, month: string | null, current = false) => ({id, company:id, positionTitle:'Designer', startYear:'2024', startMonth:month, isCurrent:current});
test('work terms jump to their placement rather than a concurrent ongoing role', () => {
  const links = experienceTermLinks(['1245','1249'], [role('community','05',true),role('placement','05'),role('fall','11')]);
  assert.equal(links['1245'].href,'#experience-placement');
  assert.equal(links['1249'].href,'#experience-fall');
});
test('separate terms keep their own targets and missing dates stay unlinked', () => {
  const links = experienceTermLinks(['1241','1245','1249','invalid'], [role('winter','01'),role('spring','08'),role('unknown',null)]);
  assert.equal(links['1241'].href,'#experience-winter');
  assert.equal(links['1245'].href,'#experience-spring');
  assert.equal(links['1249'],undefined);
  assert.equal(links.invalid,undefined);
});

test('multiple placements in the same term offer explicit choices', () => {
  const links = experienceTermLinks(['1241'], [role('government','01'),role('community','01')]);
  assert.deepEqual(links['1241'].alternatives?.map(e => e.href), ['#experience-government','#experience-community']);
});
