"use client";

import { useEffect, useState } from "react";
import { useLenis } from "lenis/react";
import { useAuth } from "@/components/auth/AuthProvider";
import { createClient } from "@/lib/supabase/client";
import ImageUpload from "@/components/ImageUpload";
import directoryStyles from "./page.module.css";
import editStyles from "@/app/profile/edit/page.module.css";

const ALL_SPECIALTIES = [
  "UI design",
  "UX design",
  "Product design",
  "Interaction design",
  "Visual design",
  "Design systems",
  "Prototyping",
  "UX research",
  "Content design",
  "Brand design",
  "Motion design",
  "Information architecture",
  "Service design",
];

interface EditProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function EditProfileModal({ isOpen, onClose }: EditProfileModalProps) {
  const { user, member, refreshMember } = useAuth();
  const supabase = createClient();
  const lenis = useLenis();

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [program, setProgram] = useState("");
  const [graduatingClass, setGraduatingClass] = useState("");
  const [bio, setBio] = useState("");
  const [publicEmail, setPublicEmail] = useState("");
  const [linkedin, setLinkedin] = useState("");
  const [portfolio, setPortfolio] = useState("");
  const [instagram, setInstagram] = useState("");
  const [twitter, setTwitter] = useState("");
  const [github, setGithub] = useState("");
  const [behance, setBehance] = useState("");
  const [dribbble, setDribbble] = useState("");
  const [specialties, setSpecialties] = useState<string[]>([]);
  const [profileImageUrl, setProfileImageUrl] = useState<string | null>(null);
  const [isSpecialtyDropdownOpen, setIsSpecialtyDropdownOpen] = useState(false);

  // Stop Lenis smooth scroll while modal is open
  useEffect(() => {
    if (!isOpen || !lenis) return;
    lenis.stop();
    return () => {
      lenis.start();
    };
  }, [isOpen, lenis]);

  // Populate form with existing data when modal opens
  useEffect(() => {
    if (!isOpen || !member) return;
    setFirstName(member.first_name || "");
    setLastName(member.last_name || "");
    setProgram(member.program || "");
    setGraduatingClass(member.graduating_class || "");
    setBio(member.bio || "");
    setPublicEmail(member.public_email || "");
    setLinkedin(member.linkedin || "");
    setPortfolio(member.portfolio || "");
    setInstagram(member.instagram || "");
    setTwitter(member.twitter || "");
    setGithub(member.github || "");
    setBehance(member.behance || "");
    setDribbble(member.dribbble || "");
    setSpecialties(member.specialties || []);
    setProfileImageUrl(member.profile_image_url || null);
    setError(null);
    setSaving(false);
  }, [isOpen, member]);

  const toggleSpecialty = (specialty: string) => {
    setSpecialties((prev) => {
      const isSelected = prev.includes(specialty);
      if (isSelected) {
        return prev.filter((s) => s !== specialty);
      }
      if (prev.length >= 5) {
        return prev;
      }
      return [...prev, specialty];
    });
  };

  const handleRemoveSpecialty = (specialty: string) => {
    setSpecialties(specialties.filter((s) => s !== specialty));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!member || !user) return;

    setSaving(true);
    setError(null);

    const { error: updateError } = await supabase
      .from("members")
      .update({
        first_name: firstName,
        last_name: lastName,
        program: program || null,
        graduating_class: graduatingClass || null,
        bio: bio || null,
        public_email: publicEmail || null,
        linkedin: linkedin || null,
        portfolio: portfolio || null,
        instagram: instagram || null,
        twitter: twitter || null,
        github: github || null,
        behance: behance || null,
        dribbble: dribbble || null,
        specialties: specialties,
        profile_image_url: profileImageUrl,
      } as never)
      .eq("id", member.id);

  if (updateError) {
      setError(`Failed to update profile: ${updateError.message}`);
      setSaving(false);
      return;
    }

    try {
      await fetch("/api/revalidate-profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug: member.slug }),
      });
    } catch {
      // Ignore revalidation failures
    }

    await refreshMember();
    setSaving(false);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className={directoryStyles.profileEditOverlay} role="dialog" aria-modal="true">
      <div className={directoryStyles.profileEditModal} data-lenis-prevent>
        <div className={directoryStyles.profileEditHeader}>
          <h2 className={directoryStyles.profileEditTitle}>Edit Profile</h2>
          <button
            type="button"
            className={directoryStyles.profileEditCloseButton}
            onClick={onClose}
            aria-label="Close"
          >
            ×
          </button>
        </div>

        {error && <div className={editStyles.error}>{error}</div>}

        <form onSubmit={handleSubmit} className={editStyles.form}>
          <div className={editStyles.section}>
            <h2 className={editStyles.sectionTitle}>Profile Photo</h2>
            <ImageUpload
              currentImageUrl={profileImageUrl}
              onImageUploaded={setProfileImageUrl}
            />
          </div>

          <div className={editStyles.section}>
            <h2 className={editStyles.sectionTitle}>Basic Info</h2>

            <div className={editStyles.fieldGroup}>
              <div className={editStyles.field}>
                <label htmlFor="firstName-modal">First Name *</label>
                <input
                  id="firstName-modal"
                  type="text"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  required
                />
              </div>

              <div className={editStyles.field}>
                <label htmlFor="lastName-modal">Last Name *</label>
                <input
                  id="lastName-modal"
                  type="text"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className={editStyles.field}>
              <label>School</label>
              <input type="text" value={member?.school || ""} disabled />
              <span className={editStyles.hint}>
                School is determined by your email and cannot be changed.
              </span>
            </div>

            <div className={editStyles.fieldGroup}>
              <div className={editStyles.field}>
                <label htmlFor="program-modal">Program</label>
                <input
                  id="program-modal"
                  type="text"
                  value={program}
                  onChange={(e) => setProgram(e.target.value)}
                  placeholder="e.g., Systems Design Engineering"
                />
              </div>

              <div className={editStyles.field}>
                <label htmlFor="graduatingClass-modal">Graduating Year</label>
                <input
                  id="graduatingClass-modal"
                  type="text"
                  value={graduatingClass}
                  onChange={(e) => setGraduatingClass(e.target.value)}
                  placeholder="e.g., 2026"
                />
              </div>
            </div>
          </div>

          <div className={editStyles.section}>
            <h2 className={editStyles.sectionTitle}>About You</h2>

            <div className={editStyles.field}>
              <label htmlFor="bio-modal">Bio</label>
              <textarea
                id="bio-modal"
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                placeholder="Tell us about yourself..."
                rows={4}
              />
            </div>

            <div className={editStyles.field}>
              <label htmlFor="publicEmail-modal">Public Email</label>
              <input
                id="publicEmail-modal"
                type="email"
                value={publicEmail}
                onChange={(e) => setPublicEmail(e.target.value)}
                placeholder="Email for employers to contact you"
              />
              <span className={editStyles.hint}>
                This will be visible on your profile
              </span>
            </div>
          </div>

          <div className={editStyles.section}>
            <h2 className={editStyles.sectionTitle}>Social Links</h2>

            <div className={editStyles.fieldGroup}>
              <div className={editStyles.field}>
                <label htmlFor="linkedin-modal">LinkedIn</label>
                <input
                  id="linkedin-modal"
                  type="url"
                  value={linkedin}
                  onChange={(e) => setLinkedin(e.target.value)}
                  placeholder="https://linkedin.com/in/yourprofile"
                />
              </div>

              <div className={editStyles.field}>
                <label htmlFor="portfolio-modal">Portfolio</label>
                <input
                  id="portfolio-modal"
                  type="url"
                  value={portfolio}
                  onChange={(e) => setPortfolio(e.target.value)}
                  placeholder="https://yourportfolio.com"
                />
              </div>
            </div>

            <div className={editStyles.fieldGroup}>
              <div className={editStyles.field}>
                <label htmlFor="instagram-modal">Instagram</label>
                <input
                  id="instagram-modal"
                  type="text"
                  value={instagram}
                  onChange={(e) => setInstagramValue(e.target.value)}
                  placeholder="@yourusername or full URL"
                />
              </div>

              <div className={editStyles.field}>
                <label htmlFor="twitter-modal">Twitter / X</label>
                <input
                  id="twitter-modal"
                  type="text"
                  value={twitter}
                  onChange={(e) => setTwitter(e.target.value)}
                  placeholder="@yourusername or full URL"
                />
              </div>
            </div>

            <div className={editStyles.fieldGroup}>
              <div className={editStyles.field}>
                <label htmlFor="github-modal">GitHub</label>
                <input
                  id="github-modal"
                  type="text"
                  value={github}
                  onChange={(e) => setGithub(e.target.value)}
                  placeholder="yourusername or full URL"
                />
              </div>

              <div className={editStyles.field}>
                <label htmlFor="behance-modal">Behance</label>
                <input
                  id="behance-modal"
                  type="text"
                  value={behance}
                  onChange={(e) => setBehance(e.target.value)}
                  placeholder="Full URL"
                />
              </div>
            </div>

            <div className={editStyles.field}>
              <label htmlFor="dribbble-modal">Dribbble</label>
              <input
                id="dribbble-modal"
                type="text"
                value={dribbble}
                onChange={(e) => setDribbble(e.target.value)}
                placeholder="Full URL"
              />
            </div>
          </div>

          <div className={editStyles.section}>
            <h2 className={editStyles.sectionTitle}>Specialties</h2>

            <div className={editStyles.field}>
              <label>Specializations</label>
              <div className={editStyles.specialtiesDropdown}>
                <button
                  type="button"
                  className={editStyles.specialtiesDropdownTrigger}
                  onClick={() => setIsSpecialtyDropdownOpen((open) => !open)}
                >
                  <span>
                    {specialties.length === 0
                      ? "Select up to five specializations"
                      : `${specialties.length} selected`}
                  </span>
                  <span
                    className={`${editStyles.specialtyDropdownCaret} ${
                      isSpecialtyDropdownOpen ? editStyles.specialtyDropdownCaretOpen : ""
                    }`}
                  >
                    ▾
                  </span>
                </button>
                {isSpecialtyDropdownOpen && (
                  <div className={editStyles.specialtiesDropdownMenu}>
                    {ALL_SPECIALTIES.map((specialty) => {
                      const isSelected = specialties.includes(specialty);
                      return (
                        <button
                          key={specialty}
                          type="button"
                          className={editStyles.specialtiesDropdownItem}
                          onClick={() => toggleSpecialty(specialty)}
                        >
                          <span className={editStyles.specialtiesDropdownLabel}>
                            {specialty}
                          </span>
                          <span
                            className={`${editStyles.specialtyCheckbox} ${
                              isSelected ? editStyles.specialtyCheckboxChecked : ""
                            }`}
                          >
                            {isSelected && (
                              <span className={editStyles.specialtyCheckboxIcon}>✓</span>
                            )}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
              <span className={editStyles.hint}>Select up to five specializations.</span>
              {specialties.length > 0 && (
                <div className={editStyles.specialties}>
                  {specialties.map((s) => (
                    <span key={s} className={editStyles.specialty}>
                      {s}
                      <button
                        type="button"
                        onClick={() => handleRemoveSpecialty(s)}
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className={editStyles.actions}>
            <button
              type="button"
              className={editStyles.secondaryButton}
              onClick={onClose}
            >
              Cancel
            </button>
            <button
              type="submit"
              className={editStyles.primaryButton}
              disabled={saving || !firstName || !lastName}
            >
              {saving ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

