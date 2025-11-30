"use client";

import { useState, useMemo, useEffect, useRef } from "react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import Image from "next/image";
import Button from "@/components/Button";
import { Member } from "@/sanity/types";
import Link from "@/components/Link";
import { urlFor } from "@/sanity/lib/image";
import styles from "./page.module.css";
import { decodeTermCode, isTermPast } from "@/lib/termUtils";

type ViewMode = "grid" | "table";
type SortField = "name" | "program" | "class" | "memberId";
type SortDirection = "asc" | "desc";

interface DirectoryClientProps {
  members: Member[];
}

export default function DirectoryClient({ members }: DirectoryClientProps) {
  const [viewMode, setViewMode] = useState<ViewMode>("grid");
  const [hoveredMemberId, setHoveredMemberId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedClasses, setSelectedClasses] = useState<string[]>([]);
  const [selectedPrograms, setSelectedPrograms] = useState<string[]>([]);
  const [selectedSchools, setSelectedSchools] = useState<string[]>([]);
  const [selectedSpecialties, setSelectedSpecialties] = useState<string[]>([]);
  const [selectedAvailability, setSelectedAvailability] = useState<string[]>([]);
  const [openPopover, setOpenPopover] = useState<string | null>(null);
  const [sortField, setSortField] = useState<SortField>("memberId");
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");

  // Load saved view mode from localStorage after mount to avoid hydration mismatch
  useEffect(() => {
    const savedView = localStorage.getItem("directoryViewMode");
    if (savedView === "grid" || savedView === "table") {
      setViewMode(savedView);
    }
  }, []);

  // Save view mode to localStorage whenever it changes
  const handleViewModeChange = (mode: ViewMode) => {
    setViewMode(mode);
    if (typeof window !== "undefined") {
      localStorage.setItem("directoryViewMode", mode);
    }
  };

  // Extract unique values for filters
  const { classes, programs, schools, specialties, availabilityTerms } = useMemo(() => {
    const classesSet = new Set<string>();
    const programsSet = new Set<string>();
    const schoolsSet = new Set<string>();
    const specialtiesSet = new Set<string>();
    const availabilitySet = new Set<string>();

    members.forEach((member) => {
      if (member.graduatingClass) classesSet.add(member.graduatingClass);
      if (member.program) programsSet.add(member.program);
      if (member.school) schoolsSet.add(member.school);
      if (member.specialties) {
        member.specialties.forEach((specialty) => specialtiesSet.add(specialty));
      }
      if (member.workSchedule) {
        member.workSchedule
          .filter(code => !isTermPast(code)) // Only future terms
          .forEach((code) => availabilitySet.add(code));
      }
    });

    return {
      classes: Array.from(classesSet).sort(),
      programs: Array.from(programsSet).sort(),
      schools: Array.from(schoolsSet).sort(),
      specialties: Array.from(specialtiesSet).sort(),
      availabilityTerms: Array.from(availabilitySet).sort(), // Already sortable as term codes
    };
  }, [members]);

  // Filter members with AND logic
  const filteredMembers = useMemo(() => {
    return members.filter((member) => {
      // Search filter
      if (searchTerm) {
        const searchLower = searchTerm.toLowerCase();
        const fullName = `${member.firstName} ${member.lastName}`.toLowerCase();
        const program = member.program?.toLowerCase() || "";
        const memberSpecialties = member.specialties?.join(" ").toLowerCase() || "";
        if (!fullName.includes(searchLower) && !program.includes(searchLower) && !memberSpecialties.includes(searchLower)) {
          return false;
        }
      }

      // Class filter
      if (selectedClasses.length > 0 && !selectedClasses.includes(member.graduatingClass || "")) {
        return false;
      }

      // Program filter
      if (selectedPrograms.length > 0 && !selectedPrograms.includes(member.program || "")) {
        return false;
      }

      // School filter
      if (selectedSchools.length > 0 && !selectedSchools.includes(member.school || "")) {
        return false;
      }

      // Specialties filter
      if (selectedSpecialties.length > 0) {
        const hasMatchingSpecialty = selectedSpecialties.some(
          (specialty) => member.specialties?.includes(specialty)
        );
        if (!hasMatchingSpecialty) {
          return false;
        }
      }

      // Availability filter
      if (selectedAvailability.length > 0) {
        const hasMatchingAvailability = selectedAvailability.some(
          (term) => member.workSchedule?.includes(term)
        );
        if (!hasMatchingAvailability) {
          return false;
        }
      }

      return true;
    });
  }, [members, searchTerm, selectedClasses, selectedPrograms, selectedSchools, selectedSpecialties, selectedAvailability]);

  // Count members per filter option
  const getFilterCount = (filterType: "class" | "program" | "school" | "specialty" | "availability", value: string) => {
    return members.filter((member) => {
      const searchLower = searchTerm.toLowerCase();
      const memberSpecialties = member.specialties?.join(" ").toLowerCase() || "";
      const matchesSearch = !searchTerm ||
        `${member.firstName} ${member.lastName}`.toLowerCase().includes(searchLower) ||
        member.program?.toLowerCase().includes(searchLower) ||
        memberSpecialties.includes(searchLower);

      if (!matchesSearch) return false;

      if (filterType === "class") {
        const matchesProgram = selectedPrograms.length === 0 || selectedPrograms.includes(member.program || "");
        const matchesSchool = selectedSchools.length === 0 || selectedSchools.includes(member.school || "");
        const matchesSpecialty = selectedSpecialties.length === 0 || selectedSpecialties.some(s => member.specialties?.includes(s));
        const matchesAvailability = selectedAvailability.length === 0 || selectedAvailability.some(a => member.workSchedule?.includes(a));
        return member.graduatingClass === value && matchesProgram && matchesSchool && matchesSpecialty && matchesAvailability;
      } else if (filterType === "program") {
        const matchesClass = selectedClasses.length === 0 || selectedClasses.includes(member.graduatingClass || "");
        const matchesSchool = selectedSchools.length === 0 || selectedSchools.includes(member.school || "");
        const matchesSpecialty = selectedSpecialties.length === 0 || selectedSpecialties.some(s => member.specialties?.includes(s));
        const matchesAvailability = selectedAvailability.length === 0 || selectedAvailability.some(a => member.workSchedule?.includes(a));
        return member.program === value && matchesClass && matchesSchool && matchesSpecialty && matchesAvailability;
      } else if (filterType === "school") {
        const matchesClass = selectedClasses.length === 0 || selectedClasses.includes(member.graduatingClass || "");
        const matchesProgram = selectedPrograms.length === 0 || selectedPrograms.includes(member.program || "");
        const matchesSpecialty = selectedSpecialties.length === 0 || selectedSpecialties.some(s => member.specialties?.includes(s));
        const matchesAvailability = selectedAvailability.length === 0 || selectedAvailability.some(a => member.workSchedule?.includes(a));
        return member.school === value && matchesClass && matchesProgram && matchesSpecialty && matchesAvailability;
      } else if (filterType === "specialty") {
        const matchesClass = selectedClasses.length === 0 || selectedClasses.includes(member.graduatingClass || "");
        const matchesProgram = selectedPrograms.length === 0 || selectedPrograms.includes(member.program || "");
        const matchesSchool = selectedSchools.length === 0 || selectedSchools.includes(member.school || "");
        const matchesAvailability = selectedAvailability.length === 0 || selectedAvailability.some(a => member.workSchedule?.includes(a));
        return member.specialties?.includes(value) && matchesClass && matchesProgram && matchesSchool && matchesAvailability;
      } else {
        const matchesClass = selectedClasses.length === 0 || selectedClasses.includes(member.graduatingClass || "");
        const matchesProgram = selectedPrograms.length === 0 || selectedPrograms.includes(member.program || "");
        const matchesSchool = selectedSchools.length === 0 || selectedSchools.includes(member.school || "");
        const matchesSpecialty = selectedSpecialties.length === 0 || selectedSpecialties.some(s => member.specialties?.includes(s));
        return member.workSchedule?.includes(value) && matchesClass && matchesProgram && matchesSchool && matchesSpecialty;
      }
    }).length;
  };

  const toggleFilter = (filterType: "class" | "program" | "school" | "specialty" | "availability", value: string) => {
    if (filterType === "class") {
      setSelectedClasses(prev =>
        prev.includes(value) ? prev.filter(v => v !== value) : [...prev, value]
      );
    } else if (filterType === "program") {
      setSelectedPrograms(prev =>
        prev.includes(value) ? prev.filter(v => v !== value) : [...prev, value]
      );
    } else if (filterType === "school") {
      setSelectedSchools(prev =>
        prev.includes(value) ? prev.filter(v => v !== value) : [...prev, value]
      );
    } else if (filterType === "specialty") {
      setSelectedSpecialties(prev =>
        prev.includes(value) ? prev.filter(v => v !== value) : [...prev, value]
      );
    } else {
      setSelectedAvailability(prev =>
        prev.includes(value) ? prev.filter(v => v !== value) : [...prev, value]
      );
    }
  };

  const clearFilters = () => {
    setSearchTerm("");
    setSelectedClasses([]);
    setSelectedPrograms([]);
    setSelectedSchools([]);
    setSelectedSpecialties([]);
    setSelectedAvailability([]);
  };

  const activeFilterCount = selectedClasses.length + selectedPrograms.length + selectedSchools.length + selectedSpecialties.length + selectedAvailability.length;

  // Sort members
  const sortedMembers = useMemo(() => {
    const sorted = [...filteredMembers];

    sorted.sort((a, b) => {
      let comparison = 0;

      switch (sortField) {
        case "name":
          comparison = `${a.firstName} ${a.lastName}`.localeCompare(`${b.firstName} ${b.lastName}`);
          break;
        case "program":
          comparison = (a.program || "").localeCompare(b.program || "");
          break;
        case "class":
          comparison = (a.graduatingClass || "").localeCompare(b.graduatingClass || "");
          break;
        case "memberId":
          comparison = (a.memberId || 999999) - (b.memberId || 999999);
          break;
      }

      return sortDirection === "asc" ? comparison : -comparison;
    });

    return sorted;
  }, [filteredMembers, sortField, sortDirection]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(prev => prev === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };

  // Close popover on click outside
  const popoverRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(event.target as Node)) {
        setOpenPopover(null);
      }
    };

    if (openPopover) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [openPopover]);

  return (
    <div className="w-full">
      <Header />

      {/* Main Content */}
      <main className="w-full">
        <section className="w-full px-[var(--margin)] py-12 flex flex-col gap-12">
          <div className="flex justify-between items-center">
            <h1>Directory<sup>{members.length}</sup></h1>
            <div className="flex gap-2">
              <Button 
                onClick={() => handleViewModeChange("grid")}
                variant={viewMode === "grid" ? "primary" : "secondary"}
              >
                Grid
              </Button>
              <Button 
                onClick={() => handleViewModeChange("table")}
                variant={viewMode === "table" ? "primary" : "secondary"}
              >
                Table
              </Button>
            </div>
          </div>

          {/* Search and Filters */}
          <div className={styles.filterSection}>
            <div className={styles.filterBar}>
              <input
                type="text"
                placeholder="Search by name, program, or specialty..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className={styles.searchInput}
              />
              
              <div className={styles.filterButtons}>
                {(activeFilterCount > 0 || searchTerm) && (
                  <button onClick={clearFilters} className={styles.clearAllButton} title="Clear all filters">
                    ×
                  </button>
                )}
                
                {/* Class Filter */}
                <div className={styles.filterWrapper} ref={openPopover === "class" ? popoverRef : null}>
                  <button
                    className={`${styles.filterButton} ${selectedClasses.length > 0 ? styles.filterButtonActive : ""}`}
                    onClick={() => setOpenPopover(openPopover === "class" ? null : "class")}
                  >
                    Class {selectedClasses.length > 0 && `(${selectedClasses.length})`}
                    <span className={styles.filterArrow}>▼</span>
                  </button>
                  {openPopover === "class" && (
                    <div className={styles.popover}>
                      <div className={styles.popoverHeader}>
                        <span>Graduating Class</span>
                        {selectedClasses.length > 0 && (
                          <button 
                            onClick={() => setSelectedClasses([])}
                            className={styles.clearButton}
                          >
                            Clear
                          </button>
                        )}
                      </div>
                      <div className={styles.popoverContent}>
                        {classes.map((classYear) => (
                          <label key={classYear} className={styles.checkboxLabel}>
                            <input
                              type="checkbox"
                              checked={selectedClasses.includes(classYear)}
                              onChange={() => toggleFilter("class", classYear)}
                              className={styles.checkbox}
                            />
                            <span>{classYear}</span>
                            <span className={styles.count}>({getFilterCount("class", classYear)})</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Program Filter */}
                <div className={styles.filterWrapper} ref={openPopover === "program" ? popoverRef : null}>
                  <button
                    className={`${styles.filterButton} ${selectedPrograms.length > 0 ? styles.filterButtonActive : ""}`}
                    onClick={() => setOpenPopover(openPopover === "program" ? null : "program")}
                  >
                    Program {selectedPrograms.length > 0 && `(${selectedPrograms.length})`}
                    <span className={styles.filterArrow}>▼</span>
                  </button>
                  {openPopover === "program" && (
                    <div className={styles.popover}>
                      <div className={styles.popoverHeader}>
                        <span>Program</span>
                        {selectedPrograms.length > 0 && (
                          <button 
                            onClick={() => setSelectedPrograms([])}
                            className={styles.clearButton}
                          >
                            Clear
                          </button>
                        )}
                      </div>
                      <div className={styles.popoverContent}>
                        {programs.map((program) => (
                          <label key={program} className={styles.checkboxLabel}>
                            <input
                              type="checkbox"
                              checked={selectedPrograms.includes(program)}
                              onChange={() => toggleFilter("program", program)}
                              className={styles.checkbox}
                            />
                            <span>{program}</span>
                            <span className={styles.count}>({getFilterCount("program", program)})</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* School Filter */}
                <div className={styles.filterWrapper} ref={openPopover === "school" ? popoverRef : null}>
                  <button
                    className={`${styles.filterButton} ${selectedSchools.length > 0 ? styles.filterButtonActive : ""}`}
                    onClick={() => setOpenPopover(openPopover === "school" ? null : "school")}
                  >
                    School {selectedSchools.length > 0 && `(${selectedSchools.length})`}
                    <span className={styles.filterArrow}>▼</span>
                  </button>
                  {openPopover === "school" && (
                    <div className={styles.popover}>
                      <div className={styles.popoverHeader}>
                        <span>School</span>
                        {selectedSchools.length > 0 && (
                          <button
                            onClick={() => setSelectedSchools([])}
                            className={styles.clearButton}
                          >
                            Clear
                          </button>
                        )}
                      </div>
                      <div className={styles.popoverContent}>
                        {schools.map((school) => (
                          <label key={school} className={styles.checkboxLabel}>
                            <input
                              type="checkbox"
                              checked={selectedSchools.includes(school)}
                              onChange={() => toggleFilter("school", school)}
                              className={styles.checkbox}
                            />
                            <span>{school}</span>
                            <span className={styles.count}>({getFilterCount("school", school)})</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Specialties Filter */}
                <div className={styles.filterWrapper} ref={openPopover === "specialty" ? popoverRef : null}>
                  <button
                    className={`${styles.filterButton} ${selectedSpecialties.length > 0 ? styles.filterButtonActive : ""}`}
                    onClick={() => setOpenPopover(openPopover === "specialty" ? null : "specialty")}
                  >
                    Specialty {selectedSpecialties.length > 0 && `(${selectedSpecialties.length})`}
                    <span className={styles.filterArrow}>▼</span>
                  </button>
                  {openPopover === "specialty" && (
                    <div className={styles.popover}>
                      <div className={styles.popoverHeader}>
                        <span>Specialties</span>
                        {selectedSpecialties.length > 0 && (
                          <button
                            onClick={() => setSelectedSpecialties([])}
                            className={styles.clearButton}
                          >
                            Clear
                          </button>
                        )}
                      </div>
                      <div className={styles.popoverContent}>
                        {specialties.map((specialty) => (
                          <label key={specialty} className={styles.checkboxLabel}>
                            <input
                              type="checkbox"
                              checked={selectedSpecialties.includes(specialty)}
                              onChange={() => toggleFilter("specialty", specialty)}
                              className={styles.checkbox}
                            />
                            <span>{specialty}</span>
                            <span className={styles.count}>({getFilterCount("specialty", specialty)})</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Availability Filter */}
                <div className={styles.filterWrapper} ref={openPopover === "availability" ? popoverRef : null}>
                  <button
                    className={`${styles.filterButton} ${selectedAvailability.length > 0 ? styles.filterButtonActive : ""}`}
                    onClick={() => setOpenPopover(openPopover === "availability" ? null : "availability")}
                  >
                    Availability {selectedAvailability.length > 0 && `(${selectedAvailability.length})`}
                    <span className={styles.filterArrow}>▼</span>
                  </button>
                  {openPopover === "availability" && (
                    <div className={styles.popover}>
                      <div className={styles.popoverHeader}>
                        <span>Availability</span>
                        {selectedAvailability.length > 0 && (
                          <button
                            onClick={() => setSelectedAvailability([])}
                            className={styles.clearButton}
                          >
                            Clear
                          </button>
                        )}
                      </div>
                      <div className={styles.popoverContent}>
                        {availabilityTerms.map((termCode) => (
                          <label key={termCode} className={styles.checkboxLabel}>
                            <input
                              type="checkbox"
                              checked={selectedAvailability.includes(termCode)}
                              onChange={() => toggleFilter("availability", termCode)}
                              className={styles.checkbox}
                            />
                            <span>{decodeTermCode(termCode)}</span>
                            <span className={styles.count}>({getFilterCount("availability", termCode)})</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {(searchTerm || activeFilterCount > 0) && (
              <div className={styles.resultsCount}>
                Showing {filteredMembers.length} of {members.length} members
              </div>
            )}
          </div>
          
          {viewMode === "grid" ? (
            <div className="grid grid-cols-6 gap-[var(--gap)] w-full max-lg:grid-cols-4 mobile-grid-2">
              {sortedMembers.map((member) => (
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
              <div className={styles.tableHeader}>
                <div
                  className={styles.nameColumn}
                  onClick={() => handleSort("name")}
                  style={{ cursor: "pointer" }}
                >
                  Name {sortField === "name" && (sortDirection === "asc" ? "↑" : "↓")}
                </div>
                <div
                  className={styles.infoColumn}
                  onClick={() => handleSort("program")}
                  style={{ cursor: "pointer" }}
                >
                  Program {sortField === "program" && (sortDirection === "asc" ? "↑" : "↓")}
                </div>
                <div
                  className={styles.classColumn}
                  onClick={() => handleSort("class")}
                  style={{ cursor: "pointer" }}
                >
                  Class {sortField === "class" && (sortDirection === "asc" ? "↑" : "↓")}
                </div>
              </div>
              {sortedMembers.map((member) => (
                <div
                  key={member._id}
                  className={styles.tableRowWrapper}
                  onMouseEnter={() => setHoveredMemberId(member._id)}
                  onMouseLeave={() => setHoveredMemberId(null)}
                >
                  <Link
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
                  {hoveredMemberId === member._id && member.profileImage && (
                    <div className={styles.hoverPreview}>
                      <Image
                        src={urlFor(member.profileImage).width(300).height(375).url()}
                        alt={`${member.firstName} ${member.lastName}`}
                        width={300}
                        height={375}
                        className={styles.hoverImage}
                      />
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>
      </main>

      <Footer />
    </div>
  );
}

