---
título: Status do Frontend
atualizado: 2026-05-31 17:15
status: em andamento
---

# Status do Frontend

## Resumo
Este arquivo serve como um painel de controle do desenvolvimento frontend, documentando quais telas estão concluídas, quais estão pendentes e a situação de bugs detectados.

## Conteúdo

### Páginas Concluídas & Codificadas

| Rota | Descrição | Status Visual | Mocks / Estado |
| :--- | :--- | :--- | :--- |
| `/` | Tela de Login | Concluído | Integrado com Supabase Auth e Perfis |
| `/dashboard` | Dashboard Principal | Concluído | Integrado com Supabase (KPIs e Campanhas) |
| `/campanhas` | Lista de Campanhas | Concluído | Integrado com Supabase (Leitura e Escrita) |
| `/conjuntos` | Conjuntos de Anúncios | Concluído | Tabela de listagem de sub-conjuntos |
| `/anuncios` | Criativos de Anúncios | Concluído | Grid de cartões de anúncios |
| `/agentes` | Configuração de Agentes | Concluído | Listagem e status dos agentes |
| `/regras` | Editor de Regras | Concluído | Lista e editor básico |
| `/insights` | Diagnóstico de IA | Concluído | Relatórios estáticos gerados por mock |
| `/conexoes` | Integrações Sociais | Concluído | Modais de vinculação de conta |
| `/adim` | Painel de controle ADIM | Concluído | Métricas consolidadores de SaaS |
| `/adim/usuarios` | Lista de usuários SaaS | Concluído | Tabela de usuários com controle de planos |
| `/adim/agentes-regras` | Definição global de IA | Concluído | Templates de regras |
| `/adim/logs` | Logs do sistema | Concluído | Lista de auditoria |
| `/adim/configuracoes` | Configurações do ADIM | Concluído | Painel administrativo geral |

---

### O que falta desenvolver? (Pendências)
1.  **Conexão de Ações em Mocks:** Ajustar os cliques de ações (ex: pausar campanha, alternar toggle de agente) para atualizarem o estado em memória (React State/Context), permitindo melhor demonstração de uso local.
2.  **Fluxo Completo de Formulários:** Validar os dados submetidos no Drawer de Campanhas e Regras de forma que sejam de fato renderizados na listagem provisoriamente.

---

### Histórico de Bugs & Problemas Recentes

*   **Bug de Alinhamento da Sidebar (Resolvido em 31/05/2026):**
    *   *Sintoma:* A área de conteúdo principal e a barra superior ficavam ocultadas embaixo da sidebar em telas de desktop/notebook. O primeiro card de KPI ficava sumido e textos das colunas apareciam cortados pela metade (ex: "Conversões" ficava "ersões").
    *   *Causa:* O Tailwind CSS não gerava as classes `lg:ml-sidebar`, `lg:left-sidebar` e `mt-topbar` porque os tamanhos da sidebar/topbar estavam declarados isoladamente em `width` e `height`.
    *   *Correção:* Os tokens foram unificados sob a extensão de `spacing` no arquivo `tailwind.config.js`. Agora as classes compilam e o posicionamento está correto.

## Última atualização
Lista de status atualizada com as conexões do Supabase em 31/05/2026 às 17:15.

## Links relacionados
*   [[Roadmap]]
*   [[Log-de-Bugs]]
*   [[Paginas]]
