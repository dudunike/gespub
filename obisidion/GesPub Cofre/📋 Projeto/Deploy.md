---
título: Deploy & Infraestrutura
atualizado: 2026-06-01 02:00
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

## Variáveis de Ambiente (Vercel)

| Variável | Onde pegar |
|----------|-----------|
| `SUPABASE_URL` | Supabase → Settings → API |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase → Settings → API → service_role |
| `CRON_SECRET` | `gespub-cron-2026` (qualquer string) |
| `CRONJOB_API_KEY` | cron-job.org → Settings → API Keys |
| `CRONJOB_BASE_URL` | `https://gespub.online` |
| `GEMINI_API_KEY` | aistudio.google.com → Get API key |
| `WEBHOOK_SECRET` | string aleatória compartilhada com plataforma de pagamento |

---

## API Endpoints (Vercel Serverless / VPS Express)

| Endpoint | Método | Descrição | Auth |
|----------|--------|-----------|------|
| `/api/run-agents` | GET/POST | Executa agentes (cron) | x-cron-secret |
| `/api/manage-agent-cron` | POST | Cria/atualiza/deleta cron jobs | Supabase JWT |
| `/api/insights-ai` | POST | Gera insights com Gemini | Supabase JWT |
| `/api/webhook-payment` | POST | Provisiona acesso ao pagar | x-webhook-secret |

---

## Fluxo de Acesso (Sem cadastro público)

```
Usuário paga plano (Stripe/Hotmart/Kiwify)
  → plataforma envia webhook para /api/webhook-payment
  → sistema cria conta Supabase automaticamente
  → envia e-mail com link para definir senha
  → usuário acessa gespub.online e entra com e-mail + senha
```

---

## VPS — Quando migrar

### Quando migrar
- 200+ usuários ativos
- Agentes com muitas regras complexas (>10s de execução)
- Necessidade de cache Redis para Meta API
- WebSockets para notificações instantâneas

### Requisitos mínimos de VPS
- 2 vCPUs, 4GB RAM (ex: Hetzner CX21 — €5/mês)
- Ubuntu 22.04 LTS
- Node.js 20+, PM2, Nginx, Certbot

### Migração (passos)
```bash
# 1. No servidor VPS
git clone https://github.com/dudunike/gespub.git
cd gespub
npm install
npm run build

# 2. Criar .env.production com todas as variáveis

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

### Cron no VPS (sem cron-job.org)
```bash
# Adicionar ao crontab do servidor
crontab -e
# Agentes a cada 30 minutos:
*/30 * * * * curl -s -H "x-cron-secret: SUA_SECRET" https://gespub.online/api/run-agents
```

---

## Rotas da Aplicação

### Públicas
| Rota | Componente |
|------|-----------|
| `/` | Login (somente email+senha, acesso por assinatura) |
| `/politica-de-privacidade` | PrivacyPolicy |
| `/termos-de-uso` | TermsOfUse |

### Plataforma (autenticado)
| Rota | Componente |
|------|-----------|
| `/dashboard` | Dashboard (métricas reais Meta) |
| `/campanhas` | Campaigns (CRUD + insights) |
| `/conjuntos` | AdSets |
| `/anuncios` | Ads |
| `/agentes` | Agents (IA automática via cron-job.org) |
| `/regras` | Rules |
| `/insights` | Insights (análise Gemini 1.5 Flash) |
| `/conexoes` | Connections (OAuth Meta redirect) |

### Admin
| Rota | Componente |
|------|-----------|
| `/admin` | Overview |
| `/admin/usuarios` | Users (criar, bloquear, alterar plano) |
| `/admin/logs` | Logs |
