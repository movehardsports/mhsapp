import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Pages, layouts, Server Actions and components reach the database only through the data
  // functions in src/lib/<domain>/ (queries.ts, mutations.ts). This flags any `.from()` or
  // `.rpc()` call (Supabase tables, functions and storage) except on the built-ins listed;
  // auth calls (supabase.auth) are fine.
  {
    files: ["src/app/**", "src/components/**"],
    rules: {
      "no-restricted-syntax": [
        "error",
        {
          selector:
            "CallExpression[callee.property.name=/^(from|rpc)$/]:not([callee.object.name=/^(Array|Buffer|Uint8Array)$/])",
          message:
            "Read and write data through the functions in src/lib/<domain>/ (queries.ts, mutations.ts).",
        },
      ],
    },
  },
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
