"use client";

import { useState, useMemo, useEffect, useRef } from "react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import Image from "next/image";
import Button from "@/components/Button";
import { Member } from "@/sanity/types";
import Link from "@/components/Link";
import { urlFor, getBlurDataURL } from "@/sanity/lib/image";
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
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isFilterPanelVisible, setIsFilterPanelVisible] = useState(false);
  const [openAccordions, setOpenAccordions] = useState<Set<string>>(new Set());
  const [isDesktop, setIsDesktop] = useState(true); // Default to desktop for SSR

  // Detect if we're on desktop
  useEffect(() => {
    const checkDesktop = () => {
      setIsDesktop(window.innerWidth > 768);
    };
    
    checkDesktop();
    window.addEventListener('resize', checkDesktop);
    
    return () => window.removeEventListener('resize', checkDesktop);
  }, []);

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

  const toggleAccordion = (key: string) => {
    setOpenAccordions(prev => {
      const newSet = new Set(prev);
      if (newSet.has(key)) {
        newSet.delete(key);
      } else {
        newSet.add(key);
      }
      return newSet;
    });
  };

  const activeFilterCount = selectedClasses.length + selectedPrograms.length + selectedSchools.length + selectedSpecialties.length + selectedAvailability.length;
  const hasActiveFilters = searchTerm !== "" || activeFilterCount > 0;

  // Track if component is mounted (client-side only)
  const [isMounted, setIsMounted] = useState(false);
  const [randomOrder, setRandomOrder] = useState<Map<string, number>>(new Map());

  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Initialize or restore random order
  useEffect(() => {
    if (!isMounted || members.length === 0) return;

    // Check if navigating back from a member page
    const isNavigatingBack = sessionStorage.getItem('directoryNavigated') === 'true';
    const storedOrder = sessionStorage.getItem('directoryOrder');
    
    if (isNavigatingBack && storedOrder) {
      try {
        const orderArray = JSON.parse(storedOrder);
        const order = new Map<string, number>(orderArray);
        
        // Verify all current members are in stored order
        const allMembersPresent = members.every(m => order.has(m._id));
        
        if (allMembersPresent) {
          setRandomOrder(order);
          sessionStorage.removeItem('directoryNavigated'); // Clear flag
          return;
        }
      } catch {
        // Invalid stored data, will regenerate below
      }
    }
    
    // Generate new random order (first load or browser refresh)
    const order = new Map<string, number>();
    const shuffled = [...members].sort(() => Math.random() - 0.5);
    shuffled.forEach((member, index) => {
      order.set(member._id, index);
    });
    
    // Save to sessionStorage for potential navigation back
    sessionStorage.setItem('directoryOrder', JSON.stringify(Array.from(order.entries())));
    setRandomOrder(order);
  }, [members, isMounted]);

  // Handler for when user clicks on a member
  const handleMemberClick = () => {
    sessionStorage.setItem('directoryNavigated', 'true');
  };

  // Sort members
  const sortedMembers = useMemo(() => {
    const sorted = [...filteredMembers];

    // If no filters are active, no explicit sort selected, and we're mounted, use random order
    const isDefaultSort = sortField === "memberId" && sortDirection === "asc";
    if (!hasActiveFilters && isDefaultSort && isMounted && randomOrder.size > 0) {
      sorted.sort((a, b) => {
        const orderA = randomOrder.get(a._id) ?? 0;
        const orderB = randomOrder.get(b._id) ?? 0;
        return orderA - orderB;
      });
      return sorted;
    }

    // Otherwise use normal sorting
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
  }, [filteredMembers, sortField, sortDirection, hasActiveFilters, isMounted, randomOrder]);

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
            <div className="hidden sm:flex gap-1">
              <Button
                onClick={() => handleViewModeChange("grid")}
                variant="icon"
                icon="/Grid.svg"
                iconAlt="Grid view"
                active={viewMode === "grid"}
              />
              <Button
                onClick={() => handleViewModeChange("table")}
                variant="icon"
                icon="/List.svg"
                iconAlt="Table view"
                active={viewMode === "table"}
              />
            </div>
          </div>

          {/* Mobile Only: Sidebar Filter Panel */}
          <div className={`${styles.filterSidebarMobile} ${isSidebarOpen ? styles.sidebarOpen : ''}`}>
            <div className={styles.sidebarHeader}>
              <h2>Filters</h2>
              <button 
                onClick={() => setIsSidebarOpen(false)}
                className={styles.closeSidebarButton}
                aria-label="Close filters"
              >
                ×
              </button>
            </div>

            <div className={styles.sidebarContent}>
              {/* Clear All Button */}
              {(activeFilterCount > 0 || searchTerm) && (
                <button onClick={clearFilters} className={styles.sidebarClearAll}>
                  Clear all filters
                </button>
              )}

              {/* Class Filter */}
              <div className={styles.filterAccordion}>
                <button 
                  className={styles.accordionHeader}
                  onClick={() => toggleAccordion("class")}
                >
                  <span className={styles.accordionTitle}>
                    Graduating Class
                    {selectedClasses.length > 0 && ` (${selectedClasses.length})`}
                  </span>
                  <svg 
                    className={`${styles.accordionArrow} ${openAccordions.has("class") ? styles.accordionArrowOpen : ''}`} 
                    width="12" 
                    height="12" 
                    viewBox="0 0 12 12" 
                    fill="none"
                  >
                    <path d="M3 4.5L6 7.5L9 4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </button>
                {openAccordions.has("class") && (
                  <div className={styles.accordionContent}>
                    {selectedClasses.length > 0 && (
                      <button 
                        onClick={() => setSelectedClasses([])}
                        className={styles.sidebarClearButton}
                      >
                        Clear
                      </button>
                    )}
                    <div className={styles.sidebarOptions}>
                      {classes.map((classYear) => (
                        <label key={classYear} className={styles.sidebarCheckboxLabel}>
                <input
                            type="checkbox"
                            checked={selectedClasses.includes(classYear)}
                            onChange={() => toggleFilter("class", classYear)}
                            className={styles.sidebarCheckbox}
                          />
                          <span>{classYear}</span>
                          <span className={styles.sidebarCount}>({getFilterCount("class", classYear)})</span>
                        </label>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Program Filter */}
              <div className={styles.filterAccordion}>
                <button 
                  className={styles.accordionHeader}
                  onClick={() => toggleAccordion("program")}
                >
                  <span className={styles.accordionTitle}>
                    Program
                    {selectedPrograms.length > 0 && ` (${selectedPrograms.length})`}
                  </span>
                  <svg 
                    className={`${styles.accordionArrow} ${openAccordions.has("program") ? styles.accordionArrowOpen : ''}`} 
                    width="12" 
                    height="12" 
                    viewBox="0 0 12 12" 
                    fill="none"
                  >
                    <path d="M3 4.5L6 7.5L9 4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </button>
                {openAccordions.has("program") && (
                  <div className={styles.accordionContent}>
                    {selectedPrograms.length > 0 && (
                      <button 
                        onClick={() => setSelectedPrograms([])}
                        className={styles.sidebarClearButton}
                      >
                        Clear
                      </button>
                    )}
                    <div className={styles.sidebarOptions}>
                      {programs.map((program) => (
                        <label key={program} className={styles.sidebarCheckboxLabel}>
                          <input
                            type="checkbox"
                            checked={selectedPrograms.includes(program)}
                            onChange={() => toggleFilter("program", program)}
                            className={styles.sidebarCheckbox}
                          />
                          <span>{program}</span>
                          <span className={styles.sidebarCount}>({getFilterCount("program", program)})</span>
                        </label>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* School Filter */}
              <div className={styles.filterAccordion}>
                <button 
                  className={styles.accordionHeader}
                  onClick={() => toggleAccordion("school")}
                >
                  <span className={styles.accordionTitle}>
                    School
                    {selectedSchools.length > 0 && ` (${selectedSchools.length})`}
                  </span>
                  <svg 
                    className={`${styles.accordionArrow} ${openAccordions.has("school") ? styles.accordionArrowOpen : ''}`} 
                    width="12" 
                    height="12" 
                    viewBox="0 0 12 12" 
                    fill="none"
                  >
                    <path d="M3 4.5L6 7.5L9 4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </button>
                {openAccordions.has("school") && (
                  <div className={styles.accordionContent}>
                    {selectedSchools.length > 0 && (
                      <button
                        onClick={() => setSelectedSchools([])}
                        className={styles.sidebarClearButton}
                      >
                        Clear
                      </button>
                    )}
                    <div className={styles.sidebarOptions}>
                      {schools.map((school) => (
                        <label key={school} className={styles.sidebarCheckboxLabel}>
                          <input
                            type="checkbox"
                            checked={selectedSchools.includes(school)}
                            onChange={() => toggleFilter("school", school)}
                            className={styles.sidebarCheckbox}
                          />
                          <span>{school}</span>
                          <span className={styles.sidebarCount}>({getFilterCount("school", school)})</span>
                        </label>
                      ))}
                </div>
                  </div>
                )}
              </div>
              
              {/* Specialties Filter */}
              <div className={styles.filterAccordion}>
                <button 
                  className={styles.accordionHeader}
                  onClick={() => toggleAccordion("specialty")}
                >
                  <span className={styles.accordionTitle}>
                    Specialties
                    {selectedSpecialties.length > 0 && ` (${selectedSpecialties.length})`}
                  </span>
                  <svg 
                    className={`${styles.accordionArrow} ${openAccordions.has("specialty") ? styles.accordionArrowOpen : ''}`} 
                    width="12" 
                    height="12" 
                    viewBox="0 0 12 12" 
                    fill="none"
                  >
                    <path d="M3 4.5L6 7.5L9 4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </button>
                {openAccordions.has("specialty") && (
                  <div className={styles.accordionContent}>
                    {selectedSpecialties.length > 0 && (
                      <button
                        onClick={() => setSelectedSpecialties([])}
                        className={styles.sidebarClearButton}
                      >
                        Clear
                      </button>
                    )}
                    <div className={styles.sidebarOptions}>
                      {specialties.map((specialty) => (
                        <label key={specialty} className={styles.sidebarCheckboxLabel}>
                          <input
                            type="checkbox"
                            checked={selectedSpecialties.includes(specialty)}
                            onChange={() => toggleFilter("specialty", specialty)}
                            className={styles.sidebarCheckbox}
                          />
                          <span>{specialty}</span>
                          <span className={styles.sidebarCount}>({getFilterCount("specialty", specialty)})</span>
                        </label>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Availability Filter */}
              <div className={styles.filterAccordion}>
                <button 
                  className={styles.accordionHeader}
                  onClick={() => toggleAccordion("availability")}
                >
                  <span className={styles.accordionTitle}>
                    Availability
                    {selectedAvailability.length > 0 && ` (${selectedAvailability.length})`}
                  </span>
                  <svg 
                    className={`${styles.accordionArrow} ${openAccordions.has("availability") ? styles.accordionArrowOpen : ''}`} 
                    width="12" 
                    height="12" 
                    viewBox="0 0 12 12" 
                    fill="none"
                  >
                    <path d="M3 4.5L6 7.5L9 4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </button>
                {openAccordions.has("availability") && (
                  <div className={styles.accordionContent}>
                    {selectedAvailability.length > 0 && (
                      <button
                        onClick={() => setSelectedAvailability([])}
                        className={styles.sidebarClearButton}
                      >
                        Clear
                      </button>
                    )}
                    <div className={styles.sidebarOptions}>
                      {availabilityTerms.map((termCode) => (
                        <label key={termCode} className={styles.sidebarCheckboxLabel}>
                          <input
                            type="checkbox"
                            checked={selectedAvailability.includes(termCode)}
                            onChange={() => toggleFilter("availability", termCode)}
                            className={styles.sidebarCheckbox}
                          />
                          <span>{decodeTermCode(termCode)}</span>
                          <span className={styles.sidebarCount}>({getFilterCount("availability", termCode)})</span>
                        </label>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Overlay for mobile */}
          {isSidebarOpen && (
            <div 
              className={styles.sidebarOverlay}
              onClick={() => setIsSidebarOpen(false)}
            />
          )}

          {/* Desktop Layout: Filters + Content */}
          <div className={styles.directoryLayout}>
            {/* Desktop Filter Panel */}
            {isMounted && isDesktop && isFilterPanelVisible && (
              <aside className={styles.filterPanelDesktop}>
              <div className={styles.filterPanelSticky}>
                {/* Clear All Button */}
                  {(activeFilterCount > 0 || searchTerm) && (
                  <button onClick={clearFilters} className={styles.sidebarClearAll}>
                    Clear all filters
                  </button>
                )}
                
                {/* Class Filter */}
                <div className={styles.filterAccordion}>
                  <button
                    className={styles.accordionHeader}
                    onClick={() => toggleAccordion("class")}
                  >
                    <span className={styles.accordionTitle}>
                      Graduating Class
                      {selectedClasses.length > 0 && ` (${selectedClasses.length})`}
                    </span>
                    <span className={`${styles.accordionArrow} ${openAccordions.has("class") ? styles.accordionArrowOpen : ''}`}>
                      ▼
                    </span>
                  </button>
                  {openAccordions.has("class") && (
                    <div className={styles.accordionContent}>
                        {selectedClasses.length > 0 && (
                          <button 
                            onClick={() => setSelectedClasses([])}
                          className={styles.sidebarClearButton}
                          >
                            Clear
                          </button>
                        )}
                      <div className={styles.sidebarOptions}>
                        {classes.map((classYear) => (
                          <label key={classYear} className={styles.sidebarCheckboxLabel}>
                            <input
                              type="checkbox"
                              checked={selectedClasses.includes(classYear)}
                              onChange={() => toggleFilter("class", classYear)}
                              className={styles.sidebarCheckbox}
                            />
                            <span>{classYear}</span>
                            <span className={styles.sidebarCount}>({getFilterCount("class", classYear)})</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Program Filter */}
                <div className={styles.filterAccordion}>
                  <button
                    className={styles.accordionHeader}
                    onClick={() => toggleAccordion("program")}
                  >
                    <span className={styles.accordionTitle}>
                      Program
                      {selectedPrograms.length > 0 && ` (${selectedPrograms.length})`}
                    </span>
                    <span className={`${styles.accordionArrow} ${openAccordions.has("program") ? styles.accordionArrowOpen : ''}`}>
                      ▼
                    </span>
                  </button>
                  {openAccordions.has("program") && (
                    <div className={styles.accordionContent}>
                        {selectedPrograms.length > 0 && (
                          <button 
                            onClick={() => setSelectedPrograms([])}
                          className={styles.sidebarClearButton}
                          >
                            Clear
                          </button>
                        )}
                      <div className={styles.sidebarOptions}>
                        {programs.map((program) => (
                          <label key={program} className={styles.sidebarCheckboxLabel}>
                            <input
                              type="checkbox"
                              checked={selectedPrograms.includes(program)}
                              onChange={() => toggleFilter("program", program)}
                              className={styles.sidebarCheckbox}
                            />
                            <span>{program}</span>
                            <span className={styles.sidebarCount}>({getFilterCount("program", program)})</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* School Filter */}
                <div className={styles.filterAccordion}>
                  <button
                    className={styles.accordionHeader}
                    onClick={() => toggleAccordion("school")}
                  >
                    <span className={styles.accordionTitle}>
                      School
                      {selectedSchools.length > 0 && ` (${selectedSchools.length})`}
                    </span>
                    <span className={`${styles.accordionArrow} ${openAccordions.has("school") ? styles.accordionArrowOpen : ''}`}>
                      ▼
                    </span>
                  </button>
                  {openAccordions.has("school") && (
                    <div className={styles.accordionContent}>
                        {selectedSchools.length > 0 && (
                          <button
                            onClick={() => setSelectedSchools([])}
                          className={styles.sidebarClearButton}
                          >
                            Clear
                          </button>
                        )}
                      <div className={styles.sidebarOptions}>
                        {schools.map((school) => (
                          <label key={school} className={styles.sidebarCheckboxLabel}>
                            <input
                              type="checkbox"
                              checked={selectedSchools.includes(school)}
                              onChange={() => toggleFilter("school", school)}
                              className={styles.sidebarCheckbox}
                            />
                            <span>{school}</span>
                            <span className={styles.sidebarCount}>({getFilterCount("school", school)})</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Specialties Filter */}
                <div className={styles.filterAccordion}>
                  <button
                    className={styles.accordionHeader}
                    onClick={() => toggleAccordion("specialty")}
                  >
                    <span className={styles.accordionTitle}>
                      Specialties
                      {selectedSpecialties.length > 0 && ` (${selectedSpecialties.length})`}
                    </span>
                    <span className={`${styles.accordionArrow} ${openAccordions.has("specialty") ? styles.accordionArrowOpen : ''}`}>
                      ▼
                    </span>
                  </button>
                  {openAccordions.has("specialty") && (
                    <div className={styles.accordionContent}>
                        {selectedSpecialties.length > 0 && (
                          <button
                            onClick={() => setSelectedSpecialties([])}
                          className={styles.sidebarClearButton}
                          >
                            Clear
                          </button>
                        )}
                      <div className={styles.sidebarOptions}>
                        {specialties.map((specialty) => (
                          <label key={specialty} className={styles.sidebarCheckboxLabel}>
                            <input
                              type="checkbox"
                              checked={selectedSpecialties.includes(specialty)}
                              onChange={() => toggleFilter("specialty", specialty)}
                              className={styles.sidebarCheckbox}
                            />
                            <span>{specialty}</span>
                            <span className={styles.sidebarCount}>({getFilterCount("specialty", specialty)})</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Availability Filter */}
                <div className={styles.filterAccordion}>
                  <button
                    className={styles.accordionHeader}
                    onClick={() => toggleAccordion("availability")}
                  >
                    <span className={styles.accordionTitle}>
                      Availability
                      {selectedAvailability.length > 0 && ` (${selectedAvailability.length})`}
                    </span>
                    <span className={`${styles.accordionArrow} ${openAccordions.has("availability") ? styles.accordionArrowOpen : ''}`}>
                      ▼
                    </span>
                  </button>
                  {openAccordions.has("availability") && (
                    <div className={styles.accordionContent}>
                        {selectedAvailability.length > 0 && (
                          <button
                            onClick={() => setSelectedAvailability([])}
                          className={styles.sidebarClearButton}
                          >
                            Clear
                          </button>
                        )}
                      <div className={styles.sidebarOptions}>
                        {availabilityTerms.map((termCode) => (
                          <label key={termCode} className={styles.sidebarCheckboxLabel}>
                            <input
                              type="checkbox"
                              checked={selectedAvailability.includes(termCode)}
                              onChange={() => toggleFilter("availability", termCode)}
                              className={styles.sidebarCheckbox}
                            />
                            <span>{decodeTermCode(termCode)}</span>
                            <span className={styles.sidebarCount}>({getFilterCount("availability", termCode)})</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
                </div>
            </aside>
            )}

            {/* Main Content */}
            <div className={styles.mainContent}>
              {/* Search Bar */}
              <div className={styles.searchSection}>
            <input
              type="text"
              placeholder="Search by name, program, or specialty..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className={styles.searchInput}
            />
            <div className={styles.filterButtonWrapper}>
              <Button 
                onClick={() => {
                  if (isDesktop) {
                    setIsFilterPanelVisible(!isFilterPanelVisible);
                  } else {
                    setIsSidebarOpen(!isSidebarOpen);
                  }
                }}
                variant="secondary"
              >
                Filters {activeFilterCount > 0 && `(${activeFilterCount})`}
              </Button>
              </div>
            </div>

          {/* Results count and view toggle for mobile */}
          <div className={styles.mobileControls}>
            <div className={styles.viewToggleMobile}>
              <Button 
                onClick={() => handleViewModeChange("grid")}
                variant="icon"
                icon="/Grid.svg"
                iconAlt="Grid view"
                active={viewMode === "grid"}
              />
              <Button 
                onClick={() => handleViewModeChange("table")}
                variant="icon"
                icon="/List.svg"
                iconAlt="Table view"
                active={viewMode === "table"}
              />
            </div>
            {(searchTerm || activeFilterCount > 0) && (
              <div className={styles.resultsCount}>
                Showing {filteredMembers.length} of {members.length} members
              </div>
            )}
          </div>
          
          {viewMode === "grid" ? (
            <div className={styles.membersGrid}>
              {sortedMembers.map((member) => (
                <Link
                  key={member._id}
                  href={`/directory/${member.slug.current}`}
                  className="flex flex-col gap-4 group"
                  underline={false}
                  onClick={handleMemberClick}
                >
                  {member.profileImage ? (
                    <Image
                      src={urlFor(member.profileImage).width(400).height(500).url()}
                      alt={`${member.firstName} ${member.lastName}`}
                      width={400}
                      height={400}
                      className="aspect-[4/5] w-full object-cover rounded grayscale group-hover:grayscale-0 transition-all duration-300"
                      placeholder={getBlurDataURL(member.profileImage) ? "blur" : "empty"}
                      blurDataURL={getBlurDataURL(member.profileImage)}
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
                    onClick={handleMemberClick}
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
                        placeholder={getBlurDataURL(member.profileImage) ? "blur" : "empty"}
                        blurDataURL={getBlurDataURL(member.profileImage)}
                      />
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}

