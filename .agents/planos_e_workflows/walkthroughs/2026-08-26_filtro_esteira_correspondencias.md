# Walkthrough: Ajuste do Contador de Duplas de Correspondência

- **Data**: 2026-08-26
- **Status**: Concluído

---

## 1. Ajuste no Contador (Badge)
Agora o contador no botão flutuante contabiliza a **dupla** (botão de ação/envelope + linha de dados) como **1 única correspondência**.
- Identifica a quantidade de envelopes/ações de entrega ativos na esteira.
- Caso haja correspondências em pares de linhas, calcula automaticamente `Math.ceil(totalLinhas / 2)`, evitando contagem duplicada.

## 2. Arquivos Atualizados
- [content.js](file:///e:/DEV/extensao_conselho_condominioDigital/content.js#L1099)
- [extensao_filtro_correspondencias/content.js](file:///e:/DEV/extensao_conselho_condominioDigital/extensao_filtro_correspondencias/content.js#L217)
