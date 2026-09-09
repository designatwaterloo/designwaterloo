import { ORBIT_STEP } from "./settle";

// One uniformly sampled half-orbit closes onto the original artwork. Signed
// angles play the same frames forward or backward without changing momentum.
export function frameAtAngle(angle: number, count: number) {
  const phase = ((angle % ORBIT_STEP) + ORBIT_STEP) % ORBIT_STEP;
  return Math.round((phase / ORBIT_STEP) * (count - 1));
}
