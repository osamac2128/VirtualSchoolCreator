import type { KnipConfig } from 'knip'

const config: KnipConfig = {
  entry: [
    'src/app/**/{page,layout,route,middleware}.{ts,tsx}',
    'src/inngest/functions.ts',
    'src/inngest/client.ts',
    'prisma/seed.ts',
  ],
  project: ['src/**/*.{ts,tsx}'],
  ignore: [
    '.next/**',
    'node_modules/**',
    'coverage/**',
    'playwright-report/**',
    '**/*.test.{ts,tsx}',
    '**/*.spec.{ts,tsx}',
    'vitest.config.ts',
    'playwright.config.ts',
  ],
  ignoreDependencies: [
    // Used by Next.js build system, not explicit imports
    '@tailwindcss/postcss',
    'tw-animate-css',
    // Prisma CLI used via npm scripts
    'prisma',
    // shadcn CLI
    'shadcn',
  ],
}

export default config
