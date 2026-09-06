# Wordmark orbit bake

The site plays `src/components/Wordmark/orbit-frames.json` by updating one SVG
path for a 1.2-second hover orbit. Clicks on the left/right of the oo add
angular momentum in that direction. Playback converts angles back into the
eased bake timeline and settles on a complete turn. The 121 frames are loaded
on the first hover and shared by all wordmarks. The original SVG is retained at
rest and for reduced motion. No canvas, WebGL, or contour texture ships in the
wordmark rendering path.

To regenerate after changing the wordmark contours:

```sh
node scripts/generate-wordmark-contours.mjs
node scripts/wordmark/bake-orbit.mjs
```

`volume-reference.ts` records the original shader as an offline reference;
`bake-orbit.mjs` implements its analytic surface intersections on the CPU and
traces the ink into SVG contours. The rear lobe's ink remains visible through
the front opening. All holes are transparent; paths use the even-odd fill rule.

The bake samples at 600 × 375, simplifies to a 0.05 SVG-unit tolerance, and
stores coordinates to three decimal places. Playback is a sequence of vector
frames, not a runtime 3D simulation or raster sprite sheet.
