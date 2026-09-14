import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    include: ["acceptance/cases/**/*.test.js"],
    globalSetup: ["acceptance/lib/image.js"],
    // Each case launches a container plus a chromium instance (~200MB).
    pool: "forks",
    fileParallelism: false,
    // A cold `docker build` has to fit in globalSetup.
    hookTimeout: 600_000,
    testTimeout: 120_000,
  },
});
