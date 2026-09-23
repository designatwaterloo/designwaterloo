"use client";

import { useMemo, useCallback } from "react";
import Footer from "@/components/Footer";
import { Member } from "@/sanity/types";
import { decodeTermCode } from "@/lib/termUtils";
import { decodeSpecialtyCode, encodeSpecialtyCode } from "@/lib/specialties";
import DataView from "@/components/DataView";
import MemberGridCard from "./MemberGridCard";
import MemberHoverPreview from "./MemberHoverPreview";
import {
  extractUniqueClasses,
  extractUniquePrograms,
  extractUniqueSchools,
  extractUniqueSpecialties,
  extractAvailabilityTerms,
} from "./utils";

interface DirectoryClientProps {
  members: Member[];
  initialQuery: string;
}

export default function DirectoryClient({ members, initialQuery }: DirectoryClientProps) {

  const initialFilters = useMemo(() => {
    const searchParams = new URLSearchParams(initialQuery);
    const filters: Record<string, string[]> = {};

    // Short params: s=PRD → specialty=["Product Design"], a=1261 → availability=["1261"]
    const specialtyCodes = searchParams.getAll("s");
    if (specialtyCodes.length > 0) {
      filters.specialty = specialtyCodes.map(decodeSpecialtyCode);
    }
    const availCodes = searchParams.getAll("a");
    if (availCodes.length > 0) {
      filters.availability = availCodes;
    }

    // Also support full param names for direct use
    const directKeys = ["class", "program", "school", "specialty", "availability"];
    for (const key of directKeys) {
      const values = searchParams.getAll(key);
      if (values.length > 0) {
        filters[key] = [...(filters[key] ?? []), ...values];
      }
    }

    return filters;
  }, [initialQuery]);

  const handleFiltersChange = useCallback((filters: Record<string, string[]>) => {
    // The directory can remain underneath the sign-in route.
    if (window.location.pathname !== "/directory") return;
    const params = new URLSearchParams();

    // Encode specialties as short codes
    for (const val of filters.specialty ?? []) {
      params.append("s", encodeSpecialtyCode(val));
    }
    // Encode availability as short codes
    for (const val of filters.availability ?? []) {
      params.append("a", val);
    }
    // Other filters use full names
    for (const key of ["class", "program", "school"]) {
      for (const val of filters[key] ?? []) {
        params.append(key, val);
      }
    }

    const qs = params.toString();
    const url = qs ? `/directory?${qs}` : "/directory";
    window.history.replaceState(null, "", url);
  }, []);

  return (
    <div className="w-full">
      <main className="w-full">
        <section className="w-full px-[var(--margin)] py-12 flex flex-col gap-12">
          <div className="flex justify-between items-center">
            <h1>
              Directory<sup aria-label={`${members.length} members`}> {members.length}</sup>
            </h1>
          </div>

          <DataView<Member>
            items={members}
            getItemKey={(member) => member._id}
            getItemHref={(member) => `/@${member.slug.current}`}
            storageKey="directoryViewMode"
            initialFilters={initialFilters}
            onFiltersChange={handleFiltersChange}
            renderGridItem={(member, index) => (
              <MemberGridCard member={member} index={index} />
            )}
            gridAspectRatio="4/5"
            renderHoverPreview={(member) => <MemberHoverPreview member={member} />}
            columns={[
              {
                key: "name",
                label: "Name",
                span: 3,
                mobileSpan: 2,
                sortable: true,
                className: "font-semibold",
                render: (member) => `${member.firstName} ${member.lastName}`,
                sortFn: (a, b) =>
                  `${a.firstName} ${a.lastName}`.localeCompare(
                    `${b.firstName} ${b.lastName}`
                  ),
              },
              {
                key: "program",
                label: "Program",
                span: 6,
                mobileSpan: 2,
                sortable: true,
                render: (member) => member.program || "",
                sortFn: (a, b) => (a.program || "").localeCompare(b.program || ""),
              },
              {
                key: "class",
                label: "Class",
                span: 3,
                mobileSpan: 2,
                align: "right",
                sortable: true,
                render: (member) => member.graduatingClass || "",
                sortFn: (a, b) =>
                  (a.graduatingClass || "").localeCompare(b.graduatingClass || ""),
              },
            ]}
            searchConfig={{
              placeholder: "Search by name, program, or specialty...",
              searchFn: (member, term) => {
                const searchLower = term.toLowerCase();
                const fullName = `${member.firstName} ${member.lastName}`.toLowerCase();
                const program = member.program?.toLowerCase() || "";
                const specialties = member.specialties?.join(" ").toLowerCase() || "";
                return (
                  fullName.includes(searchLower) ||
                  program.includes(searchLower) ||
                  specialties.includes(searchLower)
                );
              },
            }}
            filterConfig={[
              {
                key: "class",
                label: "Graduating Class",
                type: "checkbox",
                options: extractUniqueClasses(members),
                filterFn: (member, selected) =>
                  selected.length === 0 ||
                  selected.includes(member.graduatingClass || ""),
              },
              {
                key: "program",
                label: "Program",
                type: "checkbox",
                options: extractUniquePrograms(members),
                filterFn: (member, selected) =>
                  selected.length === 0 || selected.includes(member.program || ""),
              },
              {
                key: "school",
                label: "School",
                type: "checkbox",
                options: extractUniqueSchools(members),
                filterFn: (member, selected) =>
                  selected.length === 0 || selected.includes(member.school || ""),
              },
              {
                key: "specialty",
                label: "Specialties",
                type: "checkbox",
                options: extractUniqueSpecialties(members),
                filterFn: (member, selected) =>
                  selected.length === 0 ||
                  selected.some((s) => member.specialties?.includes(s)),
              },
              {
                key: "availability",
                label: "Availability",
                type: "checkbox",
                options: extractAvailabilityTerms(members),
                filterFn: (member, selected) =>
                  selected.length === 0 ||
                  selected.some((a) => member.workSchedule?.includes(a)),
                formatValue: (value) => decodeTermCode(value),
              },
            ]}
            sortConfig={{
              defaultField: "memberId",
              defaultDirection: "asc",
              fields: {
                memberId: (a, b) => (a.memberId ?? 999999) - (b.memberId ?? 999999),
              },
            }}
            viewModeConfig={{
              defaultMode: "grid",
              showToggle: true,
            }}
          />
        </section>
      </main>

      <Footer />
    </div>
  );
}

