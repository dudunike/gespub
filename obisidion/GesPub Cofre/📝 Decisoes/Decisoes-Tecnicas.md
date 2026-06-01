---
título: Decisões Técnicas
atualizado: 2026-05-31 17:00
status: concluído
---

# Decisões Técnicas

## Resumo
Este documento registra as principais escolhas tecnológicas e arquiteturais do GESPUB.AI, justificando o motivo de sua adoção e alternativas que foram descartadas.

## Conteúdo

### 1. Adoção do React 19 e Vite
*   **Decisão:** Utilizar a versão mais recente do React estruturada no bundler do Vite.
*   **Justificativa:** O Vite oferece um tempo de recarga a quente (HMR) quase instantâneo em comparação com o antigo Create React App (Webpack), acelerando o desenvolvimento do frontend. O React 19 traz melhorias nativas na manipulação de formulários e concorrência.
*   **Alternativas Descartadas:** Next.js (descartado por adicionar complexidade de SSR/SSG desnecessária para este MVP, que opera puramente como SPA autenticado).

### 2. Uso do Tailwind CSS e unificação de Tokens em Spacing
*   **Decisão:** Utilizar Tailwind CSS para estilização e centralizar variáveis de layout (`sidebar`, `topbar`) em `theme.extend.spacing` ao invés de propriedades isoladas.
*   **Justificativa:** O uso do Tailwind CSS garante que a interface siga uma escala harmônica rígida. A centralização sob a diretiva `spacing` garante que todas as variações de classes utilitárias (como margens, preenchimentos, larguras e distâncias de posicionamento) sejam compiladas automaticamente de forma integrada.
*   **Alternativas Descartadas:** CSS Modules ou Styled Components (descartados por aumentarem a quantidade de arquivos separados de estilo e complexidade de runtime).

### 3. Escolha do Recharts para Visualização de Gráficos
*   **Decisão:** Usar a biblioteca Recharts para renderizar gráficos de barras de performance semanal no Dashboard.
*   **Justificativa:** O Recharts possui componentes declarativos integrados de forma nativa com a reatividade do React, além de suporte nativo a contêineres responsivos (`ResponsiveContainer`), adaptando-se instantaneamente do mobile ao desktop.
*   **Alternativas Descartadas:** Chart.js (exige referências imperativas `canvas` e wrappers adicionais).

## Última atualização
Documento inicial de decisões de arquitetura e decisões técnicas de CSS consolidado em 31/05/2026 às 17:00.

## Links relacionados
*   [[Visao-Geral]]
*   [[Arquitetura]]
*   [[Roadmap]]
