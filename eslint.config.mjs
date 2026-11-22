// Konfigurasi ESLint: aturan Next.js (core web vitals dan TypeScript) dengan folder build diabaikan.

import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

// Aturan lint: preset Next.js (core web vitals dan TypeScript) dengan pengabaian folder hasil build.
const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    "_archive_docs/**",
    ".agents/**",
    ".claude/**",
    ".omp/**",
  ]),
]);

export default eslintConfig;
