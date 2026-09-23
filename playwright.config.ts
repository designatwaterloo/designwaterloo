import { defineConfig, devices } from "@playwright/test";
const app = `http://localhost:${process.env.DW_TEST_APP_PORT || 3100}`;
export default defineConfig({
  testDir: "./tests/browser",
  fullyParallel: false,
  workers: 1,
  timeout: 60000,
  expect: { timeout: 15000 },
  retries: 0,
  use: {
    baseURL: app,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"], channel: "chromium" },
    },
  ],
  webServer: {
    command: "npx tsx tests/browser/server.ts",
    url: `${app}/sign-in`,
    reuseExistingServer: false,
    timeout: 120000,
  },
});
