"use client";

import styles from "./BloomingLogo.module.css";

interface BloomingLogoProps {
  show: boolean;
  size?: number;
  className?: string;
}

// Four oval subpaths from the source Figma vector. Each path begins at the
// oval's lowest anchor (largest y). Right-side ovals trace counter-clockwise,
// left-side ovals trace clockwise — so every draw radiates outward from
// its bottom toward the nearer side of the canvas.
const PETALS = [
  // Oval 1 — lowest at (310.83, 250.79), right side, CCW
  "M310.827 250.794C343.953 217.668 320.964 140.971 259.48 79.4871C197.995 18.0028 121.298 -4.98615 88.1723 28.1399C55.0462 61.2659 78.0352 137.963 139.52 199.447C201.004 260.932 277.701 283.92 310.827 250.794Z",
  // Oval 3 — lowest at (250.79, 310.77), right side, CCW
  "M250.794 310.766C283.92 277.64 260.932 200.943 199.447 139.459C137.963 77.9744 61.2659 54.9855 28.1399 88.1116C-4.98615 121.238 18.0028 197.935 79.4871 259.419C140.971 320.903 217.668 343.892 250.794 310.766Z",
  // Oval 2 — lowest at (110.79, 250.85), left side, CW
  "M110.788 250.853C77.6624 217.726 100.651 141.03 162.136 79.5453C223.62 18.0609 300.317 -4.92803 333.443 28.198C366.569 61.3241 343.58 138.021 282.096 199.505C220.611 260.99 143.914 283.979 110.788 250.853Z",
  // Oval 4 — lowest at (170.82, 310.82), left side, CW
  "M170.821 310.824C137.695 277.698 160.684 201.001 222.168 139.517C283.652 78.0326 360.349 55.0436 393.475 88.1697C426.601 121.296 403.612 197.993 342.128 259.477C280.644 320.961 203.947 343.95 170.821 310.824Z",
];

export default function BloomingLogo({ show, size = 100, className = "" }: BloomingLogoProps) {
  const height = (size * 338.964) / 421.615;
  return (
    <svg
      width={size}
      height={height}
      viewBox="0 0 421.615 338.964"
      className={`${styles.svg} ${show ? styles.show : ''} ${className}`}
      fill="none"
      stroke="currentColor"
      strokeWidth={26}
      role="img"
      aria-label="Design Waterloo"
    >
      {PETALS.map((d, i) => (
        <path
          key={i}
          d={d}
          className={`${styles.petal} ${styles[`petal${i + 1}`]}`}
          pathLength={100}
        />
      ))}
    </svg>
  );
}
