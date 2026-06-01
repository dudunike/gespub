---
título: Builder de Regras
atualizado: 2026-05-31 17:00
status: concluído
---

# Builder de Regras

## Resumo
Este documento detalha o funcionamento do editor de regras condicionais do GESPUB.AI, especificando as condições avaliadas, as ações disponíveis e a estrutura lógica das automações.

## Conteúdo

### Estrutura Lógica (*If-This-Then-That*)
O construtor de regras permite que os usuários associem métricas de performance a ações automatizadas. Cada regra é composta por:
*   **Escopo:** Indica onde a regra se aplica (Campanhas específicas, Conjuntos de Anúncios ou Anúncios individuais).
*   **Condição (Trigger):** Uma expressão lógica comparando uma métrica de desempenho com um valor limite.
*   **Ação:** O comando que o sistema executará caso a condição seja verdadeira.

---

### Condições e Métricas Suportadas

1.  **ROAS (Retorno sobre Investimento em Anúncios):**
    *   *Exemplo:* `ROAS < 1.8` (indica prejuízo ou performance insatisfatória).
2.  **CPA (Custo por Aquisição):**
    *   *Exemplo:* `CPA > R$ 35,00` (anúncio está custando mais do que a margem permitida).
3.  **CTR (Taxa de Cliques):**
    *   *Exemplo:* `CTR < 1.0%` (anúncio pouco atrativo para o público).
4.  **Investimento (Valor Gasto):**
    *   *Exemplo:* `Gasto Diário > R$ 200,00` (utilizado como limitador de perdas).
5.  **Frequência (Repetição por usuário):**
    *   *Exemplo:* `Frequência > 3.5` (sinal de saturação de criativo).

---

### Ações Automatizadas Disponíveis

*   **Pausar Item:** Desativa a Campanha, Conjunto ou Anúncio imediatamente na plataforma de tráfego.
*   **Ajustar Orçamento:**
    *   *Subir Orçamento:* Incrementa o orçamento diário em uma porcentagem específica (ex: aumentar em `20%`).
    *   *Reduzir Orçamento:* Decrementa o orçamento diário em uma porcentagem específica (ex: reduzir em `15%`).
*   **Enviar Notificação / Alerta:** Gera um aviso no painel de notificações interno e envia um e-mail/webhook ao usuário, sem alterar diretamente o anúncio (modo "Apenas Alerta").

## Última atualização
Documentação dos parâmetros e ações do builder de regras concluída em 31/05/2026 às 17:00.

## Links relacionados
*   [[Conceito]]
*   [[Gemini-Integration]]
*   [[Meta-Ads]]
