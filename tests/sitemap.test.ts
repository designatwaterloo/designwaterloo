import test from "node:test";
import assert from "node:assert/strict";
import sitemap from "../src/app/sitemap";
import { SITE_URL } from "../src/lib/site-url";

test("sitemap exposes only site pages, never individual member profiles", () => {
  assert.deepEqual(sitemap().map((entry) => entry.url), [
    `${SITE_URL}/`, `${SITE_URL}/about`, `${SITE_URL}/directory`,
  ]);
});
