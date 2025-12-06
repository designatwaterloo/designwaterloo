import { Project } from "@/sanity/types";
import { FilterOption } from "@/components/DataView/types";

/**
 * Extract unique categories from projects
 */
export function extractUniqueCategories(projects: Project[]): FilterOption[] {
  const categoriesSet = new Set<string>();
  projects.forEach((project) => {
    if (project.category) {
      categoriesSet.add(project.category);
    }
  });
  return Array.from(categoriesSet)
    .sort()
    .map((value) => ({
      value,
      label: value.charAt(0).toUpperCase() + value.slice(1).replace(/-/g, " "),
    }));
}

/**
 * Extract unique years from projects
 */
export function extractUniqueYears(projects: Project[]): FilterOption[] {
  const yearsSet = new Set<number>();
  projects.forEach((project) => {
    yearsSet.add(project.yearCompleted);
  });
  return Array.from(yearsSet)
    .sort((a, b) => b - a) // Descending order (most recent first)
    .map((value) => ({ value: value.toString(), label: value.toString() }));
}

/**
 * Extract unique clients from projects
 */
export function extractUniqueClients(projects: Project[]): FilterOption[] {
  const clientsSet = new Set<string>();
  projects.forEach((project) => {
    clientsSet.add(project.client);
  });
  return Array.from(clientsSet)
    .sort()
    .map((value) => ({ value, label: value }));
}
