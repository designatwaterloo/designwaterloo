import { test } from "node:test";
import assert from "node:assert/strict";
import { frameAtAngle } from "../src/components/Wordmark/frames";
import frames from "../src/components/Wordmark/orbit-frames.json";

test("every half-orbit rests on the same closed geometry", () => {
  assert.equal(frames[0], frames.at(-1));
  for (let turns = -20; turns <= 20; turns++) {
    assert.equal(frames[frameAtAngle(turns * Math.PI, frames.length)], frames[0]);
    assert.equal(frameAtAngle(turns * Math.PI + 0.8, frames.length), frameAtAngle(0.8, frames.length));
  }
});

test("signed momentum traverses a single half-orbit in either direction", () => {
  for (let i = 1; i < frames.length - 1; i++) {
    const angle = (i / (frames.length - 1)) * Math.PI;
    assert.equal(frameAtAngle(angle, frames.length), i);
    assert.equal(frameAtAngle(-angle, frames.length), frames.length - 1 - i);
  }
});

test("the bridge converges to the original SVG from both spin directions", async () => {
  const { default: sharp } = await import("sharp");
  const { wordmarks } = await import("../src/components/Wordmark/paths");
  const mark = wordmarks.horizontal;
  async function render(body: string) {
    return sharp(Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="480" height="300" viewBox="0 0 96 60">${body}</svg>`))
      .flatten({ background: "white" }).removeAlpha().raw().toBuffer();
  }
  const original = await render(`<g transform="translate(${48 - mark.cx} ${30 - mark.cy})">${mark.oo}</g>`);
  for (const index of [0, 1, frames.length - 2, frames.length - 1]) {
    const raster = await render(`<path fill-rule="evenodd" d="${frames[index]}"/>`);
    let difference = 0;
    for (let pixel = 0; pixel < original.length; pixel++) {
      difference += Math.abs(original[pixel] - raster[pixel]);
    }
    // At 5× scale, even the frame before rest must already match closely.
    assert.ok(difference / original.length < 1, `visible endpoint seam at frame ${index}`);
  }
});
