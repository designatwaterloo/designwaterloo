# Wordmark orbit bake

The site plays `src/components/Wordmark/orbit-frames.json` by updating one SVG
path for a 1.2-second hover orbit. Clicks on the left/right of the oo add
angular momentum in that direction. Playback maps signed angles into one uniformly sampled half-orbit, forward
or backward, and settles every 180 degrees. The bake reconnects the original
bridge at both ends, smoothly exchanging each lobe’s source contour and counter
as they orbit. The 121 frames are loaded
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

The offline source field uses 3072 × 1920 floating-point signed distances,
removing the old 8-bit PNG quantization. These generated fields are ignored by
Git and rebuilt with the command above; contours.png is only a legacy reference.
The inner openings come directly from the original SVG cubic curves via
monotonic horizontal intersections; they no longer use the raster distance map.
The bake samples at 1200 × 750 and refines each edge crossing with 14 bisection
steps against the geometry, then resamples contours by arclength, applies a small
symmetric smoothing kernel, and fits cubic Bézier segments to a 0.035 SVG-unit
tolerance against the smoothed contour. Coordinates retain four decimal places.
Separate closed contours preserve transparent openings with even-odd filling.
Playback remains a sequence of vector frames, not a runtime 3D simulation or
raster sprite sheet.
