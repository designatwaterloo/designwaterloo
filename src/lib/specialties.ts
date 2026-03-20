/** Canonical specialties list and short URL codes. */

export const SPECIALTIES = [
  "Product Design",
  "UX Research",
  "Graphic Design",
  "Branding",
  "Content",
  "Design Engineering",
  "Photography",
  "Videography",
  "Illustration",
  "Fashion",
  "Motion Design",
  "3D Design",
  "Industrial Design",
  "Architecture",
  "Game Design",
  "Sound Design",
  "Music",
] as const;

export type Specialty = (typeof SPECIALTIES)[number];

/** Short codes used in URLs — e.g. /directory?s=PRD */
const CODE_TO_SPECIALTY: Record<string, Specialty> = {
  PRD: "Product Design",
  UXR: "UX Research",
  GFX: "Graphic Design",
  BRD: "Branding",
  CTN: "Content",
  ENG: "Design Engineering",
  PHO: "Photography",
  VID: "Videography",
  ILL: "Illustration",
  FSH: "Fashion",
  MOT: "Motion Design",
  "3D": "3D Design",
  IND: "Industrial Design",
  ARC: "Architecture",
  GMD: "Game Design",
  SND: "Sound Design",
  MUS: "Music",
};

const SPECIALTY_TO_CODE: Record<string, string> = Object.fromEntries(
  Object.entries(CODE_TO_SPECIALTY).map(([code, name]) => [name, code])
);

/** Decode a URL code to its full specialty name. Returns the input unchanged if unknown. */
export function decodeSpecialtyCode(code: string): string {
  return CODE_TO_SPECIALTY[code.toUpperCase()] ?? code;
}

/** Encode a specialty name to its short URL code. Returns the input unchanged if unknown. */
export function encodeSpecialtyCode(name: string): string {
  return SPECIALTY_TO_CODE[name] ?? name;
}
