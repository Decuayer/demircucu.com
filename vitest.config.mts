import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  resolve: { tsconfigPaths: true },
  test: {
    projects: [
      {
        extends: true,
        test: {
          name: "unit",
          environment: "jsdom",
          include: ["**/*.test.{ts,tsx}"],
          exclude: ["node_modules/**", ".next/**", "e2e/**", "**/*.int.test.ts"],
          setupFiles: ["./tests/setup/unit.ts"],
          restoreMocks: true,
        },
      },
      {
        extends: true,
        test: {
          name: "integration",
          environment: "node",
          include: ["**/*.int.test.ts"],
          exclude: ["node_modules/**", ".next/**"],
          setupFiles: ["./tests/setup/integration.ts"],
          globalSetup: ["./tests/setup/integration-global.ts"],
          // Integration tests share one database; run files sequentially.
          fileParallelism: false,
          testTimeout: 30_000,
          hookTimeout: 60_000,
        },
      },
    ],
    coverage: {
      provider: "v8",
      reporter: ["text", "html", "json-summary", "lcov"],
      include: ["lib/**/*.{ts,tsx}", "app/**/*.{ts,tsx}", "components/**/*.{ts,tsx}"],
      exclude: ["**/*.test.{ts,tsx}", "**/*.d.ts", "lib/generated/**", "components/ui/**"],
      // Coverage ratchet: CI fails if coverage drops below these floors. Local runs
      // (not CI) raise them automatically when coverage improves; commit the updated values.
      // Target floors (lib >= 85%, overall >= 70%) are enforced in phase 9.
      thresholds: {
        autoUpdate: process.env.CI
          ? false
          : (newThreshold: number) => Math.floor(newThreshold * 100) / 100,
        lines: 1.96,
        statements: 2.33,
        functions: 2.12,
        branches: 2.67,
      },
    },
  },
});
