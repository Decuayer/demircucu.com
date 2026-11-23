/** Runs on staged files in the pre-commit hook. */
const config = {
  "*.{ts,tsx,mjs,js}": ["eslint --max-warnings 0 --fix", "prettier --write"],
  "*.{json,md,css,yml,yaml}": ["prettier --write"],
  "prisma/schema.prisma": () => "prisma format",
};

export default config;
