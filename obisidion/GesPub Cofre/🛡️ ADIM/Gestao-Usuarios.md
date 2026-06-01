---
título: Gestão de Usuários
atualizado: 2026-05-31 17:00
status: concluído
---

# Gestão de Usuários

## Resumo
Este documento detalha o fluxo de gestão de usuários dentro do painel ADIM, especificando como administradores criam, editam, bloqueiam e analisam os clientes cadastrados.

## Conteúdo

### Listagem de Clientes
O painel de controle administrativo `/adim/usuarios` expõe todos os usuários registrados no banco de dados. Cada registro exibe:
*   **Identificação:** Nome e e-mail corporativo.
*   **Plano Ativo:** `Starter`, `Pro` ou `Enterprise`.
*   **Status de Acesso:** `Ativo` (Acesso liberado) ou `Bloqueado` (Acesso suspenso).
*   **Data de Cadastro:** Timestamp de criação da conta.

---

### Ações Operacionais Disponíveis para o Administrador

#### 1. Criação de Novos Usuários
*   Utilizado principalmente para criar contas enterprise de forma manual ou adicionar outros membros da equipe administrativa do ADIM (marcando a opção `Administrador`).

#### 2. Alteração de Plano
*   Permite que o administrador altere manualmente o plano do usuário caso ocorra um upgrade negociado diretamente por e-mail ou equipe de vendas (venda direta faturada fora do Stripe).

#### 3. Bloqueio / Suspensão de Contas
*   *Motivos:* Inadimplência no faturamento automático do cartão de crédito, mau uso de chamadas de API (abuso de cotas do Gemini) ou violação dos termos de serviço da plataforma.
*   *Efeito:* O status da conta muda imediatamente para `Bloqueado`. Ao tentar efetuar login ou realizar qualquer chamada, o usuário recebe uma mensagem de suspensão.

## Última atualização
Documentação operacional sobre gestão de usuários cadastrada em 31/05/2026 às 17:00.

## Links relacionados
*   [[Visao-Geral-ADIM]]
*   [[Modulos-ADIM]]
*   [[Arquitetura]]
