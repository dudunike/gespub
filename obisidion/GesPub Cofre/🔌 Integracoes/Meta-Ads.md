---
título: Integração Meta Ads
atualizado: 2026-06-03
status: funcional (app novo precisa ir para modo Live)
---

# Integração Meta Ads

## Status atual
✅ **OAuth redirect flow funcionando**

⚠️ **AÇÃO NECESSÁRIA:** App `2072345476678142` está em modo **Desenvolvimento**.  
Acesse [developers.facebook.com/apps/2072345476678142](https://developers.facebook.com/apps/2072345476678142) → **Alternar para Modo Ao Vivo**.  
Em modo Dev, apenas o dono do app consegue conectar (demais usuários veem "Aplicativo inativo").

---

## Credenciais do App

| Campo      | Valor                              |
|------------|------------------------------------|
| App ID     | `2072345476678142` (novo, verificado) |
| App Name   | GesPub                             |
| Status     | ⚠️ Development Mode — precisa ativar para Live |

> **App Secret** — guardado apenas localmente, NUNCA no código ou repositório.

## Scope OAuth (atualizado)
`ads_management, pages_show_list, pages_read_engagement, instagram_basic`

Permite: gerenciar anúncios, listar páginas + fan_count, seguidores do Instagram Business.

---

## Fluxo de Autenticação (OAuth 2.0 Implicit Flow)

```
Usuário → clica "Conectar com Facebook"
  → MetaContext.startConnectRedirect()
  → Redireciona para:
     https://www.facebook.com/dialog/oauth
       ?client_id=2456845514766257
       &redirect_uri=https://gespub.online/conexoes
       &scope=ads_management,pages_read_engagement
       &response_type=token
  → Facebook autentica e redireciona de volta:
     https://gespub.online/conexoes#access_token=TOKEN&...
  → Connections.jsx detecta o hash no mount
  → getAdAccounts(token) → lista contas de anúncios
  → Usuário seleciona conta (ou salva direto se só tiver 1)
  → saveConnection() → Supabase meta_connections
  → isConnected = true ✅
```

---

## Configuração no Meta for Developers

### Login do Facebook → Configurações

| Campo | Valor |
|-------|-------|
| URIs de redirecionamento OAuth válidos | `https://gespub.online/conexoes` |
| Domínios permitidos para o SDK do JavaScript | `gespub.online` |
| Login do OAuth na Web | Sim |
| Forçar HTTPS | Sim |
| Entrar com o SDK do JavaScript | Sim |

---

## Escopos de Permissão

| Scope | Uso |
|-------|-----|
| `ads_management` | Leitura e edição de campanhas, orçamentos, status |
| `pages_read_engagement` | Leitura de páginas vinculadas ao BM |

---

## API Graph — Versão e Endpoints

**Versão:** `v21.0`

| Endpoint | Método | Descrição |
|----------|--------|-----------|
| `/me/adaccounts` | GET | Listar contas de anúncios |
| `/{accountId}/campaigns` | GET | Listar campanhas |
| `/{accountId}/insights` | GET | Métricas (campaign/adset/ad) |
| `/{accountId}/adsets` | GET | Conjuntos de anúncios |
| `/{accountId}/ads` | GET | Anúncios com criativos |
| `/{campaignId}` | POST | Pausar/ativar/atualizar orçamento |
| `/{adSetId}` | POST | Pausar/ativar/atualizar orçamento |
| `/{adId}` | POST | Pausar/ativar anúncio |

**Autenticação:** `Authorization: Bearer TOKEN` (header HTTP)

---

## Armazenamento do Token

Tabela `meta_connections` no Supabase:
```sql
user_id      uuid    -- FK para auth.users
access_token text    -- User Access Token da Meta
account_id   text    -- ex: "act_123456789"
account_name text
currency     text    -- BRL, USD, GBP...
token_expires_at timestamptz -- null = sem expiração conhecida
connected_at timestamptz
```

RLS ativa: cada usuário vê/altera apenas a própria conexão.

---

## Para Publicar o App (todos os usuários)

1. Meta for Developers → **Publicar** → Iniciar verificação
2. Solicitar permissão `ads_management` com justificativa
3. Enviar: vídeo demonstrativo + política de privacidade + termos de uso
4. Aguardar aprovação (5–15 dias úteis)

Até a aprovação: adicionar usuários de teste em **Funções do app → Usuários de teste**.
