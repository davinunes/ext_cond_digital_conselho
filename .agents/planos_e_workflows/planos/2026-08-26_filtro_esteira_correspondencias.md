# Plano de Implementação: Filtro de Correspondências na Esteira (`box-conteudo`) e Extensão Dedicada

- **Data**: 2026-08-26
- **Status**: Proposta Aprovada / Em Execução
- **Arquivos Envolvidos**: 
  - Extensão Principal: [content.js](file:///e:/DEV/extensao_conselho_condominioDigital/content.js)
  - Nova Extensão Dedicada: `extensao_filtro_correspondencias/manifest.json`, `extensao_filtro_correspondencias/content.js`

---

## 1. Comportamento do Limite da Esteira do Sistema
A esteira do sistema remove elementos antigos do DOM conforme novos eventos chegam. Se apenas ocultarmos os elementos com `display: none`, a passagem massiva de veículos ou pedestres acabaria "empurrando" as correspondências para fora do DOM nativo.

### Solução Arquitetural
1. **Filtro CSS de Esteira em Tempo Real**: Oculta na esteira original o que não for correspondência.
2. **Buffer de Retenção da Extensão**: A extensão captura cópia/referência de cada correspondência que passa e as mantém em um feed/lista persistente com contador, para que nenhuma correspondência seja perdida, mesmo que o sistema original descarte a linha.

---

## 2. Estrutura de Entregas

### A. Na Extensão Principal (`content.js`)
- Módulo integrado ativado na tela `cond.aspx`.
- Botão flutuante com contador e toggle.

### B. Em Extensão Nova e Isolada (`extensao_filtro_correspondencias/`)
- Pasta autônoma pronta para instalação em computadores específicos.
- Contém apenas o código necessário para a funcionalidade de isolamento de correspondências.
