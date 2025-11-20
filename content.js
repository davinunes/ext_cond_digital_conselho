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
                        // console.log('[GRID] ⏳ Iframe ainda carregando...');
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

// Processa os itens dentro do documento do iframe
async function processIframeGrid(doc) {
    // Busca links que tenham ID e contenham o padrão de controle da lista
    // Esse seletor busca dentro do documento do IFRAME (doc), não do topo
    const items = doc.querySelectorAll('a[id*="lvLista_ctrl"][id$="_lnkEdit"]');
    
    if (items.length === 0) {
        // console.log('[GRID] ⚠️ Nenhum item encontrado na lista neste momento.');
        return;
    }

    // console.log(`[GRID] Encontrados ${items.length} itens na lista.`);

    items.forEach(async (link) => {
        const linkId = link.getAttribute('id');
        
        // Se já processamos e pintamos este item nesta sessão de carga, pula
        // (Isso economiza chamadas se o observer disparar múltiplas vezes)
        if (link.dataset.processed === 'true') return;

        // Extração do número do protocolo
        // Procura a div com a classe .esq.t80 que contém o texto "123456 | Livro..."
        const infoDiv = link.querySelector('.esq.t80');
        if (!infoDiv) return;

        const textContent = infoDiv.textContent || "";
        const match = textContent.match(/^(\d+)\s*\|/);
        
        if (match && match[1]) {
            const protocolo = parseInt(match[1], 10);
            
            // Marca o elemento DOM como processado
            link.dataset.processed = 'true';

            // Consulta a API
            const apiData = await checkExistingData(protocolo);
            
            // A div que deve mudar de cor é filha do link
            const divButton = link.querySelector('.color_button');
            
            if (divButton && apiData) {
                // Aplica transição suave
                divButton.style.transition = 'background-color 0.5s ease, border-left 0.3s ease';
                
                if (apiData.resolvido === 1) {
                    // VERDE CLARO (Resolvido)
                    divButton.style.backgroundColor = '#d1fae5'; // bg-emerald-100
                    divButton.style.borderLeft = '5px solid #059669'; // Borda verde
                    divButton.setAttribute('title', `✅ Protocolo ${protocolo}: Sincronizado e Resolvido`);
                } else {
                    // AZUL CLARO (Pendente)
                    divButton.style.backgroundColor = '#dbeafe'; // bg-blue-100
                    divButton.style.borderLeft = '5px solid #2563eb'; // Borda azul
                    divButton.setAttribute('title', `⚠️ Protocolo ${protocolo}: Sincronizado (Pendente)`);
                }
            }
        }
    });
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
    let formContainer = document.getElementById('condominio-extension-form');

    if (typeof extractedData.protocolo !== 'number' || extractedData.protocolo === 0) {
        if (formContainer) formContainer.remove();
        return;
    }
    
    if (!formContainer) {
        formContainer = document.createElement('div');
        formContainer.id = 'condominio-extension-form';
        formContainer.style.cssText = `position: fixed; bottom: 20px; right: 20px; background-color: #f0f4f8; border: 1px solid #d1d9e6; border-radius: 12px; padding: 20px; box-shadow: 0 8px 16px rgba(0, 0, 0, 0.2); z-index: 10000; font-family: 'Inter', sans-serif; color: #334155; max-width: 300px; display: flex; flex-direction: column; gap: 15px;`;

        formContainer.innerHTML = `
            <style>
                @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600&display=swap');
                @import url('https://fonts.googleapis.com/icon?family=Material+Icons');
                #condominio-extension-form h3 { margin-top: 0; margin-bottom: 15px; color: #1e293b; font-weight: 600; font-size: 1.2em; }
                #condominio-extension-form .extracted-data { background-color: #e2e8f0; padding: 10px; border-radius: 8px; font-size: 0.9em; color: #475569; display: flex; flex-direction: column; gap: 5px; }
                #condominio-extension-form label { display: flex; align-items: center; gap: 8px; font-size: 0.95em; cursor: pointer; color: #475569; }
                #condominio-extension-form input[type="checkbox"] { width: 18px; height: 18px; accent-color: #4f46e5; border-radius: 4px; }
                #condominio-extension-form button { background-color: #e2e8f0; color: #475569; padding: 12px 20px; border: none; border-radius: 8px; cursor: pointer; font-size: 1em; font-weight: 600; transition: background-color 0.3s ease, color 0.3s ease, transform 0.1s ease; box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1); }
                #condominio-extension-form button:hover { background-color: #d1d9e6; transform: translateY(-2px); }
                #condominio-extension-form button:active { transform: translateY(0); box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1); }
                #condominio-extension-form .feedback-icons { display: flex; justify-content: space-around; align-items: center; margin-top: 10px; min-height: 24px; }
                #condominio-extension-form .feedback-icon { font-family: 'Material Icons'; font-size: 24px; line-height: 1; animation: fadeOut 3s forwards; }
                #condominio-extension-form .feedback-icon.success { color: #16a34a; }
                #condominio-extension-form .feedback-icon.error { color: #dc2626; }
                @keyframes fadeOut { 0% { opacity: 1; } 80% { opacity: 1; } 100% { opacity: 0; } }
                #condominio-extension-form .close-button { position: absolute; top: 10px; right: 10px; background: none; border: none; font-size: 1.5em; color: #94a3b8; cursor: pointer; line-height: 1; }
                #condominio-extension-form .close-button:hover { color: #64748b; }
                #displayIframeUrl { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 100%; display: block; }
                .form-group { display: flex; flex-direction: column; gap: 8px; }
                select { width: 100%; padding: 8px; border-radius: 8px; border: 1px solid #cbd5e1; background-color: white; transition: all 0.3s ease; }
            </style>
            <h3>Registrar Ocorrência</h3>
            <div class="extracted-data">
                <span id="displayProtocolo"></span> <span id="displayDataHora"></span> <span id="displayBloco"></span> <span id="displayUnidade"></span> <span id="displayStatus"></span> <span id="displayIframeUrl"></span>
            </div>
            <label> <input type="checkbox" id="chkSubsindico"> Interação Subsíndico </label>
            <label> <input type="checkbox" id="chkSindico"> Interação Síndico </label>
            <label> <input type="checkbox" id="chkAdm"> Interação Adm. </label>
            <label> <input type="checkbox" id="chkResolvido"> Resolvido </label>
            <div class="form-group mt-3">
                <label class="text-sm" for="responsabilidadeSelect">Responsabilidade:</label>
                <select id="responsabilidadeSelect"> <option value="null">Não Atribuído</option> <option value="sub">Subsíndico</option> <option value="sindico">Síndico</option> </select>
            </div>
            <button id="sendDataBtn" class="mt-4">Sincronizar</button>
            <div id="feedbackIcons" class="feedback-icons"></div>
            <button class="close-button">&times;</button>
        `;

        document.body.appendChild(formContainer);

        // Lógica de Feedback Visual do Select
        const responsabilidadeSelect = document.getElementById('responsabilidadeSelect');
        const updateSelectStyle = () => {
            if (responsabilidadeSelect.value !== 'null' && responsabilidadeSelect.value !== '') {
                responsabilidadeSelect.style.borderColor = '#4f46e5';
                responsabilidadeSelect.style.backgroundColor = '#e0e7ff';
                responsabilidadeSelect.style.color = '#1e3a8a';
                responsabilidadeSelect.style.fontWeight = '600';
            } else {
                responsabilidadeSelect.style.borderColor = '#cbd5e1';
                responsabilidadeSelect.style.backgroundColor = 'white';
                responsabilidadeSelect.style.color = 'black';
                responsabilidadeSelect.style.fontWeight = 'normal';
            }
        };
        responsabilidadeSelect.addEventListener('change', updateSelectStyle);

        document.getElementById('sendDataBtn').addEventListener('click', async () => {
            let currentExtractedData;
            const iframe = document.getElementById('IFRAME_DETALHE');
            if (iframe && iframe.contentDocument) {
                currentExtractedData = extractData(iframe.contentDocument);
            } else {
                currentExtractedData = extractData(document);
            }

            const formData = new URLSearchParams();
            formData.append('id', currentExtractedData.protocolo);
            formData.append('abertura', currentExtractedData.dataHora);
            formData.append('bloco', currentExtractedData.bloco);
            formData.append('unidade', currentExtractedData.unidade);
            formData.append('url', currentExtractedData.iframeUrl);
            formData.append('status', currentExtractedData.status);
            formData.append('total_mensagens', currentExtractedData.total_mensagens);
            formData.append('data_ultima_mensagem', currentExtractedData.data_ultima_mensagem);
            
            formData.append('subsindico', document.getElementById('chkSubsindico').checked ? 'Sim' : 'Não');
            formData.append('sindico', document.getElementById('chkSindico').checked ? 'Sim' : 'Não');
            
            const responsabilidadeValue = responsabilidadeSelect.value === 'null' ? '' : responsabilidadeSelect.value;
            formData.append('responsabilidade', responsabilidadeValue);

            formData.append('adm', document.getElementById('chkAdm').checked ? 'Sim' : 'Não');
            formData.append('resolvido', document.getElementById('chkResolvido').checked ? 'Sim' : 'Não');

            const feedbackIconsContainer = document.getElementById('feedbackIcons');
            feedbackIconsContainer.innerHTML = '';

            const phpWebhookUrl = 'https://mini.davinunes.eti.br/ocorrenciasCondominioDigital/upsert.php';

            try {
                const response = await fetch(phpWebhookUrl, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                    body: formData.toString()
                });

                let result;
                try { result = await response.json(); } catch (e) { result = { status: 'error', message: 'Resposta inválida.' }; }

                const success = response.ok && result.status === 'success';
                const icon = document.createElement('span');
                icon.className = 'feedback-icon material-icons';
                icon.textContent = success ? 'check_circle' : 'cancel';
                icon.classList.add(success ? 'success' : 'error');
                icon.title = success ? `Sucesso: ${result.action} - ID: ${result.id}` : `Erro: ${result.message}`;
                feedbackIconsContainer.appendChild(icon);

                if (success) {
                    // Se sucesso, atualiza o formulário e também reprocessa a grid no iframe
                    if (iframe && iframe.contentDocument) injectForm(iframe.contentDocument);
                    else injectForm(document);
                    
                    // ATUALIZA A GRID DEPOIS DE SINCRONIZAR (Procura o iframe IFC)
                    const listIframe = document.getElementById('IFC');
                    if (listIframe && listIframe.contentDocument) {
                        processIframeGrid(listIframe.contentDocument);
                    }
                }
            } catch (error) {
                const errorIcon = document.createElement('span');
                errorIcon.className = 'feedback-icon material-icons error';
                errorIcon.textContent = 'error'; errorIcon.title = 'Erro de rede.';
                feedbackIconsContainer.appendChild(errorIcon);
            }
        });

        document.querySelector('#condominio-extension-form .close-button').addEventListener('click', () => {
            formContainer.remove();
        });
    }
    
    updateDisplayedData(extractedData);
    
    const existingData = await checkExistingData(extractedData.protocolo);
    
    if (existingData) {
        formContainer.style.backgroundColor = '#bbf7d0';
        fillFormFromApi(existingData);
    } else {
        formContainer.style.backgroundColor = '#f0f4f8';
        if (formContainer) {
            document.getElementById('chkAdm').checked = false;
            document.getElementById('chkResolvido').checked = false;
            document.getElementById('chkSubsindico').checked = false;
            document.getElementById('chkSindico').checked = false;
            const select = document.getElementById('responsabilidadeSelect');
            if (select) {
                select.value = 'null';
                select.dispatchEvent(new Event('change'));
            }
        }
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
        
        // --- INICIA MONITORAMENTO DA GRID NO IFRAME 'IFC' ---
        initGridMonitoring();
        // ----------------------------------------------------

        const iframe = document.getElementById('IFRAME_DETALHE');
        if (iframe) {
            console.log('[DEBUG GLOBAL] Iframe de Detalhes encontrado.');
            iframe.addEventListener('load', () => {
                try {
                    const extractedData = extractData(iframe.contentDocument);
                    if (typeof extractedData.protocolo === 'number') {
                        injectForm(iframe.contentDocument);
                    }
                } catch (e) {
                    console.error("Erro ao acessar contentDocument do iframe:", e);
                }
            });
            setTimeout(() => {
                if (iframe.contentDocument && iframe.contentDocument.readyState === 'complete') {
                    const extractedData = extractData(iframe.contentDocument);
                    if (typeof extractedData.protocolo === 'number') {
                        injectForm(iframe.contentDocument);
                    }
                }
            }, 500);
        }
    }
});