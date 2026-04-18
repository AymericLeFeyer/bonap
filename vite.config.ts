import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { readFileSync } from 'fs'
import { spawn } from 'child_process'

const { version } = JSON.parse(readFileSync('./package.json', 'utf-8'))

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd())

  const marmitonProxyPlugin = {
    name: 'bonap-marmiton-proxy',
    configureServer() {
      const child = spawn(
        process.platform === 'win32' ? 'node.exe' : 'node',
        ['ha-addon/bonap-bff.cjs'],
        {
          stdio: 'inherit',
          env: {
            ...process.env,
            PORT: process.env.PORT ?? '3001',
            OLLAMA_URL: env.LLM_OLLAMA_URL ?? '',
            OLLAMA_MODEL: env.LLM_MODEL ?? '',
          },
        },
      )

      const cleanup = () => {
        if (!child.killed) child.kill()
      }
      process.once('exit', cleanup)
      process.once('SIGINT', cleanup)
      process.once('SIGTERM', cleanup)
    },
  }

  return {
    plugins: [react(), tailwindcss(), marmitonProxyPlugin],
    define: {
      __APP_VERSION__: JSON.stringify(version),
    },
    base: './',
    server: {
      proxy: {
        '/api/bonap': {
          target: 'http://127.0.0.1:3001',
          changeOrigin: true,
          secure: false,
          rewrite: (path: string) => path.replace(/^\/api\/bonap/, ''),
        },
        '/api/ollama': {
          target: env.LLM_OLLAMA_URL || 'http://127.0.0.1:11434',
          changeOrigin: true,
          secure: false,
          rewrite: (path: string) => path.replace(/^\/api\/ollama/, ''),
        },
        '/api': {
          target: env.VITE_MEALIE_URL,
          changeOrigin: true,
          secure: false,
        },
      },
    },
  }
})
