import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";
import security from "eslint-plugin-security";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Security rules
  {
    plugins: { security },
    rules: {
      ...security.configs.recommended.rules,
      // Flag object injection via bracket notation with dynamic keys
      "security/detect-object-injection": "warn",
      // Flag potential ReDoS patterns
      "security/detect-unsafe-regex": "error",
      // Flag non-literal regexes
      "security/detect-non-literal-regexp": "warn",
      // Flag eval and eval-like usage
      "security/detect-eval-with-expression": "error",
      // No unused variables (catches dead code)
      "@typescript-eslint/no-unused-vars": ["error", { argsIgnorePattern: "^_" }],
      // No explicit any (forces proper typing)
      "@typescript-eslint/no-explicit-any": "warn",
    },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    "node_modules/**",
    "coverage/**",
    "playwright-report/**",
  ]),
]);

export default eslintConfig;
