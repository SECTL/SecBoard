import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import react from '@vitejs/plugin-react'
import autoprefixer from 'autoprefixer'
import tailwindcss from 'tailwindcss'
import { defineConfig } from 'vite'

const rootDir = dirname(fileURLToPath(import.meta.url))
const rendererRoot = resolve(rootDir, 'src/renderer')
const pkg = JSON.parse(readFileSync(resolve(rootDir, 'package.json'), 'utf-8')) as { version?: unknown; lanstartCodename?: unknown }

const BACKEND_PORT = Number(process.env.BACKEND_PORT ?? 3131)

export default defineConfig({
  root: rendererRoot,
  envDir: rootDir,
  plugins: [react()],
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version ?? '0.0.0'),
    __APP_CODENAME__: JSON.stringify(typeof pkg.lanstartCodename === 'string' ? pkg.lanstartCodename : 'Viweivi')
  },
  css: {
    postcss: {
      plugins: [tailwindcss({ config: resolve(rootDir, 'src/Tailwind/tailwind.config.cjs') }), autoprefixer()]
    }
  },
  server: {
    fs: {
      allow: [resolve(rootDir, 'src')]
    },
    proxy: {
      '/rpc': {
        target: `http://127.0.0.1:${BACKEND_PORT}`,
        changeOrigin: true
      },
      '/events': {
        target: `http://127.0.0.1:${BACKEND_PORT}`,
        changeOrigin: true
      },
      '/kv': {
        target: `http://127.0.0.1:${BACKEND_PORT}`,
        changeOrigin: true
      },
      '/ui': {
        target: `http://127.0.0.1:${BACKEND_PORT}`,
        changeOrigin: true
      },
      '/dialog': {
        target: `http://127.0.0.1:${BACKEND_PORT}`,
        changeOrigin: true
      },
      '/img': {
        target: `http://127.0.0.1:${BACKEND_PORT}`,
        changeOrigin: true
      },
      '/cunox': {
        target: `http://127.0.0.1:${BACKEND_PORT}`,
        changeOrigin: true
      },
      '/webrtc': {
        target: `http://127.0.0.1:${BACKEND_PORT}`,
        changeOrigin: true
      },
      '/health': {
        target: `http://127.0.0.1:${BACKEND_PORT}`,
        changeOrigin: true
      }
    }
  },
  build: {
    outDir: resolve(rootDir, 'dist/web'),
    emptyOutDir: true
  }
})
