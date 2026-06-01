---
título: Integração com Gemini
atualizado: 2026-05-31 17:00
status: concluído
---

# Integração com Gemini

## Resumo
Este documento descreve como a API do Google Gemini é integrada ao GESPUB.AI, detalhando as responsabilidades cognitivas da IA, os prompts base e os modelos selecionados.

## Conteúdo

### Papel do Gemini no GESPUB.AI
Enquanto as regras clássicas tratam de limites lógicos exatos (ex: `CPA > R$ 30`), a inteligência artificial do Gemini é utilizada para análises qualitativas e diagnósticos complexos:
1.  **Diagnóstico de Queda de Performance:** Interpretar variações de métricas para responder por que o ROAS caiu de uma semana para a outra.
2.  **Análise de Fadiga e Sugestões Criativas:** Avaliar títulos e descrições de anúncios e sugerir novos criativos textuais mais persuasivos (Copywriting).
3.  **Mapeamento de Público-Alvo:** Propor novos nichos de interesses do Facebook com base no perfil de conversão atual.

---

### Configurações de API e Modelos
*   **Modelo Principal:** Gemini 1.5 Flash (escolhido por ter excelente velocidade, baixo custo por token e janela de contexto estendida ideal para ler grandes tabelas de histórico de anúncios).
*   **Ajuste de Temperatura (`temperature`):** Configurado em `0.3` para garantir respostas mais analíticas, coerentes e focadas em dados, minimizando alucinações.

---

### Estrutura de Prompts Base (Exemplo)

```
Você é o Analista de Tráfego Sênior do GESPUB.AI.
Com base na tabela de performance de anúncios fornecida abaixo:
{dados_anuncios}

Identifique os 3 anúncios que estão consumindo orçamento sem gerar conversões e sugira novas variações de títulos (head) e textos persuasivos utilizando a metodologia AIDA (Atenção, Interesse, Desejo, Ação).
```

## Última atualização
Documentação dos modelos e prompts do Gemini consolidada em 31/05/2026 às 17:00.

## Links relacionados
*   [[Conceito]]
*   [[Gemini-API]]
*   [[Visao-Geral]]
