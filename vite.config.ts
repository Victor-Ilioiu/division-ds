import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig, type Plugin } from 'vitest/config'
import { injectExampleSources } from './scripts/lib/doc-examples.mjs'

/** Hands every `<Example>` on a component docs page its own children as a `source` string, so
 *  the page can show the code it is rendering. Runs before the React plugin, on the TSX as
 *  written. The same extractor feeds scripts/build-agent-docs.mjs. */
function exampleSources(): Plugin {
  return {
    name: 'example-sources',
    enforce: 'pre',
    transform(code, id) {
      const file = id.split('?')[0]
      if (!/src[\/]components[\/].+Docs\.tsx$/.test(file) || !code.includes('<Example')) return null
      return { code: injectExampleSources(code, file), map: null }
    },
  }
}

// https://vite.dev/config/
export default defineConfig({
  // Serve from a sub-path when the deploy asks for one (DIVISION_BASE=/systems/division-ds/).
  // Default '/', so dev, unit and e2e runs are unchanged. src/lib/base-path.ts covers the rest.
  base: process.env.DIVISION_BASE ?? '/',
  plugins: [exampleSources(), react(), tailwindcss()],
  server: {
    port: 5473,
    strictPort: true,
    // Off only on the dedicated e2e server (DIVISION_E2E=1, playwright.config.ts): a live reload
    // firing mid-test is a source of flakes that have nothing to do with the assertion running,
    // and e2e never edits files during a run. `npm run dev` keeps HMR.
    hmr: process.env.DIVISION_E2E ? false : undefined,
  },
  optimizeDeps: {
    include: [
      'react',
      'react-dom/client',
      'react-router-dom',
      'radix-ui',
      'lucide-react',
      'class-variance-authority',
      'clsx',
      'tailwind-merge',
      'recharts',
      'lenis',
      '@dnd-kit/core',
      '@dnd-kit/sortable',
      '@dnd-kit/utilities',
    ],
  },
  test: {
    environment: 'jsdom',
    exclude: ['node_modules/**', 'e2e/**', '.claude/**'],
    setupFiles: ['src/test/setup.ts'],
  },
})
