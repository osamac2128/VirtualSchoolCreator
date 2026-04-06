import { defineConfig } from 'vitest/config'
import { resolve } from 'path'

export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
    include: [
      'src/lib/security/**/*.test.ts',
      'src/app/api/ingest/route.test.ts',
      'src/app/api/gap-analysis/route.test.ts',
    ],
    alias: {
      '@': resolve(__dirname, './src'),
    },
  },
})
