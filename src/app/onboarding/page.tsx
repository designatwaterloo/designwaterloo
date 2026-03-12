"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/components/auth/AuthProvider";
import { useTransition } from "@/context/TransitionContext";
import { createClient } from "@/lib/supabase/client";
import { getSchoolFromEmail, generateSlug } from "@/lib/supabase/auth-utils";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import ImageUpload from "@/components/ImageUpload";
import styles from "./page.module.css";

export default function OnboardingPage() {
  const { user, loading: authLoading, refreshMember } = useAuth();
  const { startTransition } = useTransition();
  const supabase = createClient();

  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
  const [github, setGithub] = useState("");
  const [specialties, setSpecialties] = useState<string[]>([]);
  const [newSpecialty, setNewSpecialty] = useState("");
  const [profileImageUrl, setProfileImageUrl] = useState<string | null>(null);

  // Redirect if not authenticated
  useEffect(() => {
    if (!authLoading && !user) {
      startTransition("/sign-in");
    }
  }, [authLoading, user, startTransition]);

  const school = user?.email ? getSchoolFromEmail(user.email) : null;

  const handleAddSpecialty = () => {
    if (newSpecialty.trim() && !specialties.includes(newSpecialty.trim())) {
      setSpecialties([...specialties, newSpecialty.trim()]);
      setNewSpecialty("");
    }
  };

  const handleRemoveSpecialty = (specialty: string) => {
    setSpecialties(specialties.filter((s) => s !== specialty));
  };

  const handleSubmit = async () => {
    if (!user?.email) return;

    setSaving(true);
    setError(null);

    try {
      const slug = generateSlug(firstName, lastName);

      // Check if slug already exists
      const { data: existingSlug } = await supabase
        .from("members")
        .select("slug")
        .eq("slug", slug)
        .single();

      const finalSlug = existingSlug
        ? `${slug}-${Date.now().toString(36)}`
        : slug;

      const { data: insertData, error: insertError } = await supabase
        .from("members")
        .insert({
          auth_user_id: user.id,
          first_name: firstName,
          last_name: lastName,
          slug: finalSlug,
          school_email: user.email,
          school: school,
          program: program || null,
          graduating_class: graduatingClass || null,
          bio: bio || null,
          public_email: publicEmail || null,
          linkedin: linkedin || null,
          portfolio: portfolio || null,
          instagram: instagram || null,
          github: github || null,
          specialties: specialties,
          profile_image_url: profileImageUrl,
          onboarding_completed: true,
          is_approved: false,
        } as never)
        .select()
        .single();

      if (insertError) {
        console.error("Insert error:", insertError);
        setError(`Failed to create profile: ${insertError.message}`);
        setSaving(false);
        return;
      }

      await refreshMember();
      startTransition("/pending-approval");
    } catch (err) {
      console.error("Error:", err);
      setError("Something went wrong. Please try again.");
      setSaving(false);
    }
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

  return (
    <div>
      <Header />
      <main className="w-full">
        <section className="w-full px-(--margin) py-12 flex flex-col gap-8">
          <div className={styles.header}>
            <h1>Welcome to Design Waterloo</h1>
            <p className={styles.subtitle}>
              Let&apos;s set up your profile. You can always edit this later.
            </p>
          </div>

          {/* Progress */}
          <div className={styles.progress}>
            <div
              className={`${styles.step} ${step >= 1 ? styles.active : ""}`}
            >
              1. Basic Info
            </div>
            <div
              className={`${styles.step} ${step >= 2 ? styles.active : ""}`}
            >
              2. About You
            </div>
            <div
              className={`${styles.step} ${step >= 3 ? styles.active : ""}`}
            >
              3. Links & Skills
            </div>
          </div>

          {error && <div className={styles.error}>{error}</div>}

          <div className={styles.form}>
            {step === 1 && (
              <div className={styles.stepContent}>
                <div className={styles.field}>
                  <label>Profile Photo</label>
                  <ImageUpload
                    currentImageUrl={profileImageUrl}
                    onImageUploaded={setProfileImageUrl}
                  />
                </div>

                <div className={styles.field}>
                  <label htmlFor="firstName">First Name *</label>
                  <input
                    id="firstName"
                    type="text"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    placeholder="Your first name"
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
                    placeholder="Your last name"
                    required
                  />
                </div>

                <div className={styles.field}>
                  <label>School</label>
                  <input type="text" value={school || ""} disabled />
                  <span className={styles.hint}>
                    Detected from your email ({user?.email})
                  </span>
                </div>

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

                <div className={styles.actions}>
                  <button
                    className={styles.primaryButton}
                    onClick={() => setStep(2)}
                    disabled={!firstName || !lastName}
                  >
                    Continue
                  </button>
                </div>
              </div>
            )}

            {step === 2 && (
              <div className={styles.stepContent}>
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

                <div className={styles.actions}>
                  <button
                    className={styles.secondaryButton}
                    onClick={() => setStep(1)}
                  >
                    Back
                  </button>
                  <button
                    className={styles.primaryButton}
                    onClick={() => setStep(3)}
                  >
                    Continue
                  </button>
                </div>
              </div>
            )}

            {step === 3 && (
              <div className={styles.stepContent}>
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

                <div className={styles.field}>
                  <label htmlFor="instagram">Instagram</label>
                  <input
                    id="instagram"
                    type="text"
                    value={instagram}
                    onChange={(e) => setInstagram(e.target.value)}
                    placeholder="@yourusername"
                  />
                </div>

                <div className={styles.field}>
                  <label htmlFor="github">GitHub</label>
                  <input
                    id="github"
                    type="text"
                    value={github}
                    onChange={(e) => setGithub(e.target.value)}
                    placeholder="yourusername"
                  />
                </div>

                <div className={styles.field}>
                  <label>Specialties</label>
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

                <div className={styles.actions}>
                  <button
                    className={styles.secondaryButton}
                    onClick={() => setStep(2)}
                  >
                    Back
                  </button>
                  <button
                    className={styles.primaryButton}
                    onClick={handleSubmit}
                    disabled={saving || !firstName || !lastName}
                  >
                    {saving ? "Creating profile..." : "Complete Setup"}
                  </button>
                </div>
              </div>
            )}
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
