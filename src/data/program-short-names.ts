// Compact display labels only. Full program names are always saved.
// Waterloo subject codes (2023–24):
// https://academic-calendar-archive.uwaterloo.ca/undergraduate-studies/2023-2024/page/Course-Descriptions-Index.html
// Laurier LORIS/transcript discipline codes (2026–27):
// https://academic-calendar.wlu.ca/section.php?cal=1&s=1185&ss=4719&y=93
// BBA is the established degree abbreviation, retained instead of the BUSI subject code:
// https://www.wlu.ca/academics/faculties/lazaridis-school-of-business-and-economics/about/business.html
// Sourced abbreviations take precedence over explicit UI short labels below.
// Unknown/custom program names are never automatically shortened.
const shortNames: Record<string, Record<string, string>> = {
  "University of Waterloo": {
    // BPH: https://uwaterloo.ca/public-health-sciences/current-undergraduate-students/majors-minors-specializations
    "Public Health": "BPH",
    // BSW: https://uwaterloo.ca/future-students/programs/social-work
    "Social Work": "BSW",
    // TR: https://uwaterloo.ca/future-students/missing-manual/humans/health/finding-new-meaning-recreation
    "Therapeutic Recreation": "TR",
    // Program abbreviations missing from the course-subject index.
    // CE, ELE, MGTE: https://uwaterloo.ca/engineering/resources-and-services/style-guide
    // CM, FARM, Math/CPA: https://uwaterloo.ca/math/undergraduate-studies/student-experience-and-supports/academic-advising
    // RCS: https://uwaterloo.ca/religion-culture-spirituality/
    // SRF: https://uwaterloo.ca/st-jeromes/srf
    // CADP: https://uwaterloo.ca/communication-arts/contacts/advisors
    // CEC: https://uwaterloo.ca/geography-environmental-management/undergraduate/faq-page-2026-2027-curriculum-changes
    // ITM: https://uwaterloo.ca/math/undergraduate-studies/programs/information-technology-management-itm
    // ScFM: https://uwaterloo.ca/school-of-accounting-and-finance/contact-us
    "Computer Engineering": "CE",
    "Electrical Engineering": "ELE",
    "Management Engineering": "MGTE",
    "Computational Mathematics": "CM",
    "Mathematics/Financial Analysis & Risk Management": "FARM",
    "Mathematics/Chartered Professional Accountancy": "Math/CPA",
    "Religion, Culture & Spirituality": "RCS",
    "Sexualities, Relationships & Families": "SRF",
    "Communication Arts and Design Practices": "CADP",
    "Climate & Environmental Change": "CEC",
    "Information Technology Management": "ITM",
    "Science & Financial Management": "ScFM",
    "Accounting & Financial Management": "AFM",
    "Actuarial Science": "ACTSC",
    "Anthropology": "ANTH",
    "Applied Mathematics": "AMATH",
    "Architectural Engineering": "AE",
    "Architecture": "ARCH",
    "Arts": "ARTS",
    "Arts & Business": "ARBUS",
    "Biology": "BIOL",
    "Biomedical Engineering": "BME",
    "Chemical Engineering": "CHE",
    "Chemistry": "CHEM",
    "Civil Engineering": "CIVE",
    "Classical Studies": "CLAS",
    "Combinatorics & Optimization": "CO",
    "Communication Studies": "COMMST",
    "Computer Science": "CS",
    "Computing & Financial Management": "CFM",
    "Earth Sciences": "EARTH",
    "Economics": "ECON",
    "English": "ENGL",
    "Environment & Business": "ENBUS",
    "Environment, Resources & Sustainability": "ERS",
    "Environmental Engineering": "ENVE",
    "Fine Arts": "FINE",
    "French": "FR",
    "Gender & Social Justice": "GSJ",
    "Geography & Environmental Management": "GEOG",
    "Geological Engineering": "GEOE",
    "Global Business & Digital Arts": "GBDA",
    "History": "HIST",
    "Kinesiology": "KIN",
    "Legal Studies": "LS",
    "Materials & Nanosciences": "MNS",
    "Mathematics": "MATH",
    "Mechanical Engineering": "ME",
    "Mechatronics Engineering": "MTE",
    "Medieval Studies": "MEDVL",
    "Music": "MUSIC",
    "Nanotechnology Engineering": "NE",
    "Optometry": "OPTOM",
    "Peace & Conflict Studies": "PACS",
    "Pharmacy": "PHARM",
    "Philosophy": "PHIL",
    "Physics": "PHYS",
    "Planning": "PLAN",
    "Political Science": "PSCI",
    "Psychology": "PSYCH",
    "Pure Mathematics": "PMATH",
    "Recreation & Leisure Studies": "REC",
    "Science": "SCI",
    "Science & Business": "SCBUS",
    "Social Development Studies": "SDS",
    "Sociology": "SOC",
    "Software Engineering": "SE",
    "Statistics": "STAT",
    "Sustainability & Financial Management": "SFM",
    "Systems Design Engineering": "SYDE",
    "Theatre & Performance": "THPERF"
  },
  "Wilfrid Laurier University": {
    "Anthropology": "ANTH",
    "Biology": "BIOL",
    "Business Administration": "BBA",
    "Business Technology Management": "BUTM",
    "Chemistry": "CHEM",
    "Communication Studies": "COMS",
    "Computer Science": "CPTG",
    "Criminology": "CRIM",
    "Cultural Studies": "CULT",
    "Data Science": "DATA",
    "Economics": "ECON",
    "Education": "EDUC",
    "English": "ENGL",
    "Environmental Science": "ENVX",
    "Environmental Studies": "EVST",
    "Film Studies": "FILM",
    "French": "FREN",
    "Game Design & Development": "DESI",
    "Geography": "GEOG",
    "Global Studies": "GLST",
    "Health Sciences": "HESC",
    "Health Studies": "HEST",
    "History": "HIST",
    "Indigenous Studies": "INDG",
    "International Education Studies": "INED",
    "Law & Society": "LWSC",
    "Leadership": "LEAD",
    "Mathematics": "MATH",
    "Medieval & Medievalism Studies": "MLST",
    "Music": "MUSI",
    "Music Therapy": "MUMT",
    "North American Studies": "NAST",
    "Philosophy": "PHIL",
    "Policing": "PLCG",
    "Political Science": "POLI",
    "Psychology": "PSYC",
    "Religion & Culture": "RL&C",
    "Science": "SCIE",
    "Sociology": "SOCI",
    "Software Engineering": "SENG",
    "Spanish": "SPAN",
    "User Experience Design": "UEXD",
    "Women & Gender Studies": "WOMS",
    "Youth & Children's Studies": "YCST"
  }
};

// Explicit UI short labels where no single official program abbreviation was verified.
// These are not institutional codes; keep readable words rather than inventing acronyms.
// Already-short names (e.g. Pre-law) intentionally stay readable.
const waterlooDisplayLabels: Record<string, string> = {
  "Applied Mathematics with Scientific Computing & Scientific Machine Learning": "AMATH + SciComp/ML",
  "Biochemistry": "Biochem",
  "Biological & Medical Physics": "Bio/Med Phys",
  "Biomedical Sciences": "Biomed Sci",
  "Biostatistics": "Biostat",
  "Business Administration & Computer Science": "BBA/CS",
  "Business Administration & Mathematics": "BBA/Math",
  "Communications": "Comms",
  "Data Science": "Data Sci",
  "Education": "Educ.",
  "Environmental Sciences": "Env Sci",
  "Geography & Aviation": "Geog/Avia",
  "Geospatial Data Analysis": "Geospatial",
  "Health Sciences": "Health Sci",
  "Human Rights & Law": "Rights/Law",
  "Liberal Studies": "Liberal St.",
  "Life Sciences": "Life Sci",
  "Mathematical Economics": "Math Econ",
  "Mathematical Finance": "Math Fin",
  "Mathematical Optimization": "Math Opt",
  "Mathematical Physics": "Math Phys",
  "Mathematical Studies": "Math St.",
  "Mathematics/Business Administration": "Math/Business",
  "Mathematics/Teaching": "Math/Teach",
  "Medical Sciences & Doctor of Medicine": "Med Sci/MD",
  "Medicinal Chemistry": "Med Chem",
  "Physical Sciences": "Physical Sci",
  "Physics & Astronomy": "Phys/Astro",
  "Pre-law": "Pre-law",
  "Recreation, Leadership & Health": "Rec/Lead/Health",
  "Science & Aviation": "Sci/Avia",
  "Social Development Studies & Social Work": "SDS/Social Work",
  "Sport & Recreation Management": "Sport/Rec Mgmt",
  "Teaching": "Teach.",

};

function normalizeProgramName(program: string): string {
  return program.toLowerCase().replace(/&/g, "and").replace(/[^a-z0-9]/g, "");
}

export function shortProgramName(program: string, school: string): string {
  const names = school === "University of Waterloo"
    ? { ...waterlooDisplayLabels, ...shortNames[school] }
    : shortNames[school];
  if (!names) return program;
  const normalized = normalizeProgramName(program);
  const match = Object.keys(names).find(name => normalizeProgramName(name) === normalized);
  return match ? names[match] : program;
}

/** Used by coverage checks: a full name may deliberately be its own compact label. */
export function hasProgramShortName(program: string, school: string): boolean {
  const names = school === "University of Waterloo"
    ? { ...waterlooDisplayLabels, ...shortNames[school] }
    : shortNames[school];
  return !!names && Object.keys(names).some(name => normalizeProgramName(name) === normalizeProgramName(program));
}
