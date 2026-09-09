"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "@/components/Link";
import Button from "@/components/Button";
import {
  InlineEditProvider,
  DynamicIslandToast,
  EditableText,
  PillInput,
  ProfileImageEdit,
  SocialLinksModal,
  InlineExperienceForm,
  TermChartPicker,
  useInlineEdit,
} from "@/components/InlineEdit";
import type {
  EditableFields,
  ExperienceEntry,
  LeadershipEntry,
} from "@/components/InlineEdit";
import type { ReviewStatus } from "@/types/database";
import ConfirmDialog from "@/components/ConfirmDialog";
import { ensureHttps } from "@/lib/urlUtils";
import styles from "./page.module.css";
import editStyles from "@/components/InlineEdit/InlineEdit.module.css";

import { SPECIALTIES } from "@/lib/specialties";
const ALL_SPECIALTIES = [...SPECIALTIES];


// ===== Props for the profile content =====
interface ProfileContentProps {
  memberId: string;
  memberSlug: string;
  firstName: string;
  lastName: string;
  school: string | null;
  publicEmail: string | null;
  isApproved: boolean;
  reviewStatus: ReviewStatus;
  rejectionFeedback?: string | null;
  nextAvailableTerm: string | null;
  allTerms: Array<{ code: string; displayName: string; isPast: boolean }>;
  initialFields: EditableFields;
  initialExperiences: ExperienceEntry[];
  initialLeadership: LeadershipEntry[];
  /** Programs used by other members — for autocomplete */
  programSuggestions: string[];
}

export default function ProfileContent(props: ProfileContentProps) {
  return (
    <InlineEditProvider
      memberId={props.memberId}
      memberSlug={props.memberSlug}
      initialFields={props.initialFields}
      initialExperiences={props.initialExperiences}
      initialLeadership={props.initialLeadership}
      initialReviewStatus={props.reviewStatus}
    >
      <ProfileContentInner {...props} />
    </InlineEditProvider>
  );
}

/** Wrapper that adds full-width hover highlight + click-to-edit for editable rows */
function EditableRow({
  active,
  children,
}: {
  active: boolean;
  children: React.ReactNode;
}) {
  const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const target = e.target as HTMLElement;
    if (target.closest("input, textarea, button, [role='button']")) return;

    const editable = e.currentTarget.querySelector<HTMLElement>(
      "[role='button'], input, textarea"
    );
    editable?.click();
  };

  if (!active) return <>{children}</>;

  return (
    <div className={editStyles.editableRow} onClick={handleClick}>
      {children}
    </div>
  );
}

function ProfileContentInner({
  memberSlug,
  firstName,
  lastName,
  school,
  publicEmail,
  rejectionFeedback,
  nextAvailableTerm,
  programSuggestions,
}: ProfileContentProps) {
  const { isOwner, editMode, fields, reviewStatus, submitForReview } = useInlineEdit();
  const [socialModalOpen, setSocialModalOpen] = useState(false);
  const [showWelcome, setShowWelcome] = useState(false);
  const [showSubmitConfirm, setShowSubmitConfirm] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Use live reviewStatus from context (updates after actions)
  const effectiveStatus = reviewStatus;

  // Auto-enable edit mode for draft owners; show welcome only on first visit
  const searchParams = useSearchParams();
  const router = useRouter();
  useEffect(() => {
    if (isOwner && searchParams.get("edit") === "true") router.replace("/dashboard");
  }, [isOwner, searchParams, router]);

  const handleSubmitForReview = () => {
    setShowSubmitConfirm(true);
  };

  const handleConfirmSubmit = async () => {
    setSubmitting(true);
    await submitForReview();
    setSubmitting(false);
    setShowSubmitConfirm(false);
  };

  // For non-owners, derive values from initial; for owners, from live fields
  const program = fields.program;
  const graduatingClass = fields.graduating_class;
  const bio = fields.bio;
  const specialties = fields.specialties;
  const workSchedule = fields.work_schedule;

  // Social links — for rendering the trading card (read-only view)
  const socialLinks = {
    portfolio: fields.portfolio,
    twitter: fields.twitter,
    linkedin: fields.linkedin,
    instagram: fields.instagram,
    github: fields.github,
    behance: fields.behance,
    dribbble: fields.dribbble,
  };

  const hasSocialLinks = Object.values(socialLinks).some(Boolean);

  return (
    <>
      <section data-account-workspace={isOwner && editMode ? true : undefined} className={`${styles.section} ${editMode ? styles.editMode : ""}`}>
        {/* Name Row */}
        <div className={styles.nameRow}>
          <div className={styles.identity}>
            <h1 className={styles.name}>
              {firstName} {lastName}
            </h1>
            <p className={styles.username} aria-label={`Design Waterloo username: @${memberSlug}`}>
              <span className={styles.usernameIcon} aria-hidden="true" />
              <span>{memberSlug}</span>
            </p>
          </div>
          {isOwner && !editMode && (
            <Link
              href="/dashboard"
              className={styles.editButton}
              aria-label="Edit profile"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/pencil.svg" alt="" />
            </Link>
          )}
        </div>

        {/* Image + Trading Card */}
        <div className={styles.imageContainer}>
          <ProfileImageEdit />

          {/* Trading Card — clickable in edit mode to open social links modal */}
          <div
            className={`${styles.tradingCard} ${editMode ? editStyles.tradingCardEditable : ""}`}
            onClick={editMode ? () => setSocialModalOpen(true) : undefined}
            role={editMode ? "button" : undefined}
            tabIndex={editMode ? 0 : undefined}
            onKeyDown={
              editMode
                ? (e) => {
                    if (e.key === "Enter" || e.key === " ") setSocialModalOpen(true);
                  }
                : undefined
            }
          >
            <p className={styles.tradingCardName}>
              {firstName} {lastName}
              {editMode && !hasSocialLinks && (
                <span style={{ color: "rgba(255,255,255,0.4)", fontStyle: "italic", fontSize: "13px" }}>
                  Click to add links
                </span>
              )}
            </p>
            <div className={styles.tradingCardLinks}>
              {socialLinks.portfolio && (
                <TradingCardLink
                  href={ensureHttps(socialLinks.portfolio)}
                  icon="/globe.svg"
                  label={socialLinks.portfolio.replace(/^https?:\/\/(www\.)?/, "").replace(/\/$/, "")}
                  preventNav={editMode}
                />
              )}
              {socialLinks.twitter && (
                <TradingCardLink
                  href={ensureHttps(socialLinks.twitter)}
                  icon="/twitter_logo.svg"
                  label={
                    socialLinks.twitter.match(/(?:twitter\.com\/|x\.com\/|@)([^\/\?]+)/)?.[1]
                      ? `@${socialLinks.twitter.match(/(?:twitter\.com\/|x\.com\/|@)([^\/\?]+)/)?.[1]}`
                      : "twitter"
                  }
                  preventNav={editMode}
                />
              )}
              {socialLinks.linkedin && (
                <TradingCardLink
                  href={ensureHttps(socialLinks.linkedin)}
                  icon="/linkedin_logo.svg"
                  label={
                    socialLinks.linkedin.match(/\/in\/([^\/\?]+)/)?.[1]
                      ? `in/${socialLinks.linkedin.match(/\/in\/([^\/\?]+)/)?.[1]}`
                      : "linkedin"
                  }
                  preventNav={editMode}
                />
              )}
              {socialLinks.instagram && (
                <TradingCardLink
                  href={ensureHttps(socialLinks.instagram)}
                  icon="/instagram_logo.svg"
                  label={
                    socialLinks.instagram.match(/(?:instagram\.com\/|@)([^\/\?]+)/)?.[1]
                      ? `@${socialLinks.instagram.match(/(?:instagram\.com\/|@)([^\/\?]+)/)?.[1]}`
                      : "instagram"
                  }
                  preventNav={editMode}
                />
              )}
              {socialLinks.github && (
                <TradingCardLink
                  href={ensureHttps(socialLinks.github)}
                  icon="/github_logo.svg"
                  label={socialLinks.github.match(/(?:github\.com\/)([^\/\?]+)/)?.[1] || "github"}
                  preventNav={editMode}
                />
              )}
              {socialLinks.behance && (
                <TradingCardLink
                  href={ensureHttps(socialLinks.behance)}
                  label="behance"
                  preventNav={editMode}
                />
              )}
              {socialLinks.dribbble && (
                <TradingCardLink
                  href={ensureHttps(socialLinks.dribbble)}
                  label="dribbble"
                  preventNav={editMode}
                />
              )}
            </div>
          </div>
        </div>

        {/* Next Available */}
        {nextAvailableTerm && publicEmail && (
          <dl className={styles.nextAvailable}>
            <dt className={styles.label}>Next available</dt>
            <dd>
              <Button
                variant="secondary"
                href={`mailto:${publicEmail}`}
                icon="/mail.svg"
              >
                {nextAvailableTerm}
              </Button>
            </dd>
          </dl>
        )}

        {/* Rejection banner for owners */}
        {isOwner && effectiveStatus === "rejected" && rejectionFeedback && (
          <div className={styles.rejectionBanner}>
            <strong>Your profile was not approved.</strong> Feedback: {rejectionFeedback}
            <br />
            <Link href="/dashboard" className={styles.rejectionLink}>View details on your dashboard</Link>
          </div>
        )}

        {/* Content */}
        <div className={styles.content}>
          {/* Basic Info */}
          <div className={styles.rowGroup}>
            {(school || isOwner) && (
              editMode ? (
                <div className={editStyles.disabledRow}>
                  <dl className={styles.infoRow}>
                    <dt className={styles.label}>School</dt>
                    <dd>{school ?? "—"}</dd>
                  </dl>
                </div>
              ) : (
                <dl className={styles.infoRow}>
                  <dt className={styles.label}>School</dt>
                  <dd>{school ?? "—"}</dd>
                </dl>
              )
            )}
            {(program || isOwner) && (
              <EditableRow active={editMode}>
                <dl className={styles.infoRow}>
                  <dt className={styles.label}>Program</dt>
                  <dd>
                    <EditableText
                      field="program"
                      placeholder="Click to add program..."
                      suggestions={programSuggestions}
                    />
                  </dd>
                </dl>
              </EditableRow>
            )}
            {(graduatingClass || isOwner) && (
              <EditableRow active={editMode}>
                <dl className={styles.infoRow}>
                  <dt className={styles.label}>Class</dt>
                  <dd>
                    <EditableText
                      field="graduating_class"
                      placeholder="Click to add year..."
                    />
                  </dd>
                </dl>
              </EditableRow>
            )}
          </div>

          {/* Specialties */}
          {(specialties.length > 0 || isOwner) && (
            <div className={styles.rowGroup}>
              <EditableRow active={editMode}>
                <dl className={styles.infoRow}>
                  <dt className={styles.label}>Specialties</dt>
                  <dd>
                    <PillInput
                      field="specialties"
                      suggestions={ALL_SPECIALTIES}
                      maxItems={5}
                      placeholder="Type to add a specialty..."
                    />
                  </dd>
                </dl>
              </EditableRow>
            </div>
          )}

          {/* Work Terms */}
          {(workSchedule.length > 0 || isOwner) && (
            <div className={styles.rowGroup}>
              <EditableRow active={editMode}>
                <dl className={styles.infoRow}>
                  <dt className={styles.label}>Work terms</dt>
                  <dd>
                    <TermChartPicker />
                  </dd>
                </dl>
              </EditableRow>
            </div>
          )}

          {/* Bio */}
          {(bio || isOwner) && (
            <div className={styles.rowGroup}>
              <EditableRow active={editMode}>
                <dl className={styles.infoRow}>
                  <dt className={styles.label}>Bio</dt>
                  <dd>
                    <EditableText
                      field="bio"
                      placeholder="Click to add bio..."
                      multiline
                      maxLength={2000}
                    />
                  </dd>
                </dl>
              </EditableRow>
            </div>
          )}

{/* Experience */}
          <InlineExperienceForm type="experience" label="Experience" />

          {/* Leadership */}
          <InlineExperienceForm type="leadership" label="Leadership" />
        </div>
      </section>

      {/* Social Links Modal + Toast (owner only) */}
      {isOwner && (
        <>
          <SocialLinksModal
            isOpen={socialModalOpen}
            onClose={() => setSocialModalOpen(false)}
          />
          <DynamicIslandToast
            reviewStatus={effectiveStatus}
            onSubmitForReview={handleSubmitForReview}
          />
        </>
      )}

      {/* Submit confirmation dialog */}
      {showSubmitConfirm && (
        <ConfirmDialog
          title="Submit for review"
          message="Your profile will be reviewed by an admin before appearing in the directory. You can still edit your profile while it's under review."
          confirmLabel="Submit"
          onConfirm={handleConfirmSubmit}
          onCancel={() => setShowSubmitConfirm(false)}
          loading={submitting}
        />
      )}

      {/* Welcome lightbox for new members */}
      {showWelcome && (
        <div className={styles.welcomeOverlay} onClick={() => setShowWelcome(false)}>
          <div className={styles.welcomeModal} onClick={(e) => e.stopPropagation()}>
            <h2>Welcome to Design Waterloo</h2>
            <p>
              This is your profile page. You can click on any field to edit it
              — add your photo, bio, social links, experience, and more.
            </p>
            <p>
              When you&apos;re happy with how it looks, save your changes and submit
              your profile for review. Once approved, you&apos;ll appear in the directory.
            </p>
            <button
              className={styles.welcomeButton}
              onClick={() => setShowWelcome(false)}
            >
              Get started
            </button>
          </div>
        </div>
      )}
    </>
  );
}

// ===== Helper: Trading Card Link =====

function TradingCardLink({
  href,
  icon,
  label,
  preventNav,
}: {
  href: string;
  icon?: string;
  label: string;
  preventNav: boolean;
}) {
  const handleClick = (e: React.MouseEvent) => {
    if (preventNav) e.preventDefault();
  };

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      onClick={handleClick}
    >
      {icon && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={icon}
          width={20}
          height={20}
          alt=""
          className={styles.tradingCardIcon}
        />
      )}
      {label}
    </a>
  );
}
