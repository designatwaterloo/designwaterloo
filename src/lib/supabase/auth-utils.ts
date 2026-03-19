export const ALLOWED_EMAIL_DOMAINS = ["uwaterloo.ca", "mylaurier.ca"];

export function isValidStudentEmail(email: string): boolean {
  const domain = email.split("@")[1]?.toLowerCase();
  return ALLOWED_EMAIL_DOMAINS.includes(domain);
}

export function isLaurierEmail(email: string): boolean {
  return email.split("@")[1]?.toLowerCase() === "mylaurier.ca";
}

export function isWaterlooEmail(email: string): boolean {
  return email.split("@")[1]?.toLowerCase() === "uwaterloo.ca";
}

export function getSchoolFromEmail(
  email: string
): "University of Waterloo" | "Wilfrid Laurier University" | null {
  const domain = email.split("@")[1]?.toLowerCase();
  if (domain === "uwaterloo.ca") return "University of Waterloo";
  if (domain === "mylaurier.ca") return "Wilfrid Laurier University";
  return null;
}

export function generateSlug(firstName: string, lastName: string): string {
  const base = `${firstName}-${lastName}`
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, "")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
  return base;
}
