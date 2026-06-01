---
título: Arquitetura
atualizado: 2026-05-31 17:00
status: concluído
---

# Arquitetura

## Resumo
Este documento descreve a arquitetura geral da plataforma SaaS GESPUB.AI, dividida nos ambientes de Cliente (Plataforma) e Administração (ADIM), e o fluxo de dados e roteamento.

## Conteúdo
O GESPUB.AI foi desenvolvido utilizando **React 19**, **Vite** e **Tailwind CSS**. A estrutura do projeto é puramente baseada em componentes funcionais e utiliza **React Router DOM v7** para controle de navegação e layouts estruturados.

### Divisão de Ambientes (SaaS)
A plataforma é dividida de forma limpa em dois ecossistemas visuais e funcionais com base no nível de acesso do usuário logado:

```
                  ┌───────────────┐
                  │   Tela de     │
                  │   Login (/)   │
                  └───────┬───────┘
                          │
            ┌─────────────┴─────────────┐
            ▼                           ▼
    ┌──────────────┐            ┌──────────────┐
    │  Plataforma  │            │ Painel ADIM  │
    │  (Cliente)   │            │ (Administr.) │
    └──────┬───────┘            └──────┬───────┘
           │                           │
           ├─► /dashboard              ├─► /adim (Overview)
           ├─► /campanhas              ├─► /adim/usuarios
           ├─► /conjuntos              ├─► /adim/agentes-regras
           ├─► /anuncios               ├─► /adim/logs
           ├─► /agentes                └─► /adim/configuracoes
           ├─► /regras
           ├─► /insights
           └─► /conexoes
```

#### 1. Plataforma (Cliente)
*   **Acesso:** Usuários comuns (plano Starter, Pro, Enterprise).
*   **Layout:** `PlatformLayout.jsx` (Sidebar clara lateral esquerda fixa, Topbar branca com busca e ações contextuais, e Área de Conteúdo central).
*   **Propósito:** Gestão de campanhas, conjuntos de anúncios, anúncios, criação e monitoramento de agentes de IA locais e regras.

#### 2. ADIM (Administrativo)
*   **Acesso:** Usuários administradores (`isAdmin === true`).
*   **Layout:** `AdminLayout.jsx` (Sidebar escura deep-blue lateral esquerda fixa, Topbar branca simplificada e Área de Conteúdo central).
*   **Propósito:** Visão geral do ecossistema, gestão de usuários (criar, bloquear, editar), auditoria de logs e parametrização geral dos agentes globais.

### Roteamento e Proteção de Rotas
No arquivo `App.jsx`, implementamos wrappers protetores baseados no estado do contexto de autenticação:
*   `ProtectedRoute:` Bloqueia acessos não autenticados redirecionando para a página de login (`/`).
*   `AdminRoute:` Exige autenticação e a flag `isAdmin` ativa, impedindo clientes comuns de verem dados administrativos.
*   `PublicRoute:` Impede usuários já logados de acessarem a tela de Login novamente, direcionando-os automaticamente para seus respectivos painéis.

### Estado Global (Contextos)
*   `AuthContext.jsx:` Controla login, logout, dados do usuário atual e papéis de permissão.
*   `AppContext.jsx:` Gerencia dados de interface como status de abertura da sidebar no mobile, drawer lateral de formulários, notificações e contadores.

## Última atualização
Estruturação arquitetural documentada e mapeada em 31/05/2026 às 17:00.

## Links relacionados
*   [[Visao-Geral]]
*   [[Roadmap]]
*   [[Paginas]]
*   [[Status-Frontend]]
