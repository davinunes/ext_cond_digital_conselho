# Raciocínio: Análise de Viabilidade do Filtro de Correspondências na Esteira

- **Data**: 2026-08-26
- **Contexto**: Extensão do Condomínio Digital / Portaria Virtual
- **Objetivo**: Avaliar viabilidade e desenhar solução para monitorar o container `box-conteudo` / `.alert_ca_conteudo` e isolar apenas correspondências na tela, ocultando todo o restante com alternância via botão toggle flutuante.

---

## 1. Diagnóstico e Cenário Atual

Na tela de controle de portaria (`cond.aspx`), existe uma esteira/feed contínuo de eventos (`.alert_ca_conteudo` / `.box-conteudo` e elementos `.linha`), onde chegam eventos em tempo real como:
1. **Passagens de pedestres / moradores / visitantes**
2. **Passagens de veículos** (com identificação de placa ou Não Identificados)
3. **Correspondências / Encomendas recebidas** (que tipicamente usam marcação com `<a>` com `onclick` ou descrições específicas de correspondência)
4. **Alertas e avisos operacionais**

Anteriormente, desenvolvemos a captura e alerta de veículos (`initControleAcessoMonitoring` / `processControleAcesso`), onde inclusive ignorávamos correspondências (`if (!spanClick) return; // Agora ignoramos os correspondências (que usam 'a[onclick]')`).

## 2. Análise de Viabilidade Técnica

A funcionalidade é **100% viável** e possui **excelente desempenho**, pelas seguintes razões:

1. **Manipulação Não Destrutiva (CSS / Display Toggle)**:
   - Em vez de remover elementos do DOM (o que quebraria o estado interno do ASP.NET UpdatePanel ou WebSockets), utilizamos classes CSS ou manipulação de `display: none` nos itens não relacionados.
   - Quando o filtro está ativo: apenas elementos identificados como correspondência permanecem visíveis.
   - Quando o filtro é desligado: todos os elementos voltam a aparecer instantaneamente.

2. **Detecção em Tempo Real (MutationObserver)**:
   - O container da esteira (`.box-conteudo` / `.alert_ca_conteudo`) já recebe nós via Ajax/UpdatePanel do ASP.NET.
   - Um `MutationObserver` no container aplica o filtro imediatamente assim que novos nós chegam, garantindo que eventos que não sejam correspondência nunca pisquem na tela se o modo estiver ligado.

3. **Interface Flutuante (Floating Toggle Control)**:
   - Um botão flutuante estilizado (Dark/Glassmorphism com badge de status e contador de correspondências na tela).
   - Possibilidade de arrastar (draggable) ou fixar em posição conveniente.
   - Persistência do estado de ativação no `localStorage` (`ext_modo_somente_correspondencias`), para manter a escolha do operador caso a página seja recarregada.

4. **Critérios de Identificação de Correspondência**:
   - Elementos contendo links com chamadas de correspondência (`a[onclick*="correspondencia"]`, `a[onclick*="Correspondencia"]`, etc.).
   - Textos contendo palavras-chave: "Correspondência", "Encomenda", "Pacote", "Carta", "Entrega", "Sedex".
   - Ícones característicos de envelope/caixa/entrega.
