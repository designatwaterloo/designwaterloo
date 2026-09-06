const TURN = Math.PI * 2;

export function magneticSettle(from: number, velocity: number, start: number) {
  const direction = velocity < 0 ? -1 : 1;
  const to =
    direction > 0
      ? (Math.floor(from / TURN) + 1) * TURN
      : (Math.ceil(from / TURN) - 1) * TURN;
  const distance = Math.abs(to - from);
  // Match incoming speed, then ease to zero without overshoot or reversal.
  // Limiting the endpoint slope to three keeps this Hermite curve monotonic.
  const duration = Math.min(
    420,
    180 + (240 * distance) / TURN,
    Math.abs(velocity) > 0 ? (3000 * distance) / Math.abs(velocity) : Infinity,
  );
  return { kind: "settle" as const, start, from, to, duration, velocity };
}

export function sampleSettle(
  motion: ReturnType<typeof magneticSettle>,
  now: number,
) {
  const t = Math.max(0, Math.min(1, (now - motion.start) / motion.duration));
  const seconds = motion.duration / 1000;
  const delta = motion.to - motion.from;
  const tangent = motion.velocity * seconds;
  return {
    angle:
      motion.from +
      delta * (3 * t * t - 2 * t * t * t) +
      tangent * (t * t * t - 2 * t * t + t),
    velocity:
      (delta * (6 * t - 6 * t * t) + tangent * (3 * t * t - 4 * t + 1)) /
      seconds,
    done: t === 1,
  };
}
