# Walkthrough: Isolador de Correspondências na Esteira

- **Data**: 2026-08-26
- **Status**: Concluído e Disponível

---

## 1. O que foi Implementado

1. **Extensão Principal Atualizada (`content.js`)**:
   - Injeção do botão de Toggle Flutuante estilizado (padrão Glassmorphism escuro com badge contador de itens e chave animada ON/OFF).
   - Observação contínua da esteira (`.alert_ca_conteudo` / `.box-conteudo`) via `MutationObserver`.
   - Marcação inteligente de itens (`data-is-correspondencia="true|false"`).
   - Ocultação imediata de passagens de pedestres, veículos e alertas quando o modo "Só Correspondências" está ativado.
   - Destaque em verde esmeralda com borda estilizada para as correspondências visíveis.
   - Persistência do estado de ativação no `localStorage`.

2. **Nova Extensão Independente Criada (`extensao_filtro_correspondencias/`)**:
   - Subpasta isolada e pronta para ser carregada no Chrome de computadores específicos:
     - `extensao_filtro_correspondencias/manifest.json` (Manifest V3 enxuto)
     - `extensao_filtro_correspondencias/content.js` (código autônomo e focado apenas nesta funcionalidade)

---

## 2. Como Instalar a Nova Extensão Isolada em Outros Computadores

1. Abra o Google Chrome e acesse `chrome://extensions`.
2. Ative a chave **Modo do desenvolvedor** no canto superior direito.
3. Clique em **Carregar sem compactação** (Load unpacked).
4. Selecione a pasta: `extensao_conselho_condominioDigital/extensao_filtro_correspondencias`.
5. Acesse o sistema do Condomínio Digital (`cond.aspx`) e visualize o botão flutuante **"SÓ CORRESPONDÊNCIAS"** no canto superior direito da tela.
