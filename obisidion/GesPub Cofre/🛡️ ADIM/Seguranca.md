---
título: Segurança & Proteção de Dados
atualizado: 2026-06-01 01:00
status: implementado
---

# Segurança & Proteção de Dados

## Credenciais & Secrets

| Item | Status |
|------|--------|
| `.env` no `.gitignore` | ✅ Nunca vai para o git |
| App Secret no código | ✅ Removido — apenas no `.env` local |
| VITE_META_APP_SECRET | ✅ Deletado — nunca exposto |
| App ID no frontend | ✅ OK — é público por design |
| Supabase Anon Key | ✅ OK — é pública por design, protegida por RLS |

---

## Banco de Dados (Supabase RLS)

Todas as tabelas têm Row Level Security (RLS) ativa:

| Tabela | Política |
|--------|----------|
| `meta_connections` | Usuário acessa apenas a própria linha |
| `agents` | Usuário acessa apenas os próprios agentes |
| `profiles` | Usuário lê/edita apenas o próprio perfil; admin lê todos |
| `notifications` | Usuário acessa apenas as próprias notificações |
| `storage.avatars` | Upload apenas no path do próprio UUID |

---

## Autenticação Meta Ads

- **Fluxo:** OAuth 2.0 Implicit Flow (redirect, sem popup, sem JS SDK)
- **Token:** armazenado na tabela `meta_connections` por usuário
- **Validação:** `checkTokenValid()` verifica no boot se o token ainda funciona
- **Transmissão:** `Authorization: Bearer TOKEN` (header HTTP, não aparece em logs de URL)
- **Revogação:** usuário pode desconectar a qualquer momento (deleta o token do banco)

---

## Políticas Legais

- **Política de Privacidade:** `gespub.online/politica-de-privacidade`
- **Termos de Uso:** `gespub.online/termos-de-uso`
- Conformidade com LGPD (Lei 13.709/2018)
- Conformidade com Meta Platform Terms

---

## Armazenamento de Fotos

- Bucket `avatars` no Supabase Storage
- Acesso público para leitura (URLs públicas)
- Upload restrito: usuário só faz upload no path `{user_id}.{ext}`
- Tamanho máximo: 2 MB por foto
