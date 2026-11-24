import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";
import prettier from "eslint-config-prettier/flat";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    rules: {
      "@typescript-eslint/no-explicit-any": "error",
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_", caughtErrorsIgnorePattern: "^_" },
      ],
      "@typescript-eslint/consistent-type-imports": [
        "warn",
        { prefer: "type-imports", fixStyle: "inline-type-imports" },
      ],
      "no-console": ["warn", { allow: ["warn", "error"] }],
    },
  },
  {
    // Seed and maintenance scripts are CLI tools; console output is intended.
    files: ["prisma/**", "scripts/**", "tests/**"],
    rules: { "no-console": "off" },
  },
  // Must stay last: turns off stylistic rules that conflict with Prettier.
  prettier,
  globalIgnores([
    ".next/**",
    "out/**",
    "build/**",
    "coverage/**",
    // Copied from pdfjs-dist by scripts/copy-pdfjs-assets.mjs.
    "public/pdfjs/**",
    "playwright-report/**",
    "test-results/**",
    "lib/generated/**",
    "next-env.d.ts",
  ]),
]);

export default eslintConfig;
