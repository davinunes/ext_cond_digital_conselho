// content.js

// --- GESTÃO DE ESTADO DA GRID ---
const processedGridItems = new Set(); // Para evitar chamadas duplicadas à API
let gridDebounceTimer; // Controle de debounce do observer

// --- FUNÇÕES DE GRID (LISTAGEM NO IFRAME IFC) ---

// Função principal que inicia o monitoramento
function initGridMonitoring() {
    console.log('[GRID] 🚀 Iniciando monitoramento da grid (via Iframe IFC)...');

    // Função recursiva para encontrar o iframe
    const findAndAttachToIframe = () => {
        const iframe = document.getElementById('IFC');

        if (iframe) {
            console.log('[GRID] ✅ Iframe IFC encontrado.');

            // Função para configurar o observer DENTRO do iframe
            const setupObserver = () => {
                try {
                    // Tenta acessar o documento interno do iframe
                    const doc = iframe.contentDocument || iframe.contentWindow.document;

                    // Verifica se o documento está pronto e acessível
                    if (doc && doc.readyState === 'complete' && doc.body) {
                        console.log('[GRID] 📄 Documento do iframe acessível e pronto.');

                        // 1. Processa a grid imediatamente
                        processIframeGrid(doc);

                        // 2. Configura o MutationObserver no corpo do iframe
                        // Isso detecta paginação, filtros ou recarregamentos parciais (UpdatePanel)
                        const observer = new MutationObserver((mutations) => {
                            let shouldUpdate = false;
                            mutations.forEach(mutation => {
                                if (mutation.addedNodes.length > 0) shouldUpdate = true;
                            });

                            if (shouldUpdate) {
                                clearTimeout(gridDebounceTimer);
                                gridDebounceTimer = setTimeout(() => {
                                    // console.log('[GRID] 🔄 Mudança detectada no iframe, reprocessando...');
                                    processIframeGrid(doc);
                                }, 500);
                            }
                        });

                        observer.observe(doc.body, { childList: true, subtree: true });
                        console.log('[GRID] 👀 Observer anexado ao corpo do iframe.');

                    } else {
                        // Se o doc não estiver pronto, tenta de novo em breve
                        setTimeout(setupObserver, 1000);
                    }
                } catch (e) {
                    console.error('[GRID] 🚫 Erro ao acessar iframe (Bloqueio CORS ou não carregado):', e);
                    setTimeout(setupObserver, 2000); // Tenta de novo em caso de erro temporário
                }
            };

            // Tenta configurar agora (caso já esteja carregado)
            setupObserver();

            // E garante que configure também quando o evento 'load' disparar (recarregamentos)
            iframe.addEventListener('load', () => {
                console.log('[GRID] 🔄 Evento load do iframe disparado.');
                setTimeout(setupObserver, 500); // Pequeno delay para garantir renderização
            });

        } else {
            console.log('[GRID] ⏳ Iframe IFC não encontrado. Tentando novamente em 1s...');
            setTimeout(findAndAttachToIframe, 1000);
        }
    };

    findAndAttachToIframe();
}

// Função para consultar múltiplos IDs de uma vez (Lote/Batch)
async function checkBatchExistingData(ids) {
    if (!ids || ids.length === 0) return null;

    console.log('[GRID API] 📤 Consultando lote de IDs:', ids); // DEBUG: IDs enviados

    const checkUrl = `https://mini.davinunes.eti.br/ocorrenciasCondominioDigital/check.php`;
    const formData = new URLSearchParams();
    formData.append('ids', ids.join(',')); // Envia IDs separados por vírgula: "123,456,789"

    try {
        // Usamos POST para evitar limites de URL em query string muito longas
        const response = await fetch(checkUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: formData.toString(),
            cache: 'no-cache'
        });

        if (!response.ok) {
            console.error(`[GRID API] ❌ Erro na requisição em lote: ${response.status}`);
            return null;
        }

        const result = await response.json();
        console.log('[GRID API] 📩 Resposta do lote:', result); // DEBUG: Resposta da API

        if (result.status === 'success' && result.data) {
            // Transforma o array de resultados em um objeto indexado pelo ID para acesso rápido
            // Ex: { 123: {id: 123, resolvido: 1...}, 456: {id: 456, resolvido: 0...} }
            const dataMap = {};
            result.data.forEach(item => {
                dataMap[item.id] = item;
            });
            return dataMap;
        }
        return null;
    } catch (error) {
        console.error('[GRID API] ❌ Erro de rede:', error);
        return null;
    }
}

// Processa os itens dentro do documento do iframe
async function processIframeGrid(doc) {
    // Busca links que tenham ID e contenham o padrão de controle da lista
    const items = doc.querySelectorAll('a[id*="lvLista_ctrl"][id$="_lnkEdit"]');

    if (items.length === 0) return;

    // Arrays para armazenar o que precisamos processar
    const itemsToFetch = [];
    const idsToFetch = [];

    // 1ª Passada: Coletar IDs que precisam ser verificados
    items.forEach((link) => {
        const linkId = link.getAttribute('id');

        // Se já processamos este elemento específico (pelo ID do DOM), pula
        // Nota: Usamos dataset no elemento para controlar o estado visual
        if (link.dataset.processed === 'true') return;

        // Extração do número do protocolo
        const infoDiv = link.querySelector('.esq.t80');
        if (!infoDiv) return;

        const textContent = infoDiv.textContent || "";
        const match = textContent.match(/^(\d+)\s*\|/);

        if (match && match[1]) {
            const protocolo = parseInt(match[1], 10);

            // Marca como processado para não pegar na próxima varredura do observer
            link.dataset.processed = 'true';

            // Adiciona à lista de busca
            itemsToFetch.push({ element: link, id: protocolo });
            idsToFetch.push(protocolo);
        }
    });

    // Se não há nada novo para buscar, sai
    if (idsToFetch.length === 0) return;

    // console.log(`[GRID] Buscando ${idsToFetch.length} protocolos em lote...`);

    // 2ª Passada: Consultar API e Atualizar Interface
    const apiDataMap = await checkBatchExistingData(idsToFetch);

    if (apiDataMap) {
        itemsToFetch.forEach(({ element, id }) => {
            const data = apiDataMap[id];

            // Se encontrou dados para este ID
            if (data) {
                const divButton = element.querySelector('.color_button');

                if (divButton) {
                    divButton.style.transition = 'background-color 0.5s ease, border-left 0.3s ease';

                    if (data.resolvido === 1) {
                        // VERDE CLARO (Resolvido)
                        divButton.style.backgroundColor = '#0add3fff'; // bg-emerald-100
                        divButton.style.borderLeft = '5px solid #059669'; // Borda verde
                        divButton.setAttribute('title', `✅ Protocolo ${id}: Resolvido em ${data.ultimaAtualizacao}`);
                    } else {
                        // AZUL CLARO (Pendente)
                        divButton.style.backgroundColor = '#dbeafe'; // bg-blue-100
                        divButton.style.borderLeft = '5px solid #2563eb'; // Borda azul
                        divButton.setAttribute('title', `⚠️ Protocolo ${id}: Sincronizado (Pendente)`);
                    }
                }
            }
        });
    }
}

// --- FIM FUNÇÕES DE GRID ---


// Função para aplicar correções de estilo e altura na página de detalhes
function applyDetailPageStyles() {
    const elementsToFix = ['.content_iframe', '.lv_detalhe', '#ctl00_conteudo_uppEdit'];
    elementsToFix.forEach(selector => {
        const el = document.querySelector(selector);
        if (el) {
            el.style.height = 'auto';
            el.style.maxHeight = 'none';
            el.style.overflow = 'visible';
        }
    });
    document.querySelectorAll('.linha[style*="padding: 0 0 12% 0"]').forEach(el => {
        el.style.paddingBottom = '30px';
    });
    document.body.style.minHeight = '100vh';
    document.documentElement.style.height = 'auto';
    console.log('[DETALHES] Estilos de página cheia aplicados.');
}

function extractData(contextDocument) {
    const data = {};
    const protocoloElement = contextDocument.getElementById('ctl00_conteudo_lblProtocolo');
    const dataHoraElement = contextDocument.getElementById('ctl00_conteudo_lblEm');
    const perfilOcorrenciaDiv = contextDocument.querySelector('.perfil_ocorrencia');
    const statusSelectElement = contextDocument.getElementById('ctl00_conteudo_ddlStatus');
    const comentGridDiv = contextDocument.querySelector('.coment-grid');

    let rawProtocolo = protocoloElement ? protocoloElement.textContent.trim() : 'Não encontrado';
    data.protocolo = parseInt(rawProtocolo, 10);
    if (isNaN(data.protocolo)) data.protocolo = rawProtocolo;

    data.dataHora = dataHoraElement ? dataHoraElement.textContent.trim() : 'Não encontrado';
    data.bloco = 'Z';
    data.unidade = '999';

    if (perfilOcorrenciaDiv) {
        const blocoElement = perfilOcorrenciaDiv.querySelector('div.esq.t100.s11.truncate:nth-child(2)');
        if (blocoElement) {
            const blocoText = blocoElement.textContent.trim();
            const blocoMatch = blocoText.match(/Bloco\s+([A-Za-z])/);
            if (blocoMatch && blocoMatch[1]) data.bloco = blocoMatch[1].toUpperCase();
            const unidadeMatch = blocoText.match(/-\s*(\d+)/);
            if (unidadeMatch && unidadeMatch[1]) data.unidade = unidadeMatch[1].trim();
        }
    } else if (comentGridDiv) {
        const firstMessageLine = comentGridDiv.querySelector('.linha[style*="padding: 0 0 12% 0"]');
        if (firstMessageLine) {
            const firstPerfil = firstMessageLine.querySelector('.perfil_ocorrencia');
            if (firstPerfil) {
                const blocoElement = firstPerfil.querySelector('div.esq.t100.s11.truncate:nth-child(2)');
                if (blocoElement) {
                    const blocoText = blocoElement.textContent.trim();
                    const blocoMatch = blocoText.match(/Bloco\s+([A-Za-z])/);
                    if (blocoMatch && blocoMatch[1]) data.bloco = blocoMatch[1].toUpperCase();
                    const unidadeMatch = blocoText.match(/-\s*(\d+)/);
                    if (unidadeMatch && unidadeMatch[1]) data.unidade = unidadeMatch[1].trim();
                }
            }
        }
    }

    data.status = statusSelectElement && statusSelectElement.options[statusSelectElement.selectedIndex] ?
        statusSelectElement.options[statusSelectElement.selectedIndex].textContent : 'Não encontrado';

    const iframe = document.getElementById('IFRAME_DETALHE');
    data.iframeUrl = iframe && iframe.src ? iframe.src : window.location.href;

    if (comentGridDiv) {
        const messageLines = comentGridDiv.querySelectorAll('.linha[style*="padding: 0 0 12% 0"]');
        data.total_mensagens = messageLines ? messageLines.length : 0;
        if (messageLines.length > 0) {
            const lastMessageLine = messageLines[messageLines.length - 1];
            const dateElementOriginal = lastMessageLine.querySelector('.perfil_ocorrencia > div.esq.t100.s11.truncate:nth-child(3)');
            const dateTextOriginal = dateElementOriginal ? dateElementOriginal.textContent.trim() : '';
            const dateTimeMatchOriginal = dateTextOriginal.match(/(\d{2}\/\d{2}\/\d{4}\s\d{2}:\d{2}:\d{2})/);
            data.data_ultima_mensagem = dateTimeMatchOriginal ? dateTimeMatchOriginal[1] : 'Não encontrado';
        } else { data.data_ultima_mensagem = 'Não encontrado'; }
    } else { data.total_mensagens = 0; data.data_ultima_mensagem = 'Não encontrado'; }

    return data;
}

async function checkExistingData(protocolo) {
    if (!protocolo || typeof protocolo !== 'number') return null;
    const checkUrl = `https://mini.davinunes.eti.br/ocorrenciasCondominioDigital/check.php?id=${protocolo}`;
    try {
        const response = await fetch(checkUrl, { cache: 'no-cache' });
        if (!response.ok) return null;
        const result = await response.json();
        if (result.status === 'success' && result.data && Object.keys(result.data).length > 0) return result.data;
        return null;
    } catch (error) { return null; }
}

async function checkUnitData(bloco, unidade) {
    if (!bloco || !unidade) return null;
    const checkUrl = `https://mini.davinunes.eti.br/ocorrenciasCondominioDigital/check.php?bloco=${bloco}&unidade=${unidade}`;
    try {
        const response = await fetch(checkUrl, { cache: 'no-cache' });
        if (!response.ok) return null;
        const result = await response.json();
        if (result.status === 'success' && result.data) return result.data;
        return null;
    } catch (error) { return null; }
}

function updateDisplayedData(extractedData) {
    const displayProtocolo = document.getElementById('displayProtocolo');
    const displayDataHora = document.getElementById('displayDataHora');
    const theDisplayBloco = document.getElementById('displayBloco');
    const displayUnidade = document.getElementById('displayUnidade');
    const displayStatus = document.getElementById('displayStatus');
    const displayIframeUrl = document.getElementById('displayIframeUrl');

    if (displayProtocolo) displayProtocolo.textContent = `Protocolo: ${extractedData.protocolo}`;
    if (displayDataHora) displayDataHora.textContent = `Data/Hora: ${extractedData.dataHora}`;
    if (theDisplayBloco) theDisplayBloco.textContent = `Bloco: ${extractedData.bloco}`;
    if (displayUnidade) displayUnidade.textContent = `Unidade: ${extractedData.unidade}`;
    if (displayStatus) displayStatus.textContent = `Status: ${extractedData.status}`;
    if (displayIframeUrl) displayIframeUrl.textContent = `URL do Iframe: ${extractedData.iframeUrl}`;
}

function fillFormFromApi(apiData) {
    if (apiData) {
        const chkSubsindico = document.getElementById('chkSubsindico');
        if (chkSubsindico) chkSubsindico.checked = apiData.sub === 1;
        const chkSindico = document.getElementById('chkSindico');
        if (chkSindico) chkSindico.checked = apiData.sindico === 1;
        const chkAdm = document.getElementById('chkAdm');
        if (chkAdm) chkAdm.checked = apiData.adm === 1;
        const chkResolvido = document.getElementById('chkResolvido');
        if (chkResolvido) chkResolvido.checked = apiData.resolvido === 1;
        const responsabilidadeSelect = document.getElementById('responsabilidadeSelect');
        if (responsabilidadeSelect) {
            responsabilidadeSelect.value = apiData.responsabilidade || 'null';
            responsabilidadeSelect.dispatchEvent(new Event('change'));
        }
    }
}

async function injectForm(sourceDocument) {
    const extractedData = extractData(sourceDocument);

    // 1. Gerenciamento do Form de Registro (Canto da tela)
    let masterContainer = document.getElementById('condominio-extension-master');
    if (typeof extractedData.protocolo !== 'number' || extractedData.protocolo === 0) {
        if (masterContainer) masterContainer.remove();
        return;
    }

    if (!masterContainer) {
        masterContainer = document.createElement('div');
        masterContainer.id = 'condominio-extension-master';
        masterContainer.style.cssText = `position: fixed; bottom: 20px; right: 20px; z-index: 10000; pointer-events: none;`;
        document.body.appendChild(masterContainer);
    }

    // Estilos Globais (Injetados apenas uma vez)
    if (!document.getElementById('condominio-extension-styles')) {
        const style = document.createElement('style');
        style.id = 'condominio-extension-styles';
        style.textContent = `
            @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600&display=swap');
            @import url('https://fonts.googleapis.com/icon?family=Material+Icons');
            
            .stack-card { 
                position: absolute; 
                background-color: #f0f4f8; 
                border: 1px solid #d1d9e6; 
                border-radius: 12px; 
                padding: 12px; 
                box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15); 
                font-family: 'Inter', sans-serif; 
                color: #334155; 
                transition: all 0.3s ease;
                pointer-events: auto;
                cursor: pointer;
                width: 180px;
                z-index: -1;
            }

            .stack-card:hover {
                transform: translateX(-20px) !important;
                background-color: #ffffff;
                z-index: 1;
            }

            .main-form-card {
                background-color: #f0f4f8; 
                border: 1px solid #d1d9e6; 
                border-radius: 12px; 
                padding: 20px; 
                box-shadow: 0 8px 24px rgba(0, 0, 0, 0.2); 
                font-family: 'Inter', sans-serif; 
                color: #334155; 
                width: 300px;
                pointer-events: auto;
            }

            .occurrence-badge { background: #4f46e5; color: white; border-radius: 20px; padding: 2px 8px; font-size: 0.7em; }
            .extracted-data { background-color: #e2e8f0; padding: 10px; border-radius: 8px; font-size: 0.85em; color: #475569; display: flex; flex-direction: column; gap: 4px; margin-bottom: 12px; }
            .form-group-check { display: flex; align-items: center; gap: 8px; font-size: 0.9em; cursor: pointer; color: #475569; margin-bottom: 6px; }
            .btn-sync { background-color: #4f46e5; color: white; padding: 10px; border: none; border-radius: 8px; cursor: pointer; font-size: 1em; font-weight: 600; width: 100%; transition: all 0.3s; margin-top: 10px; }
            .btn-sync:hover { background-color: #4338ca; }
            .feedback-icons { display: flex; justify-content: center; height: 30px; margin-top: 5px; }
            @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        `;
        document.head.appendChild(style);
    }

    // 2. Busca Ocorrências da Unidade
    const allUnitOccurrences = await checkUnitData(extractedData.bloco, extractedData.unidade) || [];
    const others = allUnitOccurrences.filter(o => o.id != extractedData.protocolo);

    // 3. Limpeza e Preparação
    masterContainer.innerHTML = ''; // Limpa o form anterior
    document.querySelectorAll('.condominio-stack-card').forEach(el => el.remove()); // Remove orelhas antigas

    const modalContent = document.getElementById('DETALHE');
    const modalContainer = modalContent ? modalContent.closest('.ui-dialog') : null;
    const isDirectView = !modalContainer;
    const targetForCards = modalContainer || masterContainer;

    // 4. Constrói o Form Principal (Sempre no masterContainer)
    const formCard = document.createElement('div');
    formCard.className = 'main-form-card';

    const countBadge = allUnitOccurrences.length > 0 ? `<span class="occurrence-badge">${allUnitOccurrences.length}</span>` : '';

    formCard.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px;">
            <h3 style="margin: 0; font-size: 1.1em; font-weight: 600;">Registrar Ocorrência ${countBadge}</h3>
            <button class="close-btn" style="background: none; border: none; font-size: 1.5em; color: #94a3b8; cursor: pointer;">&times;</button>
        </div>
        <div class="extracted-data">
            <b>Protocolo: ${extractedData.protocolo}</b>
            <span>${extractedData.dataHora}</span>
            <div style="display: flex; gap: 10px; margin-top: 4px; border-top: 1px solid #cbd5e1; padding-top: 4px;">
                <span>Bloco: ${extractedData.bloco}</span>
                <span>Unidade: ${extractedData.unidade}</span>
            </div>
            <span style="color: #4f46e5; font-weight: 600;">${extractedData.status}</span>
        </div>
        
        <label class="form-group-check"> <input type="checkbox" id="chkSubsindico"> Interação Subsíndico </label>
        <label class="form-group-check"> <input type="checkbox" id="chkSindico"> Interação Síndico </label>
        <label class="form-group-check"> <input type="checkbox" id="chkAdm"> Interação Adm. </label>
        <label class="form-group-check"> <input type="checkbox" id="chkResolvido"> Resolvido </label>
        
        <div style="margin-top: 8px;">
            <label style="font-size: 0.8em; color: #64748b;">Responsabilidade:</label>
            <select id="responsabilidadeSelect" style="width: 100%; padding: 6px; border-radius: 6px; border: 1px solid #cbd5e1; margin-top: 2px;"> 
                <option value="null">Não Atribuído</option> 
                <option value="sub">Subsíndico</option> 
                <option value="sindico">Síndico</option> 
            </select>
        </div>
        
        <button id="sendDataBtn" class="btn-sync">Sincronizar</button>
        <div id="feedbackIcons" class="feedback-icons"></div>
    `;

    masterContainer.appendChild(formCard);

    // 5. Constrói as Orelhinhas (Histórico)
    if (targetForCards && others.length > 0) {
        others.slice(0, 5).forEach((occ, index) => {
            const bgCard = document.createElement('div');
            bgCard.className = 'stack-card condominio-stack-card';

            if (isDirectView) {
                bgCard.style.top = `${10 + (index * 65)}px`;
                bgCard.style.right = `285px`;
            } else {
                bgCard.style.top = `${60 + (index * 70)}px`;
                bgCard.style.left = `-160px`;
            }
            bgCard.style.zIndex = -1 - index;

            bgCard.innerHTML = `
                <div style="font-size: 0.75em; font-weight: 600;">#${occ.id}</div>
                <div style="font-size: 0.65em; color: #64748b; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${occ.status}</div>
                <div style="font-size: 0.6em; color: #4f46e5; margin-top: 4px;">Clique para abrir</div>
            `;

            bgCard.addEventListener('click', () => {
                if (isDirectView) window.location.href = occ.url;
                else if (document.getElementById('IFRAME_DETALHE')) document.getElementById('IFRAME_DETALHE').src = occ.url;
            });

            targetForCards.appendChild(bgCard);
        });
    }

    // Eventos
    const responsabilidadeSelect = formCard.querySelector('#responsabilidadeSelect');
    formCard.querySelector('.close-btn').addEventListener('click', () => masterContainer.remove());

    formCard.querySelector('#sendDataBtn').addEventListener('click', async () => {
        // Lógica de sincronização
        const feedbackContainer = formCard.querySelector('#feedbackIcons');
        feedbackContainer.innerHTML = '<span class="material-icons" style="animation: spin 1s infinite linear">sync</span>';

        const formData = new URLSearchParams();
        formData.append('id', extractedData.protocolo);
        formData.append('abertura', extractedData.dataHora);
        formData.append('bloco', extractedData.bloco);
        formData.append('unidade', extractedData.unidade);
        formData.append('url', extractedData.iframeUrl);
        formData.append('status', extractedData.status);
        formData.append('total_mensagens', extractedData.total_mensagens);
        formData.append('data_ultima_mensagem', extractedData.data_ultima_mensagem);
        formData.append('subsindico', formCard.querySelector('#chkSubsindico').checked ? 'Sim' : 'Não');
        formData.append('sindico', formCard.querySelector('#chkSindico').checked ? 'Sim' : 'Não');
        formData.append('adm', formCard.querySelector('#chkAdm').checked ? 'Sim' : 'Não');
        formData.append('resolvido', formCard.querySelector('#chkResolvido').checked ? 'Sim' : 'Não');
        formData.append('responsabilidade', responsabilidadeSelect.value === 'null' ? '' : responsabilidadeSelect.value);

        try {
            const response = await fetch('https://mini.davinunes.eti.br/ocorrenciasCondominioDigital/upsert.php', {
                method: 'POST',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                body: formData.toString()
            });
            const result = await response.json();
            const success = response.ok && result.status === 'success';
            feedbackContainer.innerHTML = `<span class="material-icons ${success ? 'success' : 'error'}">${success ? 'check_circle' : 'cancel'}</span>`;
            if (success) {
                injectForm(sourceDocument);
                const listIframe = document.getElementById('IFC');
                if (listIframe && listIframe.contentDocument) {
                    processedGridItems.clear();
                    processIframeGrid(listIframe.contentDocument);
                }
            }
        } catch (e) {
            feedbackContainer.innerHTML = '<span class="material-icons error">error</span>';
        }
    });

    // Estado inicial
    const existingInDb = allUnitOccurrences.find(o => o.id == extractedData.protocolo);
    if (existingInDb) {
        formCard.style.backgroundColor = '#b5fbd3';
        formCard.querySelector('#chkSubsindico').checked = existingInDb.sub === 1;
        formCard.querySelector('#chkSindico').checked = existingInDb.sindico === 1;
        formCard.querySelector('#chkAdm').checked = existingInDb.adm === 1;
        formCard.querySelector('#chkResolvido').checked = existingInDb.resolvido === 1;
        responsabilidadeSelect.value = existingInDb.responsabilidade || 'null';
    }
}


// Lógica principal de injeção da extensão
window.addEventListener('load', () => {
    console.log('[DEBUG GLOBAL] Extensão carregada. URL atual:', window.location.href);

    const pathname = window.location.pathname;

    if (pathname.includes('mensagem_detalhe.aspx')) {
        console.log('[DEBUG GLOBAL] Página de detalhes detectada.');
        applyDetailPageStyles();
        const extractedData = extractData(document);
        if (typeof extractedData.protocolo === 'number') {
            injectForm(document);
        }
    } else if (pathname.includes('mensagensV1.aspx')) {
        console.log('[DEBUG GLOBAL] Página de listagem (mensagensV1) detectada.');

        // --- NOVA FUNCIONALIDADE: Processar grid na página principal ---
        initGridMonitoring();
        // ---------------------------------------------------------------

        const iframe = document.getElementById('IFRAME_DETALHE');
        if (iframe) {
            console.log('[DEBUG GLOBAL] Iframe encontrado na página de listagem.');
            iframe.addEventListener('load', () => {
                console.log('[DEBUG GLOBAL] Iframe disparou evento LOAD.');
                try {
                    const extractedData = extractData(iframe.contentDocument);
                    if (typeof extractedData.protocolo === 'number') {
                        injectForm(iframe.contentDocument);
                    }
                } catch (e) {
                    console.error("[DEBUG GLOBAL] Erro ao acessar contentDocument do iframe:", e);
                }
            });
            setTimeout(() => {
                if (iframe.contentDocument && iframe.contentDocument.readyState === 'complete') {
                    console.log('[DEBUG GLOBAL] Timeout fallback: Iframe completo, tentando injetar.');
                    const extractedData = extractData(iframe.contentDocument);
                    if (typeof extractedData.protocolo === 'number') {
                        injectForm(iframe.contentDocument);
                    }
                }
            }, 500);
        } else {
            console.log('[DEBUG GLOBAL] Iframe NÃO encontrado na página de listagem.');
        }
    }
});