import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Vite configuration for fast development and optimized production builds
export default defineConfig({
  plugins: [react()],
  build: {
    outDir: 'dist',
    sourcemap: true
  },
  server: {
    port: 3000,
    open: true
  }
})