"use client";

import { useState } from "react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import Image from "next/image";
import Button from "@/components/Button";
import { Member } from "@/sanity/types";
import Link from "@/components/Link";
import { urlFor } from "@/sanity/lib/image";
import styles from "./page.module.css";

type ViewMode = "grid" | "table";

interface DirectoryClientProps {
  members: Member[];
}

export default function DirectoryClient({ members }: DirectoryClientProps) {
  const [viewMode, setViewMode] = useState<ViewMode>("grid");

  return (
    <div className="w-full">
      <Header />

      {/* Main Content */}
      <main className="w-full">
        <section className="w-full px-[var(--margin)] py-12 flex flex-col gap-12">
          <div className="flex justify-between items-center">
            <h1>Directory</h1>
            <div className="flex gap-2">
              <Button 
                onClick={() => setViewMode("grid")}
                variant={viewMode === "grid" ? "primary" : "secondary"}
              >
                Grid
              </Button>
              <Button 
                onClick={() => setViewMode("table")}
                variant={viewMode === "table" ? "primary" : "secondary"}
              >
                Table
              </Button>
            </div>
          </div>
          
          {viewMode === "grid" ? (
            <div className="grid grid-cols-6 gap-[var(--gap)] w-full max-lg:grid-cols-4 mobile-grid-2">
              {members.map((member) => (
                <Link 
                  key={member._id} 
                  href={`/directory/${member.slug.current}`}
                  className="flex flex-col gap-4 group"
                  underline={false}
                >
                  {member.profileImage ? (
                    <Image
                      src={urlFor(member.profileImage).width(400).height(500).url()}
                      alt={`${member.firstName} ${member.lastName}`}
                      width={400}
                      height={400}
                      className="aspect-[4/5] w-full object-cover rounded grayscale group-hover:grayscale-0 transition-all duration-300"
                    />
                  ) : (
                    <div className="aspect-[4/5] bg-[#d9d9d9] rounded" />
                  )}
                  <div className="flex flex-col gap-0">
                    <p className="text-[var(--foreground)]">
                      {member.firstName} {member.lastName}
                    </p>
                    <p>
                      {member.program}
                    </p>
                    <p className="py-2">
                      {member.graduatingClass}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className={styles.tableView}>
              {members.map((member) => (
                <Link 
                  key={member._id}
                  href={`/directory/${member.slug.current}`}
                  className={styles.tableRow}
                  underline={false}
                >
                  <div className={styles.nameColumn}>
                    {member.firstName} {member.lastName}
                  </div>
                  <div className={styles.infoColumn}>
                    {member.program}
                  </div>
                  <div className={styles.classColumn}>
                    {member.graduatingClass}
                  </div>
                </Link>
              ))}
            </div>
          )}
        </section>
      </main>

      <Footer />
    </div>
  );
}

