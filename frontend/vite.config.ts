import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@shared': path.resolve(__dirname, '../shared'),
      '@mangala/shared': path.resolve(__dirname, '../shared/index.ts'),
    },
  },
  server: {
    host: true,
    port: 5173,
    fs: {
      allow: [path.resolve(__dirname, '..')],
    },
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/lib/test-setup.ts'],
  },
})
