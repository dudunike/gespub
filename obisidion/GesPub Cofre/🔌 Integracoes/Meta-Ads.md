---
título: Integração Meta Ads
atualizado: 2026-05-31 17:00
status: planejado
---

# Integração Meta Ads

## Resumo
Este documento detalha as especificações técnicas da integração com a API de Marketing da Meta (Facebook Ads), abrangendo o fluxo de autenticação, escopos exigidos e webhooks de sincronização.

## Conteúdo

### Fluxo de Autenticação (OAuth 2.0)
Para acessar as contas de anúncios dos usuários, o GESPUB.AI utiliza o fluxo de Login do Facebook para Empresas:
1.  O cliente clica em "Conectar Conta de Anúncios" na tela de [[Connections|Conexões]].
2.  É redirecionado para a Meta para conceder permissão de acesso à sua página comercial e contas de anúncios.
3.  A Meta retorna um código de autorização que o backend do GESPUB.AI troca por um token de acesso de longa duração (long-lived access token, válido por 60 dias).

---

### Escopos de Permissão Exigidos (Scopes)
Para ler e realizar alterações de forma autônoma, solicitamos as seguintes permissões:
*   `ads_read`: Leitura de campanhas, orçamentos e relatórios de métricas.
*   `ads_management`: Permite pausar criativos, reajustar orçamentos diários e gerenciar campanhas de acordo com as regras ativadas pelo cliente.
*   `business_management`: Acesso à estrutura de Gerenciadores de Negócios (BM) do cliente.

---

### Endpoints Principais Usados
A integração consome os seguintes recursos do Graph API da Meta:
*   `GET /v18.0/me/adaccounts` - Listagem de contas de anúncios vinculadas ao usuário.
*   `GET /v18.0/act_<AD_ACCOUNT_ID>/campaigns` - Coleta de campanhas e orçamentos.
*   `GET /v18.0/act_<AD_ACCOUNT_ID>/insights` - Relatório diário de métricas de CPA, ROAS, cliques e conversões.
*   `POST /v18.0/<CAMPAIGN_ID>` - Atualização de status da campanha (`status: ACTIVE` ou `PAUSED`) ou atualização de orçamento (`daily_budget`).

## Última atualização
Estrutura de escopos e endpoints da Graph API mapeados para próxima fase de desenvolvimento em 31/05/2026 às 17:00.

## Links relacionados
*   [[Visao-Geral]]
*   [[Roadmap]]
*   [[Gemini-API]]
