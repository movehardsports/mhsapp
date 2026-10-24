import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // ESLint doesn't read .gitignore: list build output and test artefacts here.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Playwright and Supabase CLI output:
    "playwright-report/**",
    "test-results/**",
    "supabase/.temp/**",
  ]),
]);

export default eslintConfig;
