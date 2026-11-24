import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  resolve: {
    tsconfigPaths: true,
    alias: {
      "server-only": fileURLToPath(new URL("./tests/setup/server-only-stub.ts", import.meta.url)),
    },
  },
  test: {
    projects: [
      {
        extends: true,
        test: {
          name: "unit",
          environment: "jsdom",
          include: ["**/*.test.{ts,tsx}"],
          exclude: [
            "node_modules/**",
            ".next/**",
            "e2e/**",
            "**/*.int.test.ts",
            "**/*.supabase.test.ts",
          ],
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
      {
        extends: true,
        test: {
          name: "supabase",
          environment: "node",
          include: ["tests/supabase/**/*.supabase.test.ts"],
          globalSetup: ["./tests/supabase/global-setup.ts"],
          fileParallelism: false,
          testTimeout: 30_000,
          hookTimeout: 120_000,
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
        lines: 15.59,
        statements: 16.91,
        functions: 13.46,
        branches: 19.05,
      },
    },
  },
});
