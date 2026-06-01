---
título: Páginas
atualizado: 2026-05-31 17:00
status: concluído
---

# Páginas

## Resumo
Este documento lista e detalha todas as telas e rotas ativas do ecossistema GESPUB.AI, divididas entre páginas públicas, de clientes e de administração.

## Conteúdo

### Páginas Públicas

*   **Login (`/`)**
    *   *Arquivo:* `src/pages/Login.jsx`
    *   *Propósito:* Tela de entrada para digitação de credenciais. Realiza redirecionamento inteligente baseado na propriedade de permissão do usuário logado (redireciona para `/adim` se for administrador ou para `/dashboard` se for cliente).

---

### Páginas da Plataforma (Cliente - `/dashboard`, etc.)

*   **Dashboard (`/dashboard`)**
    *   *Arquivo:* `src/pages/platform/Dashboard.jsx`
    *   *Propósito:* Página inicial do cliente contendo visão consolidada dos KPIs de investimento total, receita, ROAS e CPA médios, lista de campanhas ativas, atividades recentes dos agentes de IA ativos e um gráfico de performance semanal em barras (`recharts`).
*   **Campanhas (`/campanhas`)**
    *   *Arquivo:* `src/pages/platform/Campaigns.jsx`
    *   *Propósito:* Listagem tabular de campanhas com filtros por abas de status (Todas, Ativas, Pausadas, Rascunhos). Possui botão e gaveta lateral (`Drawer`) para criação rápida de nova campanha.
*   **Conjuntos de Anúncios (`/conjuntos`)**
    *   *Arquivo:* `src/pages/platform/AdSets.jsx`
    *   *Propósito:* Lista de conjuntos de anúncios exibindo dados de entrega, orçamento diário, conversões e o status ativo/pausado de cada conjunto.
*   **Anúncios (`/anuncios`)**
    *   *Arquivo:* `src/pages/platform/Ads.jsx`
    *   *Propósito:* Visualização granular dos criativos individuais e mídias de anúncio, com suas respectivas métricas e controles de toggle.
*   **Agentes IA (`/agentes`)**
    *   *Arquivo:* `src/pages/platform/Agents.jsx`
    *   *Propósito:* Central de controle de agentes inteligentes autônomos. Permite configurar o tipo de monitoramento executado por cada agente (ex: Guardião de ROAS, Detetor de Fadiga).
*   **Regras (`/regras`)**
    *   *Arquivo:* `src/pages/platform/Rules.jsx`
    *   *Propósito:* Editor visual de regras condicionais do tipo *If-This-Then-That* (ex: "Se ROAS < 2, então pause o anúncio").
*   **Insights (`/insights`)**
    *   *Arquivo:* `src/pages/platform/Insights.jsx`
    *   *Propósito:* Painel contendo relatórios diagnósticos gerados pelo Gemini AI com base no histórico de anúncios, sugerindo ajustes de público e criativos.
*   **Conexões (`/conexoes`)**
    *   *Arquivo:* `src/pages/platform/Connections.jsx`
    *   *Propósito:* Tela de integração para vinculação de contas de anúncios (Meta Ads/Facebook) e chaves de API.

---

### Páginas do ADIM (Administração - `/adim`, etc.)

*   **Visão Geral ADIM (`/adim`)**
    *   *Arquivo:* `src/pages/admin/AdminOverview.jsx`
    *   *Propósito:* Estatísticas de negócios consolidadas (quantidade de clientes ativos, receita recorrente mensal, contagem de agentes de IA disparados, taxa de uso do sistema).
*   **Gestão de Usuários (`/adim/usuarios`)**
    *   *Arquivo:* `src/pages/admin/AdminUsers.jsx`
    *   *Propósito:* CRUD de gerenciamento de clientes cadastrados no SaaS, permitindo mudar planos (Starter, Pro, Enterprise) e alterar status de ativação (Ativo, Bloqueado).
*   **Agentes & Regras Globais (`/adim/agentes-regras`)**
    *   *Arquivo:* `src/pages/admin/AdminAgentsRules.jsx`
    *   *Propósito:* Parametrização e templates globais de regras que ficam disponíveis por padrão para novos usuários.
*   **Logs do Sistema (`/adim/logs`)**
    *   *Arquivo:* `src/pages/admin/AdminLogs.jsx`
    *   *Propósito:* Auditoria detalhada de logs registrando ações dos usuários e ações autônomas executadas pela inteligência artificial.
*   **Configurações do ADIM (`/adim/configuracoes`)**
    *   *Arquivo:* `src/pages/admin/AdminSettings.jsx`
    *   *Propósito:* Configuração geral de faturamento, tokens de API integrados globais e limites de uso por plano.

## Última atualização
Estrutura de rotas e detalhamento das páginas atualizados em 31/05/2026 às 17:00.

## Links relacionados
*   [[Arquitetura]]
*   [[Componentes]]
*   [[Status-Frontend]]
