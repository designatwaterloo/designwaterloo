import Header from "@/components/Header";
import Footer from "@/components/Footer";
import Link from "@/components/Link";
import { client } from "@/sanity/lib/client";
import { projectsQuery } from "@/sanity/queries";
import type { Project } from "@/sanity/types";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Work | Design Waterloo",
  openGraph: {
    title: "Work | Design Waterloo",
  },
  twitter: {
    title: "Work | Design Waterloo",
  },
};

export default async function WorkPage() {
  const projects: Project[] = await client.fetch(projectsQuery);

  return (
    <div>
      <Header />
      <main>
        <section className="grid-section">
          <div className="col-span-full">
            <h1>Work<sup>{projects.length}</sup></h1>

            {projects.length === 0 ? (
              <p className="mt-8">No projects found. Add some projects in your Sanity Studio!</p>
            ) : (
              <ul className="mt-8 space-y-4">
                {projects.map((project) => (
                  <li key={project._id}>
                    <Link href={`/work/${project.slug.current}`} className="text-2xl hover:underline">
                      {project.title} - {project.client} ({project.yearCompleted})
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
