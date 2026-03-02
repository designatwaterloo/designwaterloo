"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/auth/AuthProvider";
import { createClient } from "@/lib/supabase/client";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import ImageUpload from "@/components/ImageUpload";
import styles from "./page.module.css";

export default function EditProfilePage() {
  const { user, member, loading: authLoading, refreshMember } = useAuth();
  const router = useRouter();
  const supabase = createClient();

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Form state
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
  const [newSpecialty, setNewSpecialty] = useState("");
  const [profileImageUrl, setProfileImageUrl] = useState<string | null>(null);

  // Redirect if not authenticated
  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/sign-in");
    }
  }, [authLoading, user, router]);

  // Populate form with existing data
  useEffect(() => {
    if (member) {
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
    }
  }, [member]);

  const handleAddSpecialty = () => {
    if (newSpecialty.trim() && !specialties.includes(newSpecialty.trim())) {
      setSpecialties([...specialties, newSpecialty.trim()]);
      setNewSpecialty("");
    }
  };

  const handleRemoveSpecialty = (specialty: string) => {
    setSpecialties(specialties.filter((s) => s !== specialty));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!member) return;

    setSaving(true);
    setError(null);
    setSuccess(false);

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

    await refreshMember();
    setSuccess(true);
    setSaving(false);
  };

  if (authLoading) {
    return (
      <div>
        <Header />
        <main className="w-full min-h-[60vh] flex items-center justify-center">
          <p>Loading...</p>
        </main>
        <Footer />
      </div>
    );
  }

  if (!member) {
    return (
      <div>
        <Header />
        <main className="w-full min-h-[60vh] flex items-center justify-center">
          <p>No profile found. Please complete onboarding first.</p>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div>
      <Header />
      <main className="w-full">
        <section className="w-full px-(--margin) py-12 flex flex-col gap-8">
          <div className={styles.header}>
            <h1>Edit Profile</h1>
            <p className={styles.subtitle}>
              Update your profile information below.
            </p>
          </div>

          {error && <div className={styles.error}>{error}</div>}
          {success && (
            <div className={styles.success}>
              Profile updated successfully!{" "}
              <a href={`/directory/${member.slug}`}>View your profile</a>
            </div>
          )}

          <form onSubmit={handleSubmit} className={styles.form}>
            <div className={styles.section}>
              <h2 className={styles.sectionTitle}>Profile Photo</h2>
              <ImageUpload
                currentImageUrl={profileImageUrl}
                onImageUploaded={setProfileImageUrl}
              />
            </div>

            <div className={styles.section}>
              <h2 className={styles.sectionTitle}>Basic Info</h2>

              <div className={styles.fieldGroup}>
                <div className={styles.field}>
                  <label htmlFor="firstName">First Name *</label>
                  <input
                    id="firstName"
                    type="text"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    required
                  />
                </div>

                <div className={styles.field}>
                  <label htmlFor="lastName">Last Name *</label>
                  <input
                    id="lastName"
                    type="text"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className={styles.field}>
                <label>School</label>
                <input type="text" value={member.school || ""} disabled />
                <span className={styles.hint}>
                  School is determined by your email and cannot be changed.
                </span>
              </div>

              <div className={styles.fieldGroup}>
                <div className={styles.field}>
                  <label htmlFor="program">Program</label>
                  <input
                    id="program"
                    type="text"
                    value={program}
                    onChange={(e) => setProgram(e.target.value)}
                    placeholder="e.g., Systems Design Engineering"
                  />
                </div>

                <div className={styles.field}>
                  <label htmlFor="graduatingClass">Graduating Year</label>
                  <input
                    id="graduatingClass"
                    type="text"
                    value={graduatingClass}
                    onChange={(e) => setGraduatingClass(e.target.value)}
                    placeholder="e.g., 2026"
                  />
                </div>
              </div>
            </div>

            <div className={styles.section}>
              <h2 className={styles.sectionTitle}>About You</h2>

              <div className={styles.field}>
                <label htmlFor="bio">Bio</label>
                <textarea
                  id="bio"
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  placeholder="Tell us about yourself..."
                  rows={4}
                />
              </div>

              <div className={styles.field}>
                <label htmlFor="publicEmail">Public Email</label>
                <input
                  id="publicEmail"
                  type="email"
                  value={publicEmail}
                  onChange={(e) => setPublicEmail(e.target.value)}
                  placeholder="Email for employers to contact you"
                />
                <span className={styles.hint}>
                  This will be visible on your profile
                </span>
              </div>
            </div>

            <div className={styles.section}>
              <h2 className={styles.sectionTitle}>Social Links</h2>

              <div className={styles.fieldGroup}>
                <div className={styles.field}>
                  <label htmlFor="linkedin">LinkedIn</label>
                  <input
                    id="linkedin"
                    type="url"
                    value={linkedin}
                    onChange={(e) => setLinkedin(e.target.value)}
                    placeholder="https://linkedin.com/in/yourprofile"
                  />
                </div>

                <div className={styles.field}>
                  <label htmlFor="portfolio">Portfolio</label>
                  <input
                    id="portfolio"
                    type="url"
                    value={portfolio}
                    onChange={(e) => setPortfolio(e.target.value)}
                    placeholder="https://yourportfolio.com"
                  />
                </div>
              </div>

              <div className={styles.fieldGroup}>
                <div className={styles.field}>
                  <label htmlFor="instagram">Instagram</label>
                  <input
                    id="instagram"
                    type="text"
                    value={instagram}
                    onChange={(e) => setInstagram(e.target.value)}
                    placeholder="@yourusername or full URL"
                  />
                </div>

                <div className={styles.field}>
                  <label htmlFor="twitter">Twitter / X</label>
                  <input
                    id="twitter"
                    type="text"
                    value={twitter}
                    onChange={(e) => setTwitter(e.target.value)}
                    placeholder="@yourusername or full URL"
                  />
                </div>
              </div>

              <div className={styles.fieldGroup}>
                <div className={styles.field}>
                  <label htmlFor="github">GitHub</label>
                  <input
                    id="github"
                    type="text"
                    value={github}
                    onChange={(e) => setGithub(e.target.value)}
                    placeholder="yourusername or full URL"
                  />
                </div>

                <div className={styles.field}>
                  <label htmlFor="behance">Behance</label>
                  <input
                    id="behance"
                    type="text"
                    value={behance}
                    onChange={(e) => setBehance(e.target.value)}
                    placeholder="Full URL"
                  />
                </div>
              </div>

              <div className={styles.field}>
                <label htmlFor="dribbble">Dribbble</label>
                <input
                  id="dribbble"
                  type="text"
                  value={dribbble}
                  onChange={(e) => setDribbble(e.target.value)}
                  placeholder="Full URL"
                />
              </div>
            </div>

            <div className={styles.section}>
              <h2 className={styles.sectionTitle}>Specialties</h2>

              <div className={styles.field}>
                <label>Add Skills</label>
                <div className={styles.specialtiesInput}>
                  <input
                    type="text"
                    value={newSpecialty}
                    onChange={(e) => setNewSpecialty(e.target.value)}
                    placeholder="Add a skill (e.g., UI Design)"
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        handleAddSpecialty();
                      }
                    }}
                  />
                  <button
                    type="button"
                    onClick={handleAddSpecialty}
                    className={styles.addButton}
                  >
                    Add
                  </button>
                </div>
                {specialties.length > 0 && (
                  <div className={styles.specialties}>
                    {specialties.map((s) => (
                      <span key={s} className={styles.specialty}>
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

            <div className={styles.actions}>
              <a
                href={`/directory/${member.slug}`}
                className={styles.secondaryButton}
              >
                Cancel
              </a>
              <button
                type="submit"
                className={styles.primaryButton}
                disabled={saving || !firstName || !lastName}
              >
                {saving ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </form>
        </section>
      </main>
      <Footer />
    </div>
  );
}
