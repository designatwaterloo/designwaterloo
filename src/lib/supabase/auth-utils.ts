import { TEST_EMAIL_DOMAIN } from "./test-accounts";

// Test domain is only included in the allowlist outside of production builds.
// The constant itself is always defined so production queries can still
// identify test accounts and filter them out.
const TEST_DOMAIN =
  process.env.NODE_ENV !== "production" ? TEST_EMAIL_DOMAIN : undefined;

export const ALLOWED_EMAIL_DOMAINS = [
  "uwaterloo.ca",
  "mylaurier.ca",
  ...(TEST_DOMAIN ? [TEST_DOMAIN] : []),
];

export function isValidStudentEmail(email: string): boolean {
  const domain = email.split("@")[1]?.toLowerCase();
  return ALLOWED_EMAIL_DOMAINS.includes(domain);
}

export function isLaurierEmail(email: string): boolean {
  const [local, domain] = email.split("@");
  const lowerDomain = domain?.toLowerCase();
  if (lowerDomain === "mylaurier.ca") return true;
  if (TEST_DOMAIN && lowerDomain === TEST_DOMAIN) {
    return local?.toLowerCase().includes("laurier") ?? false;
  }
  return false;
}

export function isWaterlooEmail(email: string): boolean {
  const [local, domain] = email.split("@");
  const lowerDomain = domain?.toLowerCase();
  if (lowerDomain === "uwaterloo.ca") return true;
  if (TEST_DOMAIN && lowerDomain === TEST_DOMAIN) {
    return !local?.toLowerCase().includes("laurier");
  }
  return false;
}

export function getSchoolFromEmail(
  email: string
): "University of Waterloo" | "Wilfrid Laurier University" | null {
  const [local, domain] = email.split("@");
  const lowerDomain = domain?.toLowerCase();
  if (lowerDomain === "uwaterloo.ca") return "University of Waterloo";
  if (lowerDomain === "mylaurier.ca") return "Wilfrid Laurier University";
  if (TEST_DOMAIN && lowerDomain === TEST_DOMAIN) {
    return local?.toLowerCase().includes("laurier")
      ? "Wilfrid Laurier University"
      : "University of Waterloo";
  }
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
