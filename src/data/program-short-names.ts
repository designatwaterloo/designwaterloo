// Display labels only: full program names are always saved.
// Waterloo engineering codes: https://ucalendar.uwaterloo.ca/2223/PDFS/eng.pdf
// SYDE: https://uwaterloo.ca/future-students/programs/systems-design-engineering
// AFM: https://uwaterloo.ca/co-operative-education/blog
// BBA: https://www.wlu.ca/academics/faculties/lazaridis-school-of-business-and-economics/about/business.html
const shortNames: Record<string, string> = {
  "Systems Design Engineering": "SYDE",
  "Biomedical Engineering": "BME",
  "Civil Engineering": "CIVE",
  "Environmental Engineering": "ENVE",
  "Architectural Engineering": "AE",
  "Chemical Engineering": "CHE",
  "Mechatronics Engineering": "MTE",
  "Mechanical Engineering": "ME",
  "Software Engineering": "SE",
  "Nanotechnology Engineering": "NE",
  "Accounting & Financial Management": "AFM",
  "Global Business & Digital Arts": "GBDA",
  "Business Administration": "BBA",
};
export function shortProgramName(program: string): string {
  // For other programs use a compact display initialism, not an official code.
  return shortNames[program] || (program.length > 16
    ? program.split(/[\s&/]+/).filter(word => word && !["and", "of", "with", "in"].includes(word.toLowerCase())).map(word => word[0]).join("").toUpperCase()
    : program);
}
