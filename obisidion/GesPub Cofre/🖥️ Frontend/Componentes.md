---
título: Componentes
atualizado: 2026-05-31 17:00
status: concluído
---

# Componentes

## Resumo
Este documento cataloga todos os componentes reutilizáveis da interface do usuário (UI) e de layout do GESPUB.AI, especificando suas localizações, finalidades e como devem ser utilizados.

## Conteúdo

### Componentes de Layout (`src/components/layout/` e `src/components/admin/`)

*   **`PlatformLayout.jsx`**
    *   *Propósito:* Invólucro estrutural da plataforma cliente. Agrupa a `Sidebar`, a `Topbar`, a área de conteúdo dinâmico (via `<Outlet />`) e gerencia a cortina/overlay de clique para fechar a barra no mobile.
*   **`Sidebar.jsx`**
    *   *Propósito:* Barra de navegação esquerda para o cliente. Exibe o logo principal, links para as rotas com indicadores visuais de item ativo e o rodapé de perfil com avatar e informações de plano.
*   **`Topbar.jsx`**
    *   *Propósito:* Cabeçalho fixo da plataforma. Contém o botão hambúrguer mobile, título dinâmico da tela ativa, campo de pesquisa e sino de notificações.
*   **`AdminLayout.jsx`**
    *   *Propósito:* Invólucro estrutural do painel administrativo.
*   **`AdminSidebar.jsx`**
    *   *Propósito:* Barra lateral escura exclusiva para a visualização administrativa do ADIM.
*   **`AdminTopbar.jsx`**
    *   *Propósito:* Cabeçalho simplificado para as páginas administrativas.

---

### Componentes de UI Geral (`src/components/ui/`)

*   **`Avatar.jsx`**
    *   *Propósito:* Exibe fotos de perfil dos usuários ou iniciais com cores automáticas caso a imagem não exista.
*   **`Badge.jsx`**
    *   *Propósito:* Pequeno rótulo de texto colorido usado para contadores numéricos ou marcações rápidas.
*   **`Button.jsx`**
    *   *Propósito:* Botão padrão com variações `primary`, `secondary`, tamanhos e suporte a largura total (`fullWidth`).
*   **`Drawer.jsx`**
    *   *Propósito:* Gaveta lateral deslizante utilizada para formulários de criação (ex: nova campanha, regras) ou verificação de detalhes sem abrir uma nova página.
*   **`Input.jsx`**
    *   *Propósito:* Campo de texto estilizado de acordo com o design system, com tratamento de labels e erros.
*   **`KpiCard.jsx`**
    *   *Propósito:* Cartão de métricas estatísticas. Mostra o título do KPI, o valor consolidado e a variação percentual com setas de tendência verdes/vermelhas.
*   **`Modal.jsx`**
    *   *Propósito:* Caixa de diálogo central para confirmações críticas (ex: excluir conta, desativar conexões).
*   **`SearchInput.jsx`**
    *   *Propósito:* Caixa de pesquisa contendo ícone de lupa integrado no lado esquerdo.
*   **`Select.jsx`**
    *   *Propósito:* Menu drop-down estilizado para escolha de opções predefinidas.
*   **`StatusPill.jsx`**
    *   *Propósito:* Pílula indicadora de status (`active` -> Verde, `paused` -> Laranja, `draft` -> Cinza, `error` -> Vermelho).
*   **`Tabs.jsx`**
    *   *Propósito:* Filtros de abas com suporte a contagem de itens por categoria.
*   **`Toggle.jsx`**
    *   *Propósito:* Chave interruptora liga/desliga interativa.

## Última atualização
Catálogo de componentes estruturado em 31/05/2026 às 17:00.

## Links relacionados
*   [[Design-System]]
*   [[Paginas]]
*   [[Status-Frontend]]
