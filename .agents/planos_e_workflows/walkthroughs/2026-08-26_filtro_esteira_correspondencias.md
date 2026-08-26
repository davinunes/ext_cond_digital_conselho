# Walkthrough: Associação do Botão de Ação / Envelope na Esteira

- **Data**: 2026-08-26
- **Status**: Concluído

---

## 1. Ajuste Solicitado
Manter a `div` com o botão de ação (ícone do envelope) que fica logo acima do item da correspondência sempre visível junto com o conteúdo da correspondência.

## 2. Solução Implementada
1. **Detecção Expandida do Envelope**: O classificador agora reconhece botões, links e ícones de envelope diretamente (`img[src*="envelope"]`, `[class*="envelope"]`, etc.).
2. **Pareamento Bidirecional**: Quando um item de correspondência é detectado:
   - A `div` logo acima (`previousElementSibling`, onde fica o botão de ação com o envelope) é automaticamente marcada como correspondência.
   - A `div` logo abaixo (`nextElementSibling`, com os detalhes da encomenda) também é mantida sincronizada.
3. Aplicado tanto na extensão principal ([content.js](file:///e:/DEV/extensao_conselho_condominioDigital/content.js)) quanto na extensão isolada ([extensao_filtro_correspondencias/content.js](file:///e:/DEV/extensao_conselho_condominioDigital/extensao_filtro_correspondencias/content.js)).
