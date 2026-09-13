import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'
import tsconfigPaths from 'vite-tsconfig-paths'
import { TanStackRouterVite } from '@tanstack/router-plugin/vite'

export default defineConfig({
  plugins: [TanStackRouterVite(), react(), tsconfigPaths()],
  base: '/',
  build: {
    outDir: 'dist',
    target: 'es2020',
    minify: 'terser',
  },
  server: {
    port: 5173,
  },
})
