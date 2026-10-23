import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  timeout: 180_000,
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
