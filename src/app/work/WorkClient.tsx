"use client";

import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Project } from "@/sanity/types";
import DataView from "@/components/DataView";
import ProjectGridCard from "./ProjectGridCard";
import ProjectHoverPreview from "./ProjectHoverPreview";
import {
  extractUniqueCategories,
  extractUniqueYears,
  extractUniqueClients,
} from "./utils";

interface WorkClientProps {
  projects: Project[];
}

export default function WorkClient({ projects }: WorkClientProps) {
  return (
    <div className="w-full">
      <Header />

      <main className="w-full">
        <section className="w-full px-[var(--margin)] py-12 flex flex-col gap-12">
          <div className="flex justify-between items-center">
            <h1>
              Work<sup>{projects.length}</sup>
            </h1>
          </div>

          <DataView<Project>
            items={projects}
            getItemKey={(project) => project._id}
            getItemHref={(project) => `/work/${project.slug.current}`}
            storageKey="workViewMode"
            renderGridItem={(project) => <ProjectGridCard project={project} />}
            gridAspectRatio="4/3"
            gridColumns={{ 0: 1, 500: 2, 1100: 3, 1400: 4 }}
            renderHoverPreview={(project) => <ProjectHoverPreview project={project} />}
            columns={[
              {
                key: "title",
                label: "Title",
                span: 3,
                mobileSpan: 2,
                sortable: true,
                className: "font-semibold",
                render: (project) => project.title,
                sortFn: (a, b) => a.title.localeCompare(b.title),
              },
              {
                key: "client",
                label: "Client",
                span: 5,
                mobileSpan: 2,
                sortable: true,
                render: (project) => project.client,
                sortFn: (a, b) => a.client.localeCompare(b.client),
              },
              {
                key: "year",
                label: "Year",
                span: 4,
                mobileSpan: 2,
                align: "right",
                sortable: true,
                render: (project) => project.yearCompleted.toString(),
                sortFn: (a, b) => a.yearCompleted - b.yearCompleted,
              },
            ]}
            searchConfig={{
              placeholder: "Search projects by title or client...",
              searchFn: (project, term) => {
                const searchLower = term.toLowerCase();
                return (
                  project.title.toLowerCase().includes(searchLower) ||
                  project.client.toLowerCase().includes(searchLower)
                );
              },
            }}
            filterConfig={[
              {
                key: "category",
                label: "Category",
                type: "checkbox",
                options: extractUniqueCategories(projects),
                filterFn: (project, selected) =>
                  selected.length === 0 ||
                  selected.includes(project.category || ""),
              },
              {
                key: "year",
                label: "Year",
                type: "checkbox",
                options: extractUniqueYears(projects),
                filterFn: (project, selected) =>
                  selected.length === 0 ||
                  selected.includes(project.yearCompleted.toString()),
              },
              {
                key: "client",
                label: "Client",
                type: "checkbox",
                options: extractUniqueClients(projects),
                filterFn: (project, selected) =>
                  selected.length === 0 || selected.includes(project.client),
              },
            ]}
            sortConfig={{
              defaultField: "year",
              defaultDirection: "desc",
              fields: {},
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
