---
título: Conceito de Agentes
atualizado: 2026-05-31 17:00
status: concluído
---

# Conceito de Agentes

## Resumo
Este documento explica o conceito dos Agentes de IA do GESPUB.AI, a lógica de funcionamento autônomo e as atribuições de cada um dos agentes pré-configurados do ecossistema.

## Conteúdo

### O que são os Agentes de IA?
No GESPUB.AI, os Agentes de IA são entidades lógicas projetadas para agir de forma autônoma sobre contas de anúncios conectadas. Eles operam em um ciclo contínuo de **Sensoriamento -> Tomada de Decisão -> Execução**:

1.  **Sensoriamento:** O agente lê periodicamente as métricas de performance (gastos, cliques, conversões, receita) por meio da API de anúncios.
2.  **Tomada de Decisão:** O agente compara os dados coletados com regras predefinidas ou consulta o modelo do Gemini AI para obter uma recomendação inteligente.
3.  **Execução:** Caso os limites (thresholds) das regras sejam cruzados, o agente executa a ação corretiva diretamente na plataforma de anúncios e gera um log auditável para o usuário.

---

### Agentes Pré-configurados no Sistema

*   **1. Guardião de ROAS**
    *   *Função:* Monitora o Retorno sobre o Investimento em Anúncios (ROAS) de campanhas e conjuntos.
    *   *Ação Padrão:* Aumentar orçamento se o ROAS estiver excelente ou reduzir/pausar se estiver abaixo do mínimo aceitável.
*   **2. Sentinela de CPA**
    *   *Função:* Vigia o Custo por Aquisição (CPA) de leads ou compras.
    *   *Ação Padrão:* Pausar anúncios individuais caso o custo de aquisição ultrapasse o limite máximo tolerado pelo anunciante.
*   **3. Detector de Fadiga**
    *   *Função:* Avalia a frequência de exibição de criativos (anúncios) e a queda de engajamento ao longo do tempo.
    *   *Ação Padrão:* Alertar o gestor que o anúncio está saturado ("fadiga de criativo") e sugerir novas imagens ou textos.
*   **4. Acelerador de Budget**
    *   *Função:* Identifica oportunidades de escala em campanhas com alta performance.
    *   *Ação Padrão:* Incrementar gradualmente o orçamento diário de forma segura (ex: subir 20% ao dia) sem reiniciar o aprendizado do algoritmo do Meta Ads.
*   **5. Vigia de CTR**
    *   *Função:* Monitora a taxa de clique (Click-Through Rate) dos anúncios.
    *   *Ação Padrão:* Enviar notificações de alerta ou sugerir alterações caso a taxa de cliques caia abaixo do benchmark ideal do mercado.

## Última atualização
Estruturação e descrição conceitual dos 5 agentes integrados documentadas em 31/05/2026 às 17:00.

## Links relacionados
*   [[Regras]]
*   [[Gemini-Integration]]
*   [[Meta-Ads]]
