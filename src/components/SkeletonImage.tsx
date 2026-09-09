"use client";

import { useState, useCallback } from "react";
import Image, { ImageProps, ImageLoaderProps } from "next/image";
import styles from "./SkeletonImage.module.css";

// Sanity already provides a resizing CDN. Avoid fetching the full original
// into Next's optimizer before the browser can receive a profile image.
function sanityLoader({ src, width, quality }: ImageLoaderProps) {
  const url = new URL(src);
  url.searchParams.set("w", String(width));
  url.searchParams.set("q", String(quality ?? 75));
  url.searchParams.set("auto", "format");
  url.searchParams.set("fit", "max");
  return url.toString();
}

type SkeletonImageProps = Omit<
  ImageProps,
  "placeholder" | "blurDataURL" | "onLoad"
> & {
  skeletonClassName?: string;
  wrapperClassName?: string;
};

export default function SkeletonImage({
  className = "",
  skeletonClassName,
  wrapperClassName,
  style,
  alt,
  width,
  height,
  ...props
}: SkeletonImageProps) {
  const src =
    typeof props.src === "string"
      ? props.src
      : "default" in props.src
        ? props.src.default.src
        : props.src.src;
  // A thumbnail and a full-size photo can share a source URL but require
  // separate downloads. Let this image instance report when it is ready.
  const [loadedSrc, setLoadedSrc] = useState<string | null>(null);
  const loaded = loadedSrc === src;

  const handleLoad = useCallback(() => {
    setLoadedSrc(src);
  }, [src]);

  // Derive aspect ratio: explicit style > computed from width/height props
  const aspectRatio =
    style?.aspectRatio ??
    (width && height ? `${width} / ${height}` : undefined);

  return (
    <div
      className={`relative isolate overflow-hidden ${wrapperClassName ?? ""}`}
      style={{ aspectRatio }}
    >
      {/* Keep the placeholder above the decoded image and fade it away. */}
      <div
        aria-hidden="true"
        className={`absolute inset-0 ${styles.skeleton} ${loaded ? styles.revealed : ""} ${skeletonClassName ?? "bg-skeleton"}`}
      />

      <Image
        {...props}
        loader={
          props.loader ??
          (src.startsWith("https://cdn.sanity.io/images/")
            ? sanityLoader
            : undefined)
        }
        alt={alt}
        width={width}
        height={height}
        className={className}
        style={style}
        onLoad={handleLoad}
      />
    </div>
  );
}
