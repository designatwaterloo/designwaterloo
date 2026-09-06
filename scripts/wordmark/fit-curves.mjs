// Offline, error-bounded cubic fitting. Keep closed contours separate so holes
// and disjoint lobes retain the source's even-odd topology.
const add = (a, b) => [a[0] + b[0], a[1] + b[1]];
const sub = (a, b) => [a[0] - b[0], a[1] - b[1]];
const mul = (a, s) => [a[0] * s, a[1] * s];
const dot = (a, b) => a[0] * b[0] + a[1] * b[1];
const length = (a) => Math.hypot(...a);
const unit = (a) => mul(a, 1 / (length(a) || 1));
const at = (c, t) => {
  const s = 1 - t;
  return add(
    add(mul(c[0], s * s * s), mul(c[1], 3 * s * s * t)),
    add(mul(c[2], 3 * s * t * t), mul(c[3], t * t * t)),
  );
};
function fit(p, left, right, tolerance, out) {
  const first = p[0],
    last = p.at(-1);
  if (p.length === 2) {
    const d = length(sub(last, first)) / 3;
    out.push([first, add(first, mul(left, d)), add(last, mul(right, d)), last]);
    return;
  }
  const u = [0];
  for (let i = 1; i < p.length; i++)
    u.push(u.at(-1) + length(sub(p[i], p[i - 1])));
  const total = u.at(-1);
  for (let i = 1; i < u.length; i++) u[i] /= total || 1;
  let aa = 0,
    ab = 0,
    bb = 0,
    ax = 0,
    bx = 0;
  for (let i = 0; i < p.length; i++) {
    const t = u[i],
      s = 1 - t,
      b1 = 3 * s * s * t,
      b2 = 3 * s * t * t;
    const a = mul(left, b1),
      b = mul(right, b2);
    const v = sub(
      p[i],
      add(mul(first, s * s * s + b1), mul(last, t * t * t + b2)),
    );
    aa += dot(a, a);
    ab += dot(a, b);
    bb += dot(b, b);
    ax += dot(a, v);
    bx += dot(b, v);
  }
  const det = aa * bb - ab * ab;
  let alpha = det ? (ax * bb - bx * ab) / det : 0,
    beta = det ? (bx * aa - ax * ab) / det : 0;
  const distance = length(sub(last, first));
  if (alpha < distance * 1e-6 || beta < distance * 1e-6) {
    alpha = beta = distance / 3;
  }
  const c = [
    first,
    add(first, mul(left, alpha)),
    add(last, mul(right, beta)),
    last,
  ];
  let worst = 0,
    split = Math.floor(p.length / 2);
  for (let i = 1; i < p.length - 1; i++) {
    const error = length(sub(at(c, u[i]), p[i]));
    if (error > worst) {
      worst = error;
      split = i;
    }
  }
  if (worst <= tolerance) {
    out.push(c);
    return;
  }
  const tangent = unit(sub(p[split + 1], p[split - 1]));
  fit(p.slice(0, split + 1), left, mul(tangent, -1), tolerance, out);
  fit(p.slice(split), tangent, right, tolerance, out);
}
export function fitClosedContour(points, tolerance = 0.035) {
  // Uniform arclength sampling prevents marching-square point density from
  // biasing smoothing. A tiny symmetric kernel removes sampling stair steps.
  const distances = [0];
  for (let i = 0; i < points.length; i++)
    distances.push(
      distances.at(-1) +
        length(sub(points[(i + 1) % points.length], points[i])),
    );
  const perimeter = distances.at(-1),
    count = Math.max(8, Math.ceil(perimeter / 0.06));
  let edge = 0;
  const sampled = [];
  for (let i = 0; i < count; i++) {
    const d = (i * perimeter) / count;
    while (distances[edge + 1] < d) edge++;
    const t =
      (d - distances[edge]) / (distances[edge + 1] - distances[edge] || 1);
    sampled.push(
      add(
        points[edge],
        mul(sub(points[(edge + 1) % points.length], points[edge]), t),
      ),
    );
  }
  const kernel = [1, 8, 28, 56, 70, 56, 28, 8, 1];
  const smooth = sampled.map((_, i) =>
    kernel.reduce(
      (v, w, j) => add(v, mul(sampled[(i + j - 4 + count) % count], w / 256)),
      [0, 0],
    ),
  );
  const curves = [];
  for (let quarter = 0; quarter < 4; quarter++) {
    const start = Math.floor((quarter * count) / 4),
      end = Math.floor(((quarter + 1) * count) / 4);
    const tangent = (i) =>
      unit(sub(smooth[(i + 3) % count], smooth[(i - 3 + count) % count]));
    const p = [];
    for (let i = start; i <= end; i++) p.push(smooth[i % count]);
    fit(p, tangent(start), mul(tangent(end % count), -1), tolerance, curves);
  }
  const coord = (p) => p.map((n) => +n.toFixed(4)).join(" ");
  return (
    "M" +
    coord(curves[0][0]) +
    curves.map((c) => "C" + c.slice(1).map(coord).join(" ")).join("") +
    "Z"
  );
}
