import { defineConfig } from 'vite'

export default defineConfig({
  publicDir: false,
  ssr: { noExternal: true },
  build: {
    ssr: 'server/index.ts',
    outDir: 'dist-ssr',
    target: 'node22',
    minify: false,
    rolldownOptions: { output: { entryFileNames: 'index.mjs' } },
  },
})
