import test from "node:test";
import { PROGRAMS } from "../src/data/programs";
import assert from "node:assert/strict";
import { shortProgramName, hasProgramShortName } from "../src/data/program-short-names";
const waterloo = "University of Waterloo";
const laurier = "Wilfrid Laurier University";

test("uses sourced Waterloo codes rather than generated initials", () => {
  assert.equal(shortProgramName("Systems Design Engineering", waterloo), "SYDE");
  assert.equal(shortProgramName("Actuarial Science", waterloo), "ACTSC");
  assert.equal(shortProgramName("Communication Studies", waterloo), "COMMST");
  assert.equal(shortProgramName("Global Business and Digital Arts", waterloo), "GBDA");
  assert.equal(shortProgramName("Arts & Business", waterloo), "ARBUS");
});
test("keeps school-specific subject codes separate", () => {
  assert.equal(shortProgramName("Computer Science", waterloo), "CS");
  assert.equal(shortProgramName("Computer Science", laurier), "CPTG");
  assert.equal(shortProgramName("Communication Studies", laurier), "COMS");
  assert.equal(shortProgramName("User Experience Design", laurier), "UEXD");
  assert.equal(shortProgramName("Software Engineering", laurier), "SENG");
});
test("preserves names when no verified abbreviation exists", () => {
  const name = "A custom interdisciplinary program";
  assert.equal(shortProgramName(name, waterloo), name);
  assert.equal(shortProgramName("Systems Design Engineering", laurier), "Systems Design Engineering");
  assert.equal(shortProgramName("Computer Science", "Unknown school"), "Computer Science");
  assert.equal(shortProgramName("", waterloo), "");
});

test("every Waterloo option has an explicit compact label", () => {
  const missing = PROGRAMS[waterloo].filter(name => !hasProgramShortName(name, waterloo));
  assert.deepEqual(missing, []);
});
test("uses program-specific abbreviations beyond subject codes", () => {
  for (const [name, expected] of Object.entries({
    "Computer Engineering": "CE", "Electrical Engineering": "ELE",
    "Management Engineering": "MGTE", "Computational Mathematics": "CM",
    "Mathematics/Financial Analysis & Risk Management": "FARM",
    "Religion, Culture & Spirituality": "RCS", "Sexualities, Relationships & Families": "SRF",
    "Science & Financial Management": "ScFM", "Sustainability & Financial Management": "SFM",
  })) assert.equal(shortProgramName(name, waterloo), expected);
  assert.equal(shortProgramName("Biochemistry", waterloo), "Biochem");
  assert.equal(shortProgramName("Social Work", waterloo), "BSW");
});
