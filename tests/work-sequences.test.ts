import { test } from 'node:test';
import assert from 'node:assert/strict';
import { workSequences } from '../src/lib/work-sequences';
const get = (program: string, year: string) => workSequences('University of Waterloo', program, year);
test('SYDE sequence changes for Fall 2026 entrants, not merely calendar-year offsets', () => {
  assert.deepEqual(get('Systems Design Engineering', '2027')[0].terms, ['1231','1239','1245','1251','1259','1265']);
  assert.deepEqual(get('Systems Design Engineering', '2031')[0].terms, ['1275','1281','1289','1295','1301','1305']);
  assert.equal(get('Systems Design Engineering', '2030')[0].label, 'Stream 4');
});
test('other cohort changes and dual streams retain their distinct structures', () => {
  assert.deepEqual(get('Biomedical Engineering','2031')[0].terms.slice(-2), ['1299','1305']);
  assert.deepEqual(get('Management Engineering','2030')[0].terms.slice(-2), ['1291','1295']);
  assert.equal(get('Computer Engineering','2030').length, 2);
  assert.notDeepEqual(get('Computer Engineering','2030')[0].terms, get('Computer Engineering','2030')[1].terms);
});
test('GBDA offers four work terms and does not assume old internship cohorts are co-op', () => {
  assert.deepEqual(get('Global Business and Digital Arts','2027')[0].terms, ['1249','1255','1261','1265']);
  assert.deepEqual(get('Global Business and Digital Arts','2026'), []);
});
test('unknown programs, schools and missing years require manual selection', () => {
  assert.deepEqual(get('Unknown program','2030'), []);
  assert.deepEqual(get('Systems Design Engineering',''), []);
  assert.deepEqual(workSequences('Wilfrid Laurier University','Systems Design Engineering','2030'), []);
});

test('program-list spellings match official names including GBDA and CFM', () => {
  assert.deepEqual(get('Global Business & Digital Arts','2027'), get('Global Business and Digital Arts','2027'));
  assert.deepEqual(get('Computing & Financial Management','2030')[0].terms, ['1265','1271','1279','1285','1291','1299']);
});
test('SFM cohorts restrict sequence choices without guessing future policy', () => {
  assert.deepEqual(get('Sustainability & Financial Management','2026').map(s => s.label), ['Stream 3','Stream 6']);
  assert.deepEqual(get('Sustainability & Financial Management','2027').map(s => s.label), ['Stream 3','Stream 6']);
  assert.deepEqual(get('Sustainability & Financial Management','2030').map(s => s.label), ['Stream 2','Stream 3','Stream 5','Stream 6']);
  assert.deepEqual(get('Sustainability & Financial Management','2031'), []);
});
test('AFM has six alternatives with the published default; CS has four', () => {
  const afm = get('Accounting & Financial Management','2030');
  assert.equal(afm.length, 6);
  assert.equal(afm[0].recommended, true);
  assert.deepEqual(afm[0].terms, ['1271','1279','1289','1295']);
  const cs = get('Computer Science','2030');
  assert.equal(cs.length, 4);
  assert.deepEqual(cs[2].terms, ['1271','1279','1285','1291','1299','1301']);
  assert.deepEqual(cs[3].terms, ['1269','1275','1281','1289','1295','1299']);
});
test('faculty schedules retain distinct work terms', () => {
  assert.deepEqual(get('Biology','2030')[0].terms, ['1271','1279','1285','1291','1295']);
  assert.deepEqual(get('Physics & Astronomy','2030')[0].terms, ['1271','1279','1281','1289','1295']);
  assert.equal(get('Planning','2030')[0].terms[0], '1275');
  assert.equal(get('Kinesiology','2030')[0].terms[1], '1279');
  assert.equal(get('Mathematical Physics','2030').length, 2);
});

test('double-degree options use the department chart, not the conflicting overview', () => {
  const dd = get('Business Administration & Computer Science','2030');
  assert.equal(dd.length, 3);
  assert.deepEqual(dd[0].terms, ['1265','1271','1281','1291','1299']);
  assert.equal(dd[0].recommended, true);
  assert.equal(dd[1].terms.length, 4);
});

test('academic labels follow school terms and skip work terms and spring breaks', () => {
  const syde = get('Systems Design Engineering','2027')[0];
  assert.equal(syde.studyTerms['1229'], '1A');
  assert.equal(syde.studyTerms['1231'], undefined);
  assert.equal(syde.studyTerms['1235'], '1B');
  assert.equal(syde.studyTerms['1271'], '4B');
  const gbda = get('Global Business & Digital Arts','2027')[0];
  assert.equal(gbda.studyTerms['1235'], 'Off');
  assert.equal(gbda.studyTerms['1239'], '2A');
  assert.equal(gbda.studyTerms['1269'], '4B');
  const dd = get('Business Administration & Computer Science','2030')[0];
  assert.equal(dd.studyTerms['1305'], '5B');
});
