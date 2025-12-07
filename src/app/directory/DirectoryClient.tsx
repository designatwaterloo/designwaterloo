"use client";

import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Member } from "@/sanity/types";
import { decodeTermCode } from "@/lib/termUtils";
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
}

export default function DirectoryClient({ members }: DirectoryClientProps) {
  return (
    <div className="w-full">
      <Header />

      <main className="w-full">
        <section className="w-full px-[var(--margin)] py-12 flex flex-col gap-12">
          <div className="flex justify-between items-center">
            <h1>
              Directory<sup>{members.length}</sup>
            </h1>
          </div>

          <DataView<Member>
            items={members}
            getItemKey={(member) => member._id}
            getItemHref={(member) => `/directory/${member.slug.current}`}
            storageKey="directoryViewMode"
            renderGridItem={(member) => (
              <MemberGridCard member={member} />
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

