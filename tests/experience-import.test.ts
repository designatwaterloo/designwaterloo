import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {parseExperience,mergePositions,positionError} from '../src/lib/experience-import';
const sample=readFileSync('tests/fixtures/linkedin-experience.txt','utf8');
for(const [name,text] of Object.entries({original:sample,crlf:sample.replaceAll('\n','\r\n'),unicode:sample.replaceAll(' - ',' — ').replaceAll(' ','\u00a0'),noLogos:sample.replace(/^.* logo\n/gm,''),duplicateLines:sample.split('\n').flatMap(s=>[s,s]).join('\n')})) {
 test(`LinkedIn paste: ${name}`,()=>{
  const {positions,warning}=parseExperience(text);
  assert.equal(warning,null);assert.equal(positions.length,11);
  assert.deepEqual(positions.slice(0,5).map(p=>p.company),['Datacurve','Figma','Design Waterloo','Shopify','Socratica']);
  assert.equal(positions[0].company,'Datacurve');assert.equal(positions[0].start_month,'05');assert.equal(positions[0].description,'first design hire! product, brand, clothes, creative');
  assert.equal(positions.find(p=>p.company==='Shopify')?.end_year,'2025');
  assert.equal(positions.filter(p=>p.company.startsWith('Public and')).length,2);
  assert.equal(positionError(positions),null);
  assert.equal(mergePositions(positions,parseExperience(text).positions).length,11);
 });
}
test('year only, empty, malformed and oversized pastes',()=>{
 const p=parseExperience('Designer\nStudio\n2020 – 2022').positions[0];assert.equal(p.start_month,null);assert.equal(p.end_year,'2022');
 assert.ok(parseExperience('').warning);assert.ok(parseExperience('junk').warning);assert.ok(parseExperience('a'.repeat(100001)).warning);
 assert.ok(positionError([{...p,end_year:'2019'}]));
});
test('grouped roles preserve the employer and individual descriptions',()=>{
 const {positions}=parseExperience('Acme logo\nAcme\nFull-time · 3 yrs\nSenior Designer\nJan 2024 - Present\nLed design\nDesigner\nJan 2023 - Dec 2023\nMade things');
 assert.equal(positions.length,2);assert.deepEqual(positions.map(p=>p.company),['Acme','Acme']);assert.deepEqual(positions.map(p=>p.position_title),['Senior Designer','Designer']);assert.equal(positions[0].description,'Led design');assert.equal(positions[1].description,'Made things');
});

test('imports preserve existing details and handle missing months without duplicates',()=>{
 const incoming=parseExperience('Designer\nStudio\nJan 2025 - Present\nNew description').positions;
 const existing=[{...incoming[0],start_month:null,description:'Keep my edited description'}];
 const merged=mergePositions(existing,incoming);
 assert.equal(merged.length,1);
 assert.equal(merged[0].description,'Keep my edited description');
 const other={...incoming[0],id:'other',start_year:'2026'};
 assert.equal(mergePositions(existing,[...incoming,other]).length,2);
});
