// Offline vector bake of volume-reference.ts. Runtime uses only the SVG paths.
// Run: node scripts/generate-wordmark-contours.mjs && node scripts/wordmark/bake-orbit.mjs
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createInnerContours } from "./inner-contours.mjs";
import { fitClosedContour } from "./fit-curves.mjs";
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "../.."),
  W = 1200,
  H = 750,
  frames = 121;
const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
const smooth = (v) => {
  v = clamp(v);
  return v * v * (3 - 2 * v);
};
(async () => {
  const bytes = fs.readFileSync(
    path.join(root, "scripts/wordmark/contours.f32"),
  );
  const data = new Float32Array(
    bytes.buffer,
    bytes.byteOffset,
    bytes.byteLength / 4,
  );
  const info = JSON.parse(
    fs.readFileSync(
      path.join(root, "scripts/wordmark/contours-size.json"),
      "utf8",
    ),
  );
  function sample(x, y, c) {
    let u = clamp((x / 4.8 + 0.5) * info.width - 0.5, 0, info.width - 1),
      v = clamp((0.5 - y / 3) * info.height - 0.5, 0, info.height - 1),
      ix = Math.floor(u),
      iy = Math.floor(v),
      fx = u - ix,
      fy = v - iy;
    const at = (a, b) =>
      data[
        (Math.min(info.height - 1, b) * info.width +
          Math.min(info.width - 1, a)) *
          2 +
          c
      ];
    return (
      (at(ix, iy) * (1 - fx) + at(ix + 1, iy) * fx) * (1 - fy) +
      (at(ix, iy + 1) * (1 - fx) + at(ix + 1, iy + 1) * fx) * fy
    );
  }
  const mark = JSON.parse(
    fs
      .readFileSync(path.join(root, "src/components/Wordmark/paths.ts"), "utf8")
      .split("export const wordmarks = ")[1]
      .replace(/ as const;\s*$/, ""),
  ).horizontal;
  const inner = createInnerContours(mark);
  function renderer(angle) {
    const oz = 0.914 * Math.sin(angle),
      ox = 0.914 * Math.cos(angle),
      release = smooth(Math.hypot(ox - 0.914, oz) / 0.8),
      k = 0.001 + 0.479 * release,
      r = 0.95,
      za = -oz,
      zb = oz,
      m = 2 * r * (zb - za);
    const scales = [8 / (8 + oz), 8 / (8 - oz)];
    return (x, y) => {
      const ax = x / scales[0] + ox,
        ay = y / scales[0],
        bx = x / scales[1] - ox,
        by = y / scales[1];
      function profile(qx, qy, side) {
        const orig = qx + side * 0.914,
          joined = Math.max(sample(orig, qy, 0), -side * orig),
          free = sample(side * (0.914 + Math.abs(qx)), qy, 0);
        return joined + (free - joined) * release;
      }
      const da = profile(ax, ay, -1),
        db = profile(bx, by, 1);
      let z = -100;
      if (da <= 0) z = Math.max(z, za + Math.sqrt(-da / r));
      if (db <= 0) z = Math.max(z, zb + Math.sqrt(-db / r));
      const n = r * (za * za - zb * zb) + da - db,
        a = r - (m * m) / (4 * k),
        b = -r * (za + zb) - (m * n) / (2 * k),
        c =
          0.5 * (r * (za * za + zb * zb) + da + db) -
          k * 0.25 -
          (n * n) / (4 * k);
      const accept = (v) => {
        if (Math.abs(m * v + n) <= k + 0.00001) z = Math.max(z, v);
      };
      if (Math.abs(a) < 0.00001) {
        if (Math.abs(b) > 0.00001) accept(-c / b);
      } else {
        const disc = b * b - 4 * a * c;
        if (disc >= 0) {
          const q = -0.5 * (b + (b >= 0 ? Math.sqrt(disc) : -Math.sqrt(disc)));
          if (Math.abs(q) > 0.0000001) {
            accept(q / a);
            accept(c / q);
          } else accept(-b / (2 * a));
        }
      }
      if (z < -10) return 0;
      const ca = inner(ax - 0.914, ay),
        cb = inner(bx + 0.914, by);
      return Math.max(
        da > 0 && db > 0 ? 1 : 0,
        da <= 0 ? smooth((ca + 2.4 / W) / (4.8 / W)) : 0,
        db <= 0 ? smooth((cb + 2.4 / W) / (4.8 / W)) : 0,
      );
    };
  }
  function trace(field, render) {
    const nodes = new Map();
    function edge(x, y, dir) {
      const id = dir === "h" ? `h${x},${y}` : `v${x},${y}`;
      if (!nodes.has(id)) {
        const b = field[(y + (dir === "v")) * (W + 1) + x + (dir === "h")],
          increasing = b >= 0.5;
        let low = 0,
          high = 1;
        for (let step = 0; step < 14; step++) {
          const mid = (low + high) / 2;
          const value = render(
            ((x + (dir === "h" ? mid : 0)) / W - 0.5) * 4.8,
            (0.5 - (y + (dir === "v" ? mid : 0)) / H) * 3,
          );
          if (value >= 0.5 === increasing) high = mid;
          else low = mid;
        }
        const t = (low + high) / 2;
        nodes.set(id, {
          point: [
            ((x + (dir === "h" ? t : 0)) * 96) / W,
            ((y + (dir === "v" ? t : 0)) * 60) / H,
          ],
          links: [],
        });
      }
      return id;
    }
    function join(a, b) {
      nodes.get(a).links.push(b);
      nodes.get(b).links.push(a);
    }
    for (let y = 0; y < H; y++)
      for (let x = 0; x < W; x++) {
        const v = [
            field[y * (W + 1) + x],
            field[y * (W + 1) + x + 1],
            field[(y + 1) * (W + 1) + x + 1],
            field[(y + 1) * (W + 1) + x],
          ],
          cross = [];
        if (v[0] >= 0.5 !== v[1] >= 0.5) cross.push(edge(x, y, "h"));
        if (v[1] >= 0.5 !== v[2] >= 0.5) cross.push(edge(x + 1, y, "v"));
        if (v[2] >= 0.5 !== v[3] >= 0.5) cross.push(edge(x, y + 1, "h"));
        if (v[3] >= 0.5 !== v[0] >= 0.5) cross.push(edge(x, y, "v"));
        if (cross.length === 2) join(...cross);
        else if (cross.length === 4) {
          if (v.reduce((a, b) => a + b, 0) / 4 >= 0.5 === v[0] >= 0.5) {
            join(cross[0], cross[1]);
            join(cross[2], cross[3]);
          } else {
            join(cross[0], cross[3]);
            join(cross[1], cross[2]);
          }
        }
      }
    const seen = new Set(),
      paths = [];
    for (const [id] of nodes) {
      if (seen.has(id)) continue;
      let cur = id,
        previous = null,
        points = [];
      while (!seen.has(cur)) {
        seen.add(cur);
        const node = nodes.get(cur);
        points.push(node.point);
        const next = node.links.find((n) => n !== previous);
        previous = cur;
        cur = next;
        if (!cur) throw Error("Open contour");
      }
      if (points.length < 4) continue;
      paths.push(fitClosedContour(points));
    }
    return paths.join("");
  }
  const result = [];
  for (let frame = 0; frame < frames; frame++) {
    const t = frame / (frames - 1),
      render = renderer(smooth(t) * Math.PI * 2),
      field = new Float32Array((W + 1) * (H + 1));
    for (let y = 0; y <= H; y++)
      for (let x = 0; x <= W; x++)
        field[y * (W + 1) + x] = render((x / W - 0.5) * 4.8, (0.5 - y / H) * 3);
    // The final full turn must be byte-identical to the first frame.
    result.push(frame === frames - 1 ? result[0] : trace(field, render));
    if (frame % 30 === 0) console.log(`Baked ${frame}/${frames - 1}`);
  }
  fs.writeFileSync(
    path.join(root, "src/components/Wordmark/orbit-frames.json"),
    JSON.stringify(result),
  );
  console.log(
    `Saved ${frames} SVG frames (${Buffer.byteLength(JSON.stringify(result))} bytes)`,
  );
})();
