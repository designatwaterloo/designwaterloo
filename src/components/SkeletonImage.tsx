"use client";

import { useState } from "react";
import Image, { ImageProps } from "next/image";

type SkeletonImageProps = Omit<ImageProps, "placeholder" | "blurDataURL" | "onLoad"> & {
  skeletonClassName?: string;
};

export default function SkeletonImage({
  className = "",
  skeletonClassName,
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
    <div className="relative" style={{ aspectRatio }}>
      {!loaded && (
        <div
          className={`absolute inset-0 animate-pulse rounded ${skeletonClassName ?? "bg-skeleton"}`}
        />
      )}
      <Image
        {...props}
        alt={alt}
        width={width}
        height={height}
        className={`${className} transition-opacity duration-500 ${loaded ? "opacity-100" : "opacity-0"}`}
        style={style}
        onLoad={() => setLoaded(true)}
      />
    </div>
  );
}
