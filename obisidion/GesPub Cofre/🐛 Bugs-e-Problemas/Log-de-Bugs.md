---
título: Log de Bugs
atualizado: 2026-05-31 17:00
status: concluído
---

# Log de Bugs

## Resumo
Este documento atua como um livro de registro contínuo para documentar todos os bugs de interface, backend ou integração relatados e as respectivas resoluções técnicas aplicadas.

## Conteúdo

### Bugs Resolvidos

#### 🟢 [RESOLVIDO] Conteúdo Principal Ocultado por Trás da Sidebar e Elementos Cortados
*   **Data de Identificação:** 31/05/2026
*   **Data de Resolução:** 31/05/2026
*   **Sintoma:** O conteúdo central da plataforma e a barra superior ficavam posicionados atrás da sidebar em telas de desktop e notebooks. Isso fazia com que o primeiro cartão de KPI (Investido total) ficasse invisível e textos em tabelas ficassem cortados (ex: "Conversões" aparecia como "ersões").
*   **Causa:** No arquivo `tailwind.config.js`, os tamanhos `sidebar: 220px` e `topbar: 56px` estavam configurados especificamente sob os blocos de `width` e `height`, respectivamente. O Tailwind CSS gera apenas as classes de tamanho (`w-sidebar`, `h-topbar`) nesses casos, de modo que classes como `lg:ml-sidebar` (margin-left), `lg:left-sidebar` (posicionamento à esquerda) e `mt-topbar` (margin-top) eram ignoradas pelo navegador por não existirem.
*   **Solução:** Mover os tamanhos da `sidebar` e `topbar` para a propriedade comum de `spacing` dentro da extensão de temas do Tailwind. O Tailwind agora gera todas as classes de largura, altura, margem e posicionamento corretamente.

---

### Bugs Ativos (Sem Ocorrências no Momento)
*   *Nenhum bug crítico ou de interface foi relatado ou permanece ativo no momento.*

## Última atualização
Log de bugs atualizado com a resolução do bug de responsividade e alinhamento em 31/05/2026 às 17:00.

## Links relacionados
*   [[Roadmap]]
*   [[Status-Frontend]]
*   [[Design-System]]
