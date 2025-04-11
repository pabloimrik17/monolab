import { defineConfig } from 'vite'
import solid from 'vite-plugin-solid'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))

export default defineConfig({
  plugins: [solid()],

  resolve: {
    alias: {
      '@monolab/is-odd': resolve(__dirname, '../../packages/is-odd/src/index.ts'),
      '@monolab/is-even': resolve(__dirname, '../../packages/is-even/src/index.ts')
    }
  }
})
