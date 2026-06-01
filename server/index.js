/**
 * GesPub.ai — Express Server para VPS
 * Serve o frontend React + rotas de API
 *
 * Instalar: npm install express
 * Rodar:    pm2 start ecosystem.config.cjs
 */

import express from 'express'
import path from 'path'
import { fileURLToPath } from 'url'
import { createServer } from 'http'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const app  = express()
const PORT = process.env.PORT || 3000

app.use(express.json())
app.use(express.urlencoded({ extended: true }))

// ── Importa e registra as API routes ──────────────────────────────────────────

async function loadRoute(name) {
  const mod = await import(`../api/${name}.js`)
  return mod.default
}

// Registra cada rota de API
async function registerRoutes() {
  const routes = ['run-agents', 'manage-agent-cron', 'insights-ai']

  for (const name of routes) {
    try {
      const handler = await loadRoute(name)
      app.all(`/api/${name}`, (req, res) => {
        // Simula interface Vercel (req, res)
        return handler(req, res)
      })
      console.log(`✅ Rota /api/${name} registrada`)
    } catch (err) {
      console.warn(`⚠️  Rota /api/${name} não carregada: ${err.message}`)
    }
  }
}

// ── Serve o frontend React (build estático) ───────────────────────────────────

const distPath = path.resolve(__dirname, '../dist')
app.use(express.static(distPath))

// SPA fallback — todas as rotas não-API vão para index.html
app.get('*', (req, res) => {
  if (!req.path.startsWith('/api/')) {
    res.sendFile(path.join(distPath, 'index.html'))
  }
})

// ── Inicializa ────────────────────────────────────────────────────────────────

registerRoutes().then(() => {
  createServer(app).listen(PORT, () => {
    console.log(`\n🚀 GesPub.ai rodando na porta ${PORT}`)
    console.log(`   Frontend: http://localhost:${PORT}`)
    console.log(`   API:      http://localhost:${PORT}/api/run-agents\n`)
  })
}).catch(console.error)
