import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'node',
    globals: true,
    include: [
      'src/lib/supabase/middleware.test.ts',
      'src/lib/ai/course-graph.test.ts',
    ],
    alias: {
      '@': resolve(__dirname, './src'),
    },
  },
})
