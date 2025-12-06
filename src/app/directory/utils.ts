import { Member } from "@/sanity/types";
import { FilterOption } from "@/components/DataView/types";
import { isTermPast } from "@/lib/termUtils";

/**
 * Extract unique graduating classes from members
 */
export function extractUniqueClasses(members: Member[]): FilterOption[] {
  const classesSet = new Set<string>();
  members.forEach((member) => {
    if (member.graduatingClass) {
      classesSet.add(member.graduatingClass);
    }
  });
  return Array.from(classesSet)
    .sort()
    .map((value) => ({ value, label: value }));
}

/**
 * Extract unique programs from members
 */
export function extractUniquePrograms(members: Member[]): FilterOption[] {
  const programsSet = new Set<string>();
  members.forEach((member) => {
    if (member.program) {
      programsSet.add(member.program);
    }
  });
  return Array.from(programsSet)
    .sort()
    .map((value) => ({ value, label: value }));
}

/**
 * Extract unique schools from members
 */
export function extractUniqueSchools(members: Member[]): FilterOption[] {
  const schoolsSet = new Set<string>();
  members.forEach((member) => {
    if (member.school) {
      schoolsSet.add(member.school);
    }
  });
  return Array.from(schoolsSet)
    .sort()
    .map((value) => ({ value, label: value }));
}

/**
 * Extract unique specialties from members
 */
export function extractUniqueSpecialties(members: Member[]): FilterOption[] {
  const specialtiesSet = new Set<string>();
  members.forEach((member) => {
    if (member.specialties) {
      member.specialties.forEach((specialty) => specialtiesSet.add(specialty));
    }
  });
  return Array.from(specialtiesSet)
    .sort()
    .map((value) => ({ value, label: value }));
}

/**
 * Extract unique availability terms from members (only future terms)
 */
export function extractAvailabilityTerms(members: Member[]): FilterOption[] {
  const availabilitySet = new Set<string>();
  members.forEach((member) => {
    if (member.workSchedule) {
      member.workSchedule
        .filter((code) => !isTermPast(code)) // Only future terms
        .forEach((code) => availabilitySet.add(code));
    }
  });
  return Array.from(availabilitySet)
    .sort()
    .map((value) => ({ value, label: value }));
}
