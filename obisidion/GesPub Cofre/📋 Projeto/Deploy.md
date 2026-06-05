---
título: Deploy & Infraestrutura
atualizado: 2026-06-04
status: produção (Vercel) | pronto para VPS
---

# Deploy & Infraestrutura

## Stack Atual

| Camada | Tecnologia |
|--------|-----------|
| Frontend | React 19 + Vite + Tailwind CSS |
| Hosting | Vercel (deploy automático via GitHub) |
| Domínio | gespub.online |
| Banco de dados | Supabase (PostgreSQL) |
| Autenticação | Supabase Auth |
| Storage | Supabase Storage (bucket `avatars`) |
| Realtime | Supabase Realtime (notificações) |
| Meta Ads API | Graph API v21.0 |
| Gemini AI | Google Gemini 1.5 Flash (Insights) |
| Cron scheduler | cron-job.org API (por agente, por frequência) |

---

## Variáveis de Ambiente

| Variável | Onde pegar |
|----------|-----------|
| `SUPABASE_URL` | Supabase → Settings → API |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase → Settings → API → service_role |
| `META_APP_SECRET` | Meta for Developers → Configurações do app → App Secret |
| `CRON_SECRET` | qualquer string secreta (ex: `gespub-cron-2026`) |
| `CRONJOB_API_KEY` | cron-job.org → Settings → API Keys |
| `CRONJOB_BASE_URL` | `https://gespub.online` |
| `GEMINI_API_KEY` | aistudio.google.com → Get API key |
| `WEBHOOK_SECRET` | string aleatória compartilhada com plataforma de pagamento |

---

## API Endpoints

| Endpoint | Método | Descrição | Auth |
|----------|--------|-----------|------|
| `/api/run-agents` | GET/POST | Executa agentes (cron) | x-cron-secret |
| `/api/manage-agent-cron` | POST | Cria/atualiza/deleta cron jobs | Supabase JWT |
| `/api/insights-ai` | POST | Gera insights com Gemini | Supabase JWT |
| `/api/meta-callback` | GET | OAuth code flow (server-side) | — |
| `/api/meta-deletion` | POST | Data deletion callback Meta (App Review) | signed_request HMAC |

---

## Migração de Banco Aplicada

### 2026-06-04 — Multi-conta Meta (`meta_multi_accounts_migration.sql`)

```sql
-- Adiciona is_active à tabela meta_connections
ALTER TABLE meta_connections ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT TRUE;
UPDATE meta_connections SET is_active = TRUE WHERE is_active IS NULL;
ALTER TABLE meta_connections DROP CONSTRAINT IF EXISTS meta_connections_user_id_key;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'meta_connections_user_account_key') THEN
    ALTER TABLE meta_connections ADD CONSTRAINT meta_connections_user_account_key UNIQUE (user_id, account_id);
  END IF;
END $$;
```

**Status:** ✅ Aplicado no Supabase em 2026-06-04

---

## VPS — Migração

### Quando migrar para VPS
- 200+ usuários ativos simultâneos
- Agentes com execuções complexas (>10s)
- Cache Redis para Meta API

### Passos de migração

```bash
# 1. No servidor VPS
git clone https://github.com/dudunike/gespub.git
cd gespub
npm install
npm run build

# 2. Criar arquivo .env com todas as variáveis acima

# 3. Iniciar com PM2
mkdir -p logs
pm2 start ecosystem.config.cjs
pm2 save && pm2 startup

# 4. Nginx
sudo cp nginx.conf /etc/nginx/sites-available/gespub
sudo ln -s /etc/nginx/sites-available/gespub /etc/nginx/sites-enabled/
sudo certbot --nginx -d gespub.online -d www.gespub.online
sudo nginx -t && sudo systemctl reload nginx
```

### Atualização após deploy inicial

```bash
git pull origin main
npm run build
pm2 restart gespub-api
```

---

## Rotas da Aplicação

### Públicas
| Rota | Componente |
|------|-----------|
| `/` | Login |
| `/politica-de-privacidade` | PrivacyPolicy |
| `/termos-de-uso` | TermsOfUse |

### Plataforma (autenticado)
| Rota | Componente |
|------|-----------|
| `/dashboard` | Dashboard (métricas reais Meta) |
| `/campanhas` | Campaigns |
| `/conjuntos` | AdSets |
| `/anuncios` | Ads (preview HD, filtros) |
| `/agentes` | Agents (IA automática) |
| `/regras` | Rules |
| `/insights` | Insights (Gemini) |
| `/conexoes` | Connections (múltiplas contas por plano) |

### Admin
| Rota | Componente |
|------|-----------|
| `/admin` | Overview |
| `/admin/usuarios` | Users |
| `/admin/logs` | Logs |
| `/admin/configuracoes` | Settings |
