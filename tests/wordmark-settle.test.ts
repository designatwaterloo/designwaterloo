import { test } from "node:test";
import assert from "node:assert/strict";
import {
  magneticSettle,
  sampleSettle,
} from "../src/components/Wordmark/settle";

test("magnetic settling preserves speed and direction and stops at the next full turn", () => {
  for (const angle of [-19, -6.28318, -0.00001, 0.00001, 1, 6.28318, 19]) {
    for (const velocity of [-36, -10, -0.1, 0.1, 10, 36]) {
      const motion = magneticSettle(angle, velocity, 100);
      assert.ok(motion.duration <= 420);
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
