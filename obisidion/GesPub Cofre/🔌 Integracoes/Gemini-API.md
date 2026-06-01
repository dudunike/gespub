---
título: Configuração Gemini API
atualizado: 2026-05-31 17:00
status: planejado
---

# Configuração Gemini API

## Resumo
Este documento especifica as parametrizações técnicas de conexão com a API do Google Gemini, descrevendo os limites de cota, as chaves de acesso e o modelo de processamento de chamadas.

## Conteúdo

### Credenciais e Segurança
*   **Armazenamento da Chave:** A chave secreta (`GEMINI_API_KEY`) é armazenada exclusivamente em variáveis de ambiente no servidor (`.env`) e nunca é exposta no código frontend do cliente.
*   **Controle de Acesso:** Clientes da plataforma não fazem chamadas diretas para o Google; as requisições passam por um proxy no backend do GESPUB.AI que autentica a chamada e valida o plano do usuário antes de repassar a consulta.

---

### Limites e Cotas (Rate Limits)
Para evitar custos inesperados e bloqueios, implementamos uma fila de chamadas respeitando as cotas do plano selecionado:
*   **Limites de Cota Padrão (Modelo Gemini 1.5 Flash):**
    *   15 RPM (Requisições por minuto) no ambiente de testes/gratuito.
    *   1.000.000 TPM (Tokens por minuto).
*   **Controle Interno:** Caso um usuário exceda seu limite mensal de análises estipulado por seu plano (Starter, Pro ou Enterprise), a chamada de diagnóstico no frontend é bloqueada com uma mensagem para upgrade de plano.

## Última atualização
Limites e especificações de infraestrutura da API do Gemini documentados para próxima fase de desenvolvimento em 31/05/2026 às 17:00.

## Links relacionados
*   [[Gemini-Integration]]
*   [[Meta-Ads]]
*   [[Roadmap]]
