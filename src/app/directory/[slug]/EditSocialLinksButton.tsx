"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/auth/AuthProvider";
import { createClient } from "@/lib/supabase/client";
import styles from "./page.module.css";

interface EditSocialLinksButtonProps {
  memberSlug: string;
  linkedin: string | null;
  portfolio: string | null;
  instagram: string | null;
  twitter: string | null;
  github: string | null;
  behance: string | null;
  dribbble: string | null;
}

export default function EditSocialLinksButton({
  memberSlug,
  linkedin,
  portfolio,
  instagram,
  twitter,
  github,
  behance,
  dribbble,
}: EditSocialLinksButtonProps) {
  const { user, member, refreshMember } = useAuth();
  const router = useRouter();
  const supabase = createClient();

  const [isOpen, setIsOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [linkedinValue, setLinkedinValue] = useState(linkedin || "");
  const [portfolioValue, setPortfolioValue] = useState(portfolio || "");
  const [instagramValue, setInstagramValue] = useState(instagram || "");
  const [twitterValue, setTwitterValue] = useState(twitter || "");
  const [githubValue, setGithubValue] = useState(github || "");
  const [behanceValue, setBehanceValue] = useState(behance || "");
  const [dribbbleValue, setDribbbleValue] = useState(dribbble || "");

  // Only show for the owner of this profile
  if (!member || member.slug !== memberSlug) {
    return null;
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setSaving(true);
    setError(null);

    const { error: updateError } = await supabase
      .from("members")
      .update({
        linkedin: linkedinValue || null,
        portfolio: portfolioValue || null,
        instagram: instagramValue || null,
        twitter: twitterValue || null,
        github: githubValue || null,
        behance: behanceValue || null,
        dribbble: dribbbleValue || null,
      } as never)
      .eq("auth_user_id", user.id);

    if (updateError) {
      setError(`Failed to update social links: ${updateError.message}`);
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
      // Ignore revalidation failures; data is still saved
    }

    await refreshMember();
    setSaving(false);
    setIsOpen(false);
    router.refresh();
  };

  return (
    <>
      <button
        type="button"
        className={styles.tradingCardEditButton}
        onClick={() => setIsOpen(true)}
        aria-label="Edit social links"
      >
        <svg
          className={styles.tradingCardNameIcon}
          width="20"
          height="20"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path
            d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25z"
            fill="white"
          />
          <path
            d="M20.71 7.04c.39-.39.39-1.02 0-1.41L18.37 3.29a1 1 0 0 0-1.41 0l-1.34 1.34 3.75 3.75 1.34-1.34z"
            fill="white"
          />
        </svg>
      </button>

      {isOpen && (
        <div className={styles.socialModalOverlay} role="dialog" aria-modal="true">
          <div className={styles.socialModal}>
            <div className={styles.socialModalHeader}>
              <h2 className={styles.socialModalTitle}>Edit Social Links</h2>
              <button
                type="button"
                className={styles.socialModalCloseButton}
                onClick={() => setIsOpen(false)}
                aria-label="Close"
              >
                ×
              </button>
            </div>

            <form onSubmit={handleSave} className={styles.socialModalBody}>
              {error && <p className={styles.socialModalError}>{error}</p>}

              <div className={styles.socialModalField}>
                <label htmlFor="linkedin-modal">LinkedIn</label>
                <input
                  id="linkedin-modal"
                  type="url"
                  value={linkedinValue}
                  onChange={(e) => setLinkedinValue(e.target.value)}
                  placeholder="https://linkedin.com/in/yourprofile"
                />
              </div>

              <div className={styles.socialModalField}>
                <label htmlFor="portfolio-modal">Portfolio</label>
                <input
                  id="portfolio-modal"
                  type="url"
                  value={portfolioValue}
                  onChange={(e) => setPortfolioValue(e.target.value)}
                  placeholder="https://yourportfolio.com"
                />
              </div>

              <div className={styles.socialModalField}>
                <label htmlFor="instagram-modal">Instagram</label>
                <input
                  id="instagram-modal"
                  type="text"
                  value={instagramValue}
                  onChange={(e) => setInstagramValue(e.target.value)}
                  placeholder="@yourusername or full URL"
                />
              </div>

              <div className={styles.socialModalField}>
                <label htmlFor="twitter-modal">Twitter / X</label>
                <input
                  id="twitter-modal"
                  type="text"
                  value={twitterValue}
                  onChange={(e) => setTwitterValue(e.target.value)}
                  placeholder="@yourusername or full URL"
                />
              </div>

              <div className={styles.socialModalField}>
                <label htmlFor="github-modal">GitHub</label>
                <input
                  id="github-modal"
                  type="text"
                  value={githubValue}
                  onChange={(e) => setGithubValue(e.target.value)}
                  placeholder="yourusername or full URL"
                />
              </div>

              <div className={styles.socialModalField}>
                <label htmlFor="behance-modal">Behance</label>
                <input
                  id="behance-modal"
                  type="text"
                  value={behanceValue}
                  onChange={(e) => setBehanceValue(e.target.value)}
                  placeholder="Full URL"
                />
              </div>

              <div className={styles.socialModalField}>
                <label htmlFor="dribbble-modal">Dribbble</label>
                <input
                  id="dribbble-modal"
                  type="text"
                  value={dribbbleValue}
                  onChange={(e) => setDribbbleValue(e.target.value)}
                  placeholder="Full URL"
                />
              </div>

              <div className={styles.socialModalActions}>
                <button
                  type="submit"
                  className={styles.socialModalSaveButton}
                  disabled={saving}
                >
                  {saving ? "Saving..." : "Save"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}

