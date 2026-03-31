"use client";

import { useState, useRef } from "react";
import Image from "next/image";
import styles from "./ImageUpload.module.css";

interface ImageUploadProps {
  currentImageUrl?: string | null;
  onImageUploaded: (imageUrl: string) => void;
  className?: string;
}

export default function ImageUpload({
  currentImageUrl,
  onImageUploaded,
  className,
}: ImageUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const displayUrl = previewUrl || currentImageUrl;

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Create preview
    const objectUrl = URL.createObjectURL(file);
    setPreviewUrl(objectUrl);
    setError(null);
    setUploading(true);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch("/api/upload-image", {
        method: "POST",
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Upload failed");
      }

      onImageUploaded(data.imageUrl);
      setPreviewUrl(data.imageUrl);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
      setPreviewUrl(null);
    } finally {
      setUploading(false);
      // Clean up object URL
      URL.revokeObjectURL(objectUrl);
    }
  };

  const handleClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className={`${styles.container} ${className || ""}`}>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        onChange={handleFileSelect}
        className={styles.hiddenInput}
      />

      <button
        type="button"
        onClick={handleClick}
        disabled={uploading}
        className={styles.uploadButton}
      >
        {displayUrl ? (
          <div className={styles.imagePreview}>
            <Image
              src={displayUrl}
              alt="Profile preview"
              fill
              className={styles.previewImage}
            />
            <div className={styles.overlay}>
              <span>{uploading ? "Uploading..." : "Change Photo"}</span>
            </div>
          </div>
        ) : (
          <div className={styles.placeholder}>
            {uploading ? (
              <span>Uploading...</span>
            ) : (
              <>
                <svg
                  width="32"
                  height="32"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="17 8 12 3 7 8" />
                  <line x1="12" y1="3" x2="12" y2="15" />
                </svg>
                <span>Upload Photo</span>
              </>
            )}
          </div>
        )}
      </button>

      {error && <p className={styles.error}>{error}</p>}

      <p className={styles.hint}>JPEG, PNG, WebP or GIF. Max 10MB.</p>
    </div>
  );
}
