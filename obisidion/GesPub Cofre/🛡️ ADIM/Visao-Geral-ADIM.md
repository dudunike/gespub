---
título: Visão Geral ADIM
atualizado: 2026-05-31 17:00
status: concluído
---

# Visão Geral ADIM

## Resumo
Este documento introduz o ADIM, o portal administrativo interno do GESPUB.AI, detalhando quem o acessa, suas finalidades corporativas e o fluxo de segurança para administradores.

## Conteúdo
O ADIM (abreviação de Administração) é um painel de controle separado, projetado exclusivamente para a equipe de suporte, gerentes de produto e administradores de sistema do GESPUB.AI. 

### Finalidades do ADIM
1.  **Monitoramento de Negócio:** Avaliação rápida do crescimento do faturamento e retenção de usuários.
2.  **Suporte ao Cliente:** Capacidade de verificar o status de sincronização das contas de anúncios dos clientes, alterar seus limites manuais ou desbloquear contas suspensas.
3.  **Controle de Qualidade:** Auditoria de logs para rastrear erros internos e falhas de comunicação com as APIs integradas da Meta e do Gemini.

### Segurança e Controle de Acesso
*   **Flag de Administrador:** Apenas contas de usuário que possuam a propriedade booleana `isAdmin: true` no banco de dados podem carregar as rotas sob o prefixo `/adim`.
*   **Filtro de Roteamento:** Qualquer tentativa de acesso direto por parte de um usuário não autorizado resulta em um redirecionamento imediato para a página de `/dashboard`.
*   **Identidade Visual:** Para evitar enganos operativos, o ADIM possui uma interface escurecida baseada no tom `#1E1B4B` (admin-sidebar), diferente do design claro da plataforma de cliente.

## Última atualização
Documentação conceitual do ecossistema ADIM concluída em 31/05/2026 às 17:00.

## Links relacionados
*   [[Modulos-ADIM]]
*   [[Gestao-Usuarios]]
*   [[Arquitetura]]
