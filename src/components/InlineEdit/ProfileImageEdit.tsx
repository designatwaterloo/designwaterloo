"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import SkeletonImage from "@/components/SkeletonImage";
import { useInlineEdit } from "./InlineEditProvider";
import styles from "./InlineEdit.module.css";
import pageStyles from "@/app/directory/[slug]/page.module.css";

export default function ProfileImageEdit() {
  const { isOwner, editMode, fields, setField } = useInlineEdit();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const imageUrl = previewUrl || fields.profile_image_url;

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const objectUrl = URL.createObjectURL(file);
    setPreviewUrl(objectUrl);
    setUploading(true);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch("/api/upload-image", {
        method: "POST",
        body: formData,
      });
      const data = await response.json();

      if (!response.ok) throw new Error(data.error || "Upload failed");

      setField("profile_image_url", data.imageUrl);
      setPreviewUrl(data.imageUrl);
    } catch (err) {
      console.error("Upload failed:", err);
      setPreviewUrl(null);
    } finally {
      setUploading(false);
      URL.revokeObjectURL(objectUrl);
    }
  };

  if (!isOwner || !editMode) {
    return (
      <div className={pageStyles.imageWrapper}>
        {imageUrl ? (
          <SkeletonImage
            src={imageUrl}
            alt="Profile"
            width={800}
            height={1000}
            className={pageStyles.image}
            wrapperClassName="w-full h-full"
            style={{ aspectRatio: "4 / 5" }}
            priority
          />
        ) : (
          <div className="w-full h-full bg-skeleton animate-pulse rounded" />
        )}
      </div>
    );
  }

  return (
    <>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        onChange={handleFileSelect}
        className="hidden"
      />
      <button
        type="button"
        onClick={() => fileInputRef.current?.click()}
        disabled={uploading}
        className={styles.imageEditButton}
      >
        {imageUrl ? (
          <div className={pageStyles.imageWrapper}>
            <Image
              src={imageUrl}
              alt="Profile"
              width={800}
              height={1000}
              className={pageStyles.image}
              priority
            />
          </div>
        ) : (
          <div className={styles.imagePlaceholder}>
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="17 8 12 3 7 8" />
              <line x1="12" y1="3" x2="12" y2="15" />
            </svg>
            <span>Upload Photo</span>
          </div>
        )}
        {/* Persistent edit overlay icon */}
        <div className={`${styles.imageEditOverlay} ${uploading ? styles.imageEditOverlayActive : ""}`}>
          {uploading ? (
            <span className={styles.imageEditLabel}>Uploading...</span>
          ) : (
            <>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
                <circle cx="12" cy="13" r="4" />
              </svg>
              <span className={styles.imageEditLabel}>Change photo</span>
            </>
          )}
        </div>
      </button>
    </>
  );
}
