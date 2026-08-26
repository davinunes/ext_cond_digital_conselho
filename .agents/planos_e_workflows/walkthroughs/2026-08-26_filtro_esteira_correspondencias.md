# Walkthrough: Correção de Cascata e Remoção Ativa no DOM

- **Data**: 2026-08-26
- **Status**: Concluído

---

## 1. Problemas Identificados
1. **Efeito Cascata (Dominó)**: Ao atribuir `prev` e `next` de forma recursiva baseando-se no `dataset`, a validação encadeou os 40 nós da esteira.
2. **Limite da Esteira Nativa**: Quando novos eventos entravam, a esteira original purgava correspondências antigas porque os nós não-correspondência ainda ocupavam a cota do DOM.

## 2. Soluções Implementadas
1. **Identificador Estrito de Tipo (`detectCorrespondenciaType`)**:
   - `header`: Botão/ícone com envelope ou link direto de entrega. Pareia apenas com o `nextElementSibling` imediato.
   - `body`: Texto com termos de correspondência/encomenda. Pareia apenas com o `previousElementSibling` imediato.
   - Zero chance de cascata dominó.
2. **Remoção Ativa do DOM (`item.remove()`)**:
   - Quando o filtro "Só Correspondências" está ativo, os itens de pedestres e veículos são removidos diretamente do DOM da esteira.
   - Isso mantém a cota de nós da esteira nativa sempre baixa, permitindo que as correspondências permaneçam na tela por muito mais tempo.
