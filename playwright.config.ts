import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  timeout: 180_000,
  // Every browser creates a Pyodide runtime. Shared GitHub runners can starve
  // kernels when several ML-heavy scenarios start together, so CI runs them
  // serially while local development keeps Playwright's normal parallelism.
  workers: process.env.CI ? 1 : undefined,
  use: {
    baseURL: "http://127.0.0.1:8000",
    trace: "retain-on-failure",
    actionTimeout: 30_000,
  },
  webServer: {
    command: "npm run serve",
    url: "http://127.0.0.1:8000/lab/index.html",
    reuseExistingServer: false,
  },
});
