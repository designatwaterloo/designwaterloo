// The two identical O’s repeat visually every half-orbit.
export const ORBIT_STEP = Math.PI;

export function magneticSettle(from: number, velocity: number, start: number) {
  const direction = velocity < 0 ? -1 : 1;
  const to =
    direction > 0
      ? (Math.floor(from / ORBIT_STEP) + 1) * ORBIT_STEP
      : (Math.ceil(from / ORBIT_STEP) - 1) * ORBIT_STEP;
  const distance = Math.abs(to - from);
  // Match incoming speed, then ease to zero without overshoot or reversal.
  // Limiting the endpoint slope to three keeps this Hermite curve monotonic.
  const duration = Math.min(
    650,
    420 + (230 * distance) / ORBIT_STEP,
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

// Capture a light click early; a stack of clicks must coast down first.
export function coastSpin(angle: number, velocity: number, seconds: number) {
  const drag = Math.exp(-1.6 * seconds);
  return {
    angle: angle + (velocity * (1 - drag)) / 1.6,
    velocity: velocity * drag,
    settling: Math.abs(velocity * drag) < 3.8,
  };
}

export function clickImpulse(velocity: number, direction: number) {
  const momentum = Math.sign(velocity) === direction ? Math.abs(velocity) : Math.abs(velocity) * 0.5;
  return direction * Math.min(36, momentum + 5);
}
