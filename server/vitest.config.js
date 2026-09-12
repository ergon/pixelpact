import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    include: ["src/**/*.test.js"],
    // Tests spawn chromium; forks keep each file in its own process.
    pool: "forks",
    coverage: {
      provider: "v8",
      include: ["src/**/*.js"],
      exclude: ["src/**/*.test.js"],
    },
  },
});
