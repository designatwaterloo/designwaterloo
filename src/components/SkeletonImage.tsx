"use client";

import { useState } from "react";
import Image, { ImageProps } from "next/image";

type SkeletonImageProps = Omit<ImageProps, "placeholder" | "blurDataURL" | "onLoad"> & {
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
  const [loaded, setLoaded] = useState(false);

  // Derive aspect ratio: explicit style > computed from width/height props
  const aspectRatio =
    style?.aspectRatio ??
    (width && height ? `${width} / ${height}` : undefined);

  return (
    <div
      className={`relative overflow-hidden ${wrapperClassName ?? ""}`}
      style={{ aspectRatio }}
    >
      {/* Skeleton pulse — visible until image loads */}
      {!loaded && (
        <div
          className={`absolute inset-0 animate-pulse ${skeletonClassName ?? "bg-skeleton"}`}
        />
      )}

      <Image
        {...props}
        alt={alt}
        width={width}
        height={height}
        className={className}
        style={style}
        onLoad={() => setLoaded(true)}
      />

      {/* Black wipe overlay — covers image, then sweeps down to reveal */}
      {loaded && (
        <div
          className="absolute inset-0 bg-skeleton"
          style={{
            animation: "wipeReveal 0.8s cubic-bezier(0.76, 0, 0.24, 1) forwards",
          }}
        />
      )}
    </div>
  );
}
