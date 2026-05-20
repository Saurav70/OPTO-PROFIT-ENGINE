import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor-react': ['react', 'react-dom'],
          'vendor-ui': ['recharts', '@xyflow/react', 'lucide-react', 'framer-motion'],
          'vendor-utils': ['mathjs', 'pdf-parse', 'pdfjs-dist']
        }
      }
    },
    chunkSizeWarningLimit: 1000
  }
})
