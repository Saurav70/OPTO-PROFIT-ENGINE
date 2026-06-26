import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  // Use relative paths so the app works when loaded from file:// in Electron
  base: './',
  plugins: [react()],
  optimizeDeps: {
    include: [
      'react',
      'react-dom',
      'framer-motion',
      'lucide-react',
      '@xyflow/react',
      'recharts',
      'mathjs'
    ]
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor-react': ['react', 'react-dom'],
          'vendor-motion': ['framer-motion'],
          'vendor-icons': ['lucide-react'],
        }
      }
    },
    chunkSizeWarningLimit: 1000
  },
  test: {
    // Use jsdom to simulate a browser DOM environment for React component tests
    environment: 'jsdom',
    // Make describe/it/expect/vi available globally without imports
    globals: true,
    // Run setup file before each test file (extends expect with jest-dom matchers)
    setupFiles: ['./src/test/setup.js'],
    // Include both utility unit tests and component snapshot tests
    include: [
      'src/utils/**/*.test.{js,jsx}',
      'src/components/**/*.test.{js,jsx}',
    ],
    // Snapshot directory — stored alongside the test files
    snapshotOptions: {
      snapshotFormat: { printBasicPrototype: false },
    },
  }
})
