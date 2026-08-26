# Walkthrough: Correção de Seletor CSS no Isolador de Correspondências

- **Data**: 2026-08-26
- **Status**: Corrigido

---

## 1. Causa do Erro
A chamada `container.querySelectorAll('.linha, > div')` gerou `SyntaxError` porque o seletor `> div` como nó filho direto dentro de `querySelectorAll` em JavaScript requer o prefixo de escopo `:scope > div`.

## 2. Correção Aplicada
Atualizado o seletor para `.linha, :scope > div` em:
- [content.js](file:///e:/DEV/extensao_conselho_condominioDigital/content.js#L1072)
- [extensao_filtro_correspondencias/content.js](file:///e:/DEV/extensao_conselho_condominioDigital/extensao_filtro_correspondencias/content.js#L185)
