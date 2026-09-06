// Preserve the original SVG counters rather than rasterizing their edges.
// These convex counters have one left/right intersection at each height.
export function createInnerContours(mark) {
  const outline = mark.oo.match(/ d="([^"]+)"/)[1];
  const holes = outline
    .match(/M[^M]+/g)
    .slice(1)
    .map((path) => {
      const tokens = path.match(/[MLCZ]|-?\d*\.?\d+(?:e[-+]?\d+)?/gi);
      let i = 0,
        start,
        current;
      const segments = [];
      while (i < tokens.length) {
        const cmd = tokens[i++];
        const point = () => [Number(tokens[i++]), Number(tokens[i++])];
        if (cmd === "M") {
          start = current = point();
        } else if (cmd === "L") {
          const end = point();
          segments.push([current, current, end, end]);
          current = end;
        } else if (cmd === "C") {
          const a = point(),
            b = point(),
            end = point();
          segments.push([current, a, b, end]);
          current = end;
        } else if (cmd === "Z") {
          segments.push([current, current, start, start]);
          current = start;
        } else throw Error("Unexpected counter path command " + cmd);
      }
      const value = (s, t, axis) => {
        const u = 1 - t;
        return (
          u * u * u * s[0][axis] +
          3 * u * u * t * s[1][axis] +
          3 * u * t * t * s[2][axis] +
          t * t * t * s[3][axis]
        );
      };
      // Split at every vertical extremum so root finding remains monotonic.
      const spans = [];
      for (const s of segments) {
        const [a, b, c, d] = s.map((p) => p[1]);
        const A = -a + 3 * b - 3 * c + d,
          B = 2 * (a - 2 * b + c),
          C = b - a;
        const cuts = [0, 1],
          disc = B * B - 4 * A * C;
        const roots =
          Math.abs(A) < 1e-12
            ? Math.abs(B) > 1e-12
              ? [-C / B]
              : []
            : disc >= 0
              ? [
                  (-B + Math.sqrt(disc)) / (2 * A),
                  (-B - Math.sqrt(disc)) / (2 * A),
                ]
              : [];
        cuts.push(...roots.filter((t) => t > 0 && t < 1));
        cuts.sort((a, b) => a - b);
        for (let j = 1; j < cuts.length; j++) {
          const lo = cuts[j - 1],
            hi = cuts[j],
            y0 = value(s, lo, 1),
            y1 = value(s, hi, 1);
          if (Math.abs(y0 - y1) > 1e-10) spans.push({ s, lo, hi, y0, y1 });
        }
      }
      const min = Math.min(...spans.flatMap((s) => [s.y0, s.y1])),
        max = Math.max(...spans.flatMap((s) => [s.y0, s.y1]));
      const rows = 16384,
        left = new Float64Array(rows + 1),
        right = new Float64Array(rows + 1);
      for (let row = 0; row <= rows; row++) {
        const y = min + ((max - min) * row) / rows,
          x = [];
        for (const span of spans) {
          if (
            y < Math.min(span.y0, span.y1) - 1e-9 ||
            y > Math.max(span.y0, span.y1) + 1e-9
          )
            continue;
          let lo = span.lo,
            hi = span.hi;
          for (let k = 0; k < 38; k++) {
            const t = (lo + hi) / 2;
            if (value(span.s, t, 1) < y === span.y0 < span.y1) lo = t;
            else hi = t;
          }
          x.push(value(span.s, (lo + hi) / 2, 0));
        }
        if (!x.length) throw Error("Missing counter intersection");
        left[row] = Math.min(...x);
        right[row] = Math.max(...x);
      }
      return (x, y) => {
        if (y < min || y > max) return Math.max(min - y, y - max, 1e-8);
        const f = ((y - min) / (max - min)) * rows,
          j = Math.min(rows - 1, Math.floor(f)),
          t = f - j;
        return Math.max(
          left[j] * (1 - t) + left[j + 1] * t - x,
          x - right[j] * (1 - t) - right[j + 1] * t,
        );
      };
    });
  return (x, y) =>
    Math.min(
      ...holes.map((h) => h(x * 20 + mark.cx + 0.75, mark.cy - y * 20)),
    ) / 20;
}
