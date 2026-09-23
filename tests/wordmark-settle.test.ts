import { test } from "node:test";
import assert from "node:assert/strict";
import {
  magneticSettle,
  sampleSettle,
  coastSpin,
  clickImpulse,
} from "../src/components/Wordmark/settle";

test("magnetic settling preserves speed and direction and stops at the next half-orbit", () => {
  for (const angle of [-19, -6.28318, -0.00001, 0.00001, 1, 6.28318, 19]) {
    for (const velocity of [-36, -10, -0.1, 0.1, 10, 36]) {
      const motion = magneticSettle(angle, velocity, 100);
      assert.ok(motion.duration <= 650);
      assert.ok(Math.abs(motion.to - angle) <= Math.PI + 1e-10);
      assert.ok(Math.abs(motion.to / Math.PI - Math.round(motion.to / Math.PI)) < 1e-10);
      assert.ok(Math.abs(sampleSettle(motion, 100).velocity - velocity) < 1e-8);
      let previous = angle;
      for (let i = 1; i <= 100; i++) {
        const sample = sampleSettle(motion, 100 + (motion.duration * i) / 100);
        assert.ok((sample.angle - previous) * Math.sign(velocity) >= -1e-10);
        assert.ok((motion.to - sample.angle) * Math.sign(velocity) >= -1e-10);
        previous = sample.angle;
      }
      const end = sampleSettle(motion, 100 + motion.duration + 1);
      assert.ok(Math.abs(end.angle - motion.to) < 1e-8);
      assert.ok(Math.abs(end.velocity) < 1e-8);
      assert.equal(end.done, true);
    }
  }
});

test("single clicks finish promptly while rapid clicks accumulate a longer coast", () => {
  function run(clicks: number) {
    let angle = 0, velocity = 0, elapsed = 0;
    for (let i = 0; i < clicks; i++) velocity = clickImpulse(velocity, 1);
    for (;;) {
      const state = coastSpin(angle, velocity, 1 / 120);
      angle = state.angle; velocity = state.velocity; elapsed += 1000 / 120;
      if (state.settling) {
        const settle = magneticSettle(angle, velocity, elapsed);
        return { duration: elapsed + settle.duration, angle: settle.to, settleDuration: settle.duration };
      }
    }
  }
  const single = run(1), repeated = run(6);
  assert.equal(single.angle, Math.PI);
  assert.ok(single.duration < 850);
  assert.ok(single.settleDuration > 400);
  assert.ok(repeated.duration > single.duration + 700);
  assert.ok(repeated.angle > single.angle);
  assert.equal(clickImpulse(-10, -1), -15);
});
