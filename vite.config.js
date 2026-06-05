import { createRequire } from 'node:module'
import { defineConfig } from 'vite'

const require = createRequire(import.meta.url)
const uni = require('E:/HBuilderX/plugins/uniapp-cli-vite/node_modules/@dcloudio/vite-plugin-uni')

export default defineConfig({
  plugins: [uni.default ? uni.default() : uni()],
  cacheDir: `unpackage/dist/cache/.vite-${process.pid}`,
  server: {
    port: 5173,
    strictPort: false
  }
})
