import { resolve } from 'path'
import { defineConfig } from 'vite'
import { readdirSync, statSync, existsSync } from 'fs'

const __dirname = import.meta.dirname

export default defineConfig({
  root: '.',
  server: {
    open: true,
    port: 5173,
  },
  build: {
    rollupOptions: {
      input: getInputs()
    }
  }
})

function getInputs() {
  const inputs = { main: resolve(__dirname, 'index.html') }
  const dirs = readdirSync(__dirname).filter(f => {
    const full = resolve(__dirname, f)
    return statSync(full).isDirectory() && /^\d{2}-/.test(f)
  })
  dirs.forEach(dir => {
    const html = resolve(__dirname, dir, 'index.html')
    if (existsSync(html)) {
      inputs[dir] = html
    }
  })
  return inputs
}
