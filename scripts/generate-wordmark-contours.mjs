// Regenerate with: node scripts/generate-wordmark-contours.mjs
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..") + "/";
const data = JSON.parse(
  fs
    .readFileSync(root + "src/components/Wordmark/paths.ts", "utf8")
    .split("export const wordmarks = ")[1]
    .replace(/ as const;\s*$/, ""),
).horizontal;
const outline = data.oo.match(/ d="([^"]+)"/)[1],
  parts = outline.match(/M[^M]+/g);
const W = 3072,
  H = 1920,
  scale = W / 96;
async function mask(d) {
  return sharp(
    Buffer.from(
      `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="${data.cx - 48} ${data.cy - 30} 96 60"><path transform="translate(-.75 0)" d="${d}" fill="white"/></svg>`,
    ),
  )
    .ensureAlpha()
    .raw()
    .toBuffer();
}
// Exact squared Euclidean distance transform, separable in x and y.
function edt(mask, target) {
  const f = new Float64Array(W * H);
  for (let i = 0; i < f.length; i++) f[i] = mask[i] === target ? 0 : 1e8;
  function line(values) {
    const n = values.length,
      v = new Int32Array(n),
      z = new Float64Array(n + 1),
      out = new Float64Array(n);
    let k = 0;
    z[0] = -Infinity;
    z[1] = Infinity;
    for (let q = 1; q < n; q++) {
      let s;
      do {
        s =
          (values[q] + q * q - (values[v[k]] + v[k] * v[k])) /
          (2 * q - 2 * v[k]);
        if (s <= z[k]) k--;
        else break;
      } while (k >= 0);
      k++;
      v[k] = q;
      z[k] = s;
      z[k + 1] = Infinity;
    }
    k = 0;
    for (let q = 0; q < n; q++) {
      while (z[k + 1] < q) k++;
      out[q] = (q - v[k]) ** 2 + values[v[k]];
    }
    return out;
  }
  for (let y = 0; y < H; y++) f.set(line(f.slice(y * W, (y + 1) * W)), y * W);
  for (let x = 0; x < W; x++) {
    const a = new Float64Array(H);
    for (let y = 0; y < H; y++) a[y] = f[y * W + x];
    const b = line(a);
    for (let y = 0; y < H; y++) f[y * W + x] = b[y];
  }
  return f;
}
(async () => {
  const outer = await mask(parts[0]),
    holes = await mask(parts.slice(1).join(""));
  const output = new Float32Array(W * H * 2);
  for (let channel = 0; channel < 2; channel++) {
    const img = channel ? holes : outer,
      m = new Uint8Array(W * H);
    for (let i = 0; i < m.length; i++) m[i] = img[i * 4 + 3] > 127 ? 1 : 0;
    const inside = edt(m, 0),
      outside = edt(m, 1);
    for (let i = 0; i < m.length; i++) {
      const d =
        (m[i] ? -Math.sqrt(inside[i]) + 0.5 : Math.sqrt(outside[i]) - 0.5) /
        scale;
      output[i * 2 + channel] = d / 20;
    }
  }
  fs.writeFileSync(
    root + "scripts/wordmark/contours.f32",
    Buffer.from(output.buffer),
  );
  fs.writeFileSync(
    root + "scripts/wordmark/contours-size.json",
    JSON.stringify({ width: W, height: H }),
  );
  console.log({ subpaths: parts.length, width: W, height: H });
})();
