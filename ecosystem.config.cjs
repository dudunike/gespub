// PM2 — Gerenciador de processos para VPS
// Instalar PM2: npm install -g pm2
// Iniciar:      pm2 start ecosystem.config.cjs
// Salvar:       pm2 save && pm2 startup

module.exports = {
  apps: [
    {
      name:        'gespub-api',
      script:      './server/index.js',
      instances:   2,            // 2 processos em cluster (ajuste conforme CPUs)
      exec_mode:   'cluster',
      max_memory_restart: '512M',
      env: {
        NODE_ENV:                 'production',
        PORT:                     3000,
        // Adicione suas variáveis de ambiente aqui ou use .env.production
        SUPABASE_URL:             process.env.SUPABASE_URL,
        SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
        CRON_SECRET:              process.env.CRON_SECRET,
        CRONJOB_API_KEY:          process.env.CRONJOB_API_KEY,
        CRONJOB_BASE_URL:         process.env.CRONJOB_BASE_URL,
        GEMINI_API_KEY:           process.env.GEMINI_API_KEY,
        WEBHOOK_SECRET:           process.env.WEBHOOK_SECRET,
      },
      error_file:  './logs/err.log',
      out_file:    './logs/out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss',
      watch:       false,
      autorestart: true,
      restart_delay: 3000,
    },
  ],
}
