---
título: Integração Meta Ads
atualizado: 2026-06-04
status: publicado — App Review em andamento
---

# Integração Meta Ads

## Status atual

✅ **App publicado (modo Live)**
✅ **OAuth redirect flow funcionando**
✅ **Múltiplas contas por plano implementado**
⚠️ **App Review pendente** — permissões `ads_management` e demais estão em "Pronto para teste" (só admin e testadores conseguem conectar até aprovação)

---

## Credenciais do App

| Campo      | Valor                              |
|------------|------------------------------------|
| App ID     | `2072345476678142`                 |
| App Name   | APP DO DUDU                        |
| Status     | ✅ Live (publicado)                |
| App Review | ⏳ Pendente — permissões em "Acesso padrão" |

> **App Secret** — guardado apenas no servidor como `META_APP_SECRET`. NUNCA no código ou repositório.

---

## Scope OAuth

`ads_management, pages_show_list, pages_read_engagement`

| Scope | Status App Review |
|-------|------------------|
| `ads_management` | ⏳ Pronto para teste (precisa Acesso Avançado) |
| `ads_read` | ⏳ Pronto para teste |
| `business_management` | ⏳ Pronto para teste |
| `pages_show_list` | ⏳ Pronto para teste |
| `pages_read_engagement` | ⏳ Pronto para teste |

**Para liberar para todos os usuários:** Casos de uso → "Criar e gerenciar anúncios com a API de Marketing" → Ações → **Solicitar acesso avançado** para cada permissão.

---

## Fluxo de Autenticação (OAuth 2.0 Implicit Flow)

```
Usuário → clica "Conectar com Facebook"
  → MetaContext.startConnectRedirect()
  → Redireciona para:
     https://www.facebook.com/dialog/oauth
       ?client_id=2072345476678142
       &redirect_uri=https://gespub.online/conexoes
       &scope=ads_management,pages_show_list,pages_read_engagement
       &response_type=token
  → Facebook autentica e redireciona de volta:
     https://gespub.online/conexoes#access_token=TOKEN&...
  → Connections.jsx detecta o hash no mount
  → getAdAccounts(token) → lista contas de anúncios
  → Usuário seleciona conta (ou salva direto se só tiver 1)
  → saveConnection() → Supabase meta_connections (is_active=true)
  → isConnected = true ✅
```

---

## Múltiplas Contas por Plano

Implementado em 2026-06-04. Cada usuário pode ter N contas conectadas conforme o plano:

| Plano | Contas Meta |
|-------|-------------|
| Básico | 1 |
| Pro | 3 |
| Avançado | 5 |
| Enterprise | Ilimitado |
| Admin | Ilimitado |

**UI em /conexoes:**
- Badge de plano mostrando "X/N contas"
- Conta ativa destacada com borda brand + badge "Ativa"
- "Usar esta conta" para trocar a ativa
- "Trocar conta" (plano básico — remove a atual e reconecta)
- "Adicionar conta Meta" quando o plano permite mais
- Lixeira por conta para remover individualmente

---

## Configuração no Meta for Developers

### Login do Facebook → Configurações

| Campo | Valor |
|-------|-------|
| URIs de redirecionamento OAuth válidos | `https://gespub.online/conexoes` |
| Domínios permitidos para o SDK do JavaScript | `https://gespub.online/` |
| Login do OAuth na Web | Sim |
| Forçar HTTPS | Sim |
| Entrar com o SDK do JavaScript | Sim |

### Data Deletion Callback (obrigatório para App Review)

| Campo | Valor |
|-------|-------|
| URL de solicitação de exclusão de dados | `https://gespub.online/api/meta-deletion` |

Endpoint implementado em `api/meta-deletion.js` — verifica signed_request HMAC-SHA256 e deleta todos os dados do usuário no Supabase.

---

## API Graph — Versão e Endpoints

**Versão:** `v21.0`

| Endpoint | Método | Descrição |
|----------|--------|-----------|
| `/me/adaccounts` | GET | Listar contas de anúncios |
| `/{accountId}/campaigns` | GET | Listar campanhas |
| `/{accountId}/insights` | GET | Métricas (campaign/adset/ad) |
| `/{accountId}/adsets` | GET | Conjuntos de anúncios |
| `/{accountId}/ads` | GET | Anúncios com criativos (object_story_spec para imagem HD) |
| `/{campaignId}` | POST | Pausar/ativar/atualizar orçamento |
| `/{adId}` | POST | Pausar/ativar anúncio |

---

## Armazenamento do Token — Tabela `meta_connections`

```sql
id           uuid    -- PK
user_id      uuid    -- FK para auth.users
access_token text    -- User Access Token da Meta
account_id   text    -- ex: "act_123456789"
account_name text
currency     text    -- BRL, USD, GBP...
is_active    bool    -- conta ativa no momento (única por usuário)
token_expires_at timestamptz
connected_at timestamptz

UNIQUE (user_id, account_id)  -- permite múltiplas contas por usuário
```

RLS ativa: cada usuário vê/altera apenas as próprias conexões.

**Migration aplicada em 2026-06-04:** `meta_multi_accounts_migration.sql`

---

## App Review — Instruções de Teste

**URL do app:** `https://gespub.online`

1. Criar conta em gespub.online (e-mail + senha)
2. Acessar **Conexões** no menu lateral
3. Clicar em **"Conectar com Facebook"**
4. Autorizar: `ads_management`, `pages_show_list`, `pages_read_engagement`
5. Selecionar conta de anúncios
6. Verificar campanhas, anúncios e métricas nas seções correspondentes
7. Para desconectar: Conexões → ícone de lixeira → dados removidos

**Links obrigatórios:**
- Política de Privacidade: `https://gespub.online/politica-de-privacidade`
- Termos de Uso: `https://gespub.online/termos-de-uso`
- Data Deletion: `https://gespub.online/api/meta-deletion`
