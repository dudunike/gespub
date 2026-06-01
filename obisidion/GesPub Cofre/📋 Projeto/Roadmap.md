---
título: Roadmap
atualizado: 2026-05-31 17:15
status: em andamento
---

# Roadmap

## Resumo
Este documento lista o progresso geral do desenvolvimento do GESPUB.AI, dividindo as entregas em itens concluídos, em andamento e planejados para próximas fases.

## Conteúdo

### Fase 1: Fundação & UI/UX (Concluída)
*   [x] Estrutura inicial do projeto com React 19, Vite e Tailwind CSS.
*   [x] Definição e aplicação de padrões de estilo e paleta de cores.
*   [x] Componentes básicos de formulários, botões, modais e layouts de grid.
*   [x] Layout estrutural da Plataforma de Cliente (`PlatformLayout`).
*   [x] Layout estrutural do Painel de Administração (`AdminLayout`).
*   [x] Proteção e controle de rotas por nível de acesso (Público, Cliente, Admin).
*   [x] Mock de dados iniciais para popular o dashboard, campanhas, conjuntos, anúncios e agentes.
*   [x] Correção de bugs de responsividade no CSS/Tailwind (correção de margens e posicionamento de elementos sob a sidebar).

### Fase 2: Funcionalidades de Interface & Fluxo Local (Em Andamento)
*   [/] Detalhamento e navegação de sub-páginas (Conjuntos, Anúncios, Insights).
*   [/] Painéis interativos de gerenciamento no ADIM (Usuários, Logs e Agentes globais).
*   [/] Formulários de criação em gavetas laterais (Drawers) e validações visuais.
*   [ ] Conexão de estado dinâmico entre componentes (ex: pausar campanha de fato altera o visual de status).

### Fase 3: Integrações & Backend (Em Andamento)
*   [x] Integração e configuração do banco de dados e autenticação com Supabase.
*   [ ] Configuração do fluxo de autenticação OAuth com Meta Ads (Facebook Login).
*   [ ] Integração de endpoints da API de Marketing da Meta para ler dados reais.
*   [ ] Configuração do SDK/API do Google Gemini para análise de performance de anúncios.
*   [ ] Implementação de sistema de execução em segundo plano para monitoramento de regras.

### Fase 4: Produção, Faturamento & Lançamento (Planejado)
*   [ ] Sistema de planos e pagamentos recorrentes (Stripe).
*   [ ] Otimização final de performance dos gráficos e bundles.
*   [ ] Implantação e testes integrados de ponta a ponta.

## Última atualização
Atualizado o roadmap para registrar a integração do banco de dados e autenticação via Supabase em 31/05/2026 às 17:15.

## Links relacionados
*   [[Visao-Geral]]
*   [[Status-Frontend]]
*   [[Decisoes-Tecnicas]]
