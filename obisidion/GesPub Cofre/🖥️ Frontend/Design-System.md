---
título: Design System
atualizado: 2026-05-31 17:00
status: concluído
---

# Design System

## Resumo
Este documento estabelece as diretrizes visuais e padrões de interface do usuário (UI) do GESPUB.AI, incluindo tipografia, espaçamento, arredondamentos e comportamentos interativos.

## Conteúdo

### Tipografia
*   **Fonte Principal:** Inter (Google Fonts), importada diretamente via `@import` no topo do arquivo `index.css`.
*   **Suavização:** Aplicado `-webkit-font-smoothing: antialiased` globalmente no HTML para garantir que o renderizador de fontes produza contornos limpos em qualquer tela.
*   **Tamanho Base:** `14px` com altura de linha (`line-height`) de `1.5`.
*   **Regra de Pesos (Font Weights):**
    *   `font-weight: 400` (Normal)
    *   `font-weight: 500` (Medium)
    *   `font-weight: 600` (Semibold)
    *   **⚠️ Regra Absoluta:** O peso `700` (Bold) nunca deve ser utilizado. Elementos `strong` e `b` são forçados por CSS para `600` para manter a leveza visual do design premium.

---

### Espaçamento & Grid
*   **Sidebar Width:** `220px` (definido no token `spacing.sidebar`).
*   **Topbar Height:** `56px` (definido no token `spacing.topbar`).
*   **Gaps e Margens de Layout:**
    *   `p-4` (celular) e `p-6` (telas de computadores/notebooks) na área de conteúdo.
    *   Utilizar sempre a escala flexível do Tailwind baseada em múltiplos de `4px` (`gap-3`, `gap-4`, `space-y-6`).

---

### Arredondamentos (Border Radius)
Definidos estritamente no `tailwind.config.js`:
*   `rounded-input:` `8px` (para inputs, selects, botões e avatares).
*   `rounded-card:` `12px` (para painéis de listagens, tabelas e gráficos).
*   `rounded-modal:` `16px` (para caixas de diálogo sobrepostas e overlays).

---

### Comportamento de Foco & Acessibilidade
Para manter a coerência estética sem quebrar a acessibilidade por teclado:
*   Os contornos padrões do navegador (`outline`) são removidos em `:focus-visible`.
*   É adicionado um anel de foco customizado com sombra roxa suave: `box-shadow: 0 0 0 3px rgba(124, 58, 237, 0.3)` acompanhado de `border-radius: 8px`.

---

### Customização de Scrollbar
*   Largura/altura fina de `6px`.
*   Fundo do trilho (`track`) transparente.
*   Indicador de rolagem (`thumb`) na cor `#DDD6FE`, transicionando para `#7C3AED` no estado hover.

---

### Transições e Micro-animações
*   Transição padrão aplicada através da classe `.transition-default` ou no utilitário Tailwind (`transition-all duration-150`).
*   Hover states em botões e links utilizam a curva de velocidade padrão `ease` com duração de `150ms`.

## Última atualização
Documentação dos tokens e regras visuais consolidados em 31/05/2026 às 17:00.

## Links relacionados
*   [[Paleta-de-Cores]]
*   [[Componentes]]
*   [[Status-Frontend]]
