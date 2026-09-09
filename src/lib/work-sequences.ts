/** Verified 2026-09-07. Offsets count terms from the entering fall (0). */
export const ENGINEERING_SEQUENCE_SOURCE = "https://uwaterloo.ca/engineering/undergraduate-students/co-op-experience/co-op-study-sequences";
export const GBDA_SEQUENCE_SOURCE = "https://uwaterloo.ca/stratford-school-of-interaction-design-and-business/global-business-and-digital-arts/gbda-advising/course-selection-and-program-structure";
export type WorkSequence = { label: string; entryYear: number; terms: string[]; source: string; recommended?: boolean; studyTerms: Record<string, string> };
export const GENERAL_SEQUENCE_SOURCE = "https://uwaterloo.ca/future-students/co-op/study-work-sequences";
export const MATH_SEQUENCE_SOURCE = "https://uwaterloo.ca/new-math-students/co-op/information";
export const SAF_SEQUENCE_SOURCE = "https://uwaterloo.ca/school-of-accounting-and-finance/undergraduate/your-experience-matters/co-op-sequence-faq";
const normalize = (name: string) => name.toLowerCase().replace(/&/g, "and").replace(/[^a-z0-9]/g, "");
const isProgram = (name: string, names: string[]) => names.some(candidate => normalize(candidate) === normalize(name));
const mathSequences = [[2,4,6,8,10,12], [2,5,7,9,11,12], [4,6,8,10,12,13], [3,5,7,9,11,12]];
const safSequences = [[4,6,9,11], [4,6,10,11], [4,6,9,10], [4,7,9,11], [4,7,10,11], [4,7,9,10]];
// Published co-op schedules, not a claim that every student in these programs is in co-op.
const generalGroups: { programs: string[]; offsets: number[] }[] = [
  { programs: ["Arts and Business", "Honours Arts and Business", "Economics", "English", "Fine Arts", "Environment and Business", "Environment, Resources and Sustainability", "Health Sciences", "Public Health", "Biochemistry", "Biology", "Chemistry", "Earth Sciences", "Environmental Sciences", "Medicinal Chemistry", "Science and Business"], offsets: [4,6,8,10,11] },
  { programs: ["Planning"], offsets: [5,7,9,11,12] },
  { programs: ["Climate and Environmental Change"], offsets: [4,6,8,11,12] },
  { programs: ["Geography and Environmental Management", "Geospatial Data Science", "Geospatial Data Analysis", "Recreation and Leisure Studies", "Recreation, Leadership and Health", "Sport and Recreation Management", "Therapeutic Recreation"], offsets: [4,6,8,10,12] },
  { programs: ["Kinesiology"], offsets: [5,6,8,10,11] },
  { programs: ["Biological and Medical Physics", "Life Physics", "Physics", "Physics and Astronomy"], offsets: [4,6,7,9,11] },
  { programs: ["Materials and Nanosciences"], offsets: [4,6,8,9,11] },
  { programs: ["Science and Financial Management"], offsets: [4,7,9,11] },
  { programs: ["Architecture"], offsets: [4,6,8,10,11,13] },
];
const artsMajors = ["Arts", "Honours Arts", "Anthropology", "Classical Studies", "Communication Arts and Design Practices", "Communication Studies", "French", "Gender and Social Justice", "History", "Legal Studies", "Medieval Studies", "Music", "Peace and Conflict Studies", "Philosophy", "Political Science", "Psychology", "Religion, Culture and Spirituality", "Sexualities, Relationships and Families", "Social Development Studies", "Sociology", "Theatre and Performance"];

const stream4 = [1, 3, 5, 7, 9, 11];
const stream4Late = [1, 3, 5, 7, 10, 12];
const stream8 = [2, 4, 6, 8, 10, 11];
const stream8Late = [2, 4, 6, 8, 10, 12];
export function termCode(year: number, season: number) { return `1${String(year).slice(-2)}${season}`; }
function termsFromOffsets(entry: number, offsets: number[]) {
  return offsets.map(offset => termCode(entry + Math.floor((offset + 2) / 3), [9, 1, 5][offset % 3]));
}
/** Graduation implies a standard five-year cohort; users can correct all suggested terms. */
export function workSequences(school: string, program: string, graduation: string): WorkSequence[] {
  if (school !== "University of Waterloo" || !/^\d{4}$/.test(graduation)) return [];
  const entry = Number(graduation) - 5;
  if (entry < 2020 || entry > 2100) return [];
  const make = (label: string, offsets: number[], source = ENGINEERING_SEQUENCE_SOURCE): WorkSequence => {
    // These published sequences have a first-year spring break when co-op starts in year 2+.
    // Double degrees have ten academic terms; the other templates have eight.
    const studyCount = isProgram(program, ["Business Administration and Computer Science", "Business Administration and Mathematics"]) ? 10 : 8;
    const studyTerms: Record<string, string> = {};
    let academic = 0;
    for (let offset = 0; offset < 18 && academic < studyCount; offset++) {
      if (offsets.includes(offset)) continue;
      const code = termsFromOffsets(entry, [offset])[0];
      if (offset === 2 && offsets[0] >= 4) { studyTerms[code] = "Off"; continue; }
      studyTerms[code] = `${Math.floor(academic / 2) + 1}${academic % 2 ? "B" : "A"}`;
      academic++;
    }
    return { label, entryYear: entry, terms: termsFromOffsets(entry, offsets), source, studyTerms };
  };
  const general = (label: string, offsets: number[], source = GENERAL_SEQUENCE_SOURCE) => make(label, offsets, source);
  if (isProgram(program, ["Accounting and Financial Management", "Mathematics/Chartered Professional Accountancy"])) {
    return safSequences.map((offsets, i) => ({ ...general(`Stream ${i + 1}`, offsets, SAF_SEQUENCE_SOURCE), recommended: i === 0 }));
  }
  if (isProgram(program, ["Sustainability and Financial Management"])) {
    // SAF specifies these graduation cohorts explicitly; do not extrapolate to later ones.
    const allowed = [2026, 2027].includes(Number(graduation)) ? [3,6] : [2028,2029,2030].includes(Number(graduation)) ? [2,3,5,6] : [];
    return allowed.map(n => general(`Stream ${n}`, safSequences[n - 1], SAF_SEQUENCE_SOURCE));
  }
  if (isProgram(program, ["Biotechnology/Chartered Professional Accountancy"])) return [general("Stream 4", safSequences[3], SAF_SEQUENCE_SOURCE)];
  if (isProgram(program, ["Computing and Financial Management", "Mathematics/Financial Analysis and Risk Management", "Financial Analysis and Risk Management"])) return [general("Sequence 1", mathSequences[0], MATH_SEQUENCE_SOURCE)];
  if (isProgram(program, ["Computer Science", "Mathematics", "Mathematics/Business Administration", "Actuarial Science", "Combinatorics and Optimization", "Computational Mathematics", "Data Science", "Mathematical Economics", "Mathematical Optimization", "Mathematical Studies", "Statistics"])) return mathSequences.map((offsets, i) => general(`Sequence ${i + 1}`, offsets, MATH_SEQUENCE_SOURCE));
  if (isProgram(program, ["Business Administration and Computer Science", "Business Administration and Mathematics"])) return [[2,4,7,10,12], [2,4,7,11], [2,4,7,9,12]].map((offsets, i) => ({ ...general(`5DD option ${i + 1}`, offsets, "https://uwaterloo.ca/new-math-students/co-op/sequence-charts"), recommended: i === 0 }));
  if (isProgram(program, ["Mathematical Physics"])) return [general("Mathematics co-op", mathSequences[0], MATH_SEQUENCE_SOURCE), general("Science co-op", [4,6,7,9,11])];
  if (isProgram(program, ["Mathematics/Teaching", "Pure Mathematics/Teaching"])) return [general("First work term: year 1", mathSequences[0]), general("First work term: year 2", mathSequences[2])];
  if (isProgram(program, artsMajors)) return [general("Arts co-op", [5,7,9,11,12]), general("Arts and Business co-op", [4,6,8,10,11])];
  const group = generalGroups.find(group => isProgram(program, group.programs));
  if (group) return [general("Co-op schedule", group.offsets)];
  // Use the same punctuation-insensitive comparison for existing engineering and GBDA names.
  if (entry < 2022) return [];
  const canonical = ["Systems Design Engineering", "Biomedical Engineering", "Management Engineering", "Architectural Engineering", "Electrical Engineering", "Environmental Engineering", "Geological Engineering", "Civil Engineering", "Nanotechnology Engineering", "Software Engineering", "Chemical Engineering", "Computer Engineering", "Mechanical Engineering", "Mechatronics Engineering", "Global Business and Digital Arts"].find(name => isProgram(program, [name]));
  switch (canonical) {
    case "Systems Design Engineering": return [make(entry >= 2026 ? "Stream 8" : "Stream 4", entry >= 2026 ? stream8 : stream4)];
    case "Biomedical Engineering": return [make("Stream 8", entry >= 2026 ? [2, 4, 6, 8, 9, 11] : stream8)];
    case "Management Engineering": return [make("Stream 8", entry >= 2025 ? stream8 : stream8Late)];
    case "Architectural Engineering": return [make("Stream 4", [1, 3, 5, 7, 9, 12])];
    case "Electrical Engineering": return [make("Stream 4", stream4Late)];
    case "Environmental Engineering":
    case "Geological Engineering": return [make("Stream 4", stream4)];
    case "Civil Engineering": return [make("Stream 8", stream8Late)];
    case "Nanotechnology Engineering": return [make("Stream 8", [2, 4, 6, 7, 10, 11])];
    // Current SE primary sequence followed a 2023 change; leave older cohorts manual.
    case "Software Engineering": return entry >= 2023 ? [make("Stream 8", stream8)] : [];
    case "Chemical Engineering": return [make("Stream 4", [1, 3, 5, 7, 10, 11]), make("Stream 8", [2, 4, 6, 8, 9, 11])];
    case "Computer Engineering": return [make("Stream 4", stream4Late), make("Stream 8", stream8Late)];
    case "Mechanical Engineering":
    case "Mechatronics Engineering": return [make("Stream 4", stream4), make("Stream 8", stream8)];
    // GBDA co-op begins with Fall 2022 entrants; older cohorts had an internship.
    case "Global Business and Digital Arts": return [make("GBDA", [6, 8, 10, 11], GBDA_SEQUENCE_SOURCE)];
    default: return [];
  }
}
