// content.js

// Function to extract data from a specific document (can be the main document or the iframe's document)
function extractData(contextDocument) {
    const data = {};

    // Extração de dados
    const protocoloElement = contextDocument.getElementById('ctl00_conteudo_lblProtocolo');
    const dataHoraElement = contextDocument.getElementById('ctl00_conteudo_lblEm');
    const perfilOcorrenciaDiv = contextDocument.querySelector('.perfil_ocorrencia');
    const statusSelectElement = contextDocument.getElementById('ctl00_conteudo_ddlStatus');
    const comentGridDiv = contextDocument.querySelector('.coment-grid');

    // Processamento do Protocolo
    let rawProtocolo = protocoloElement ? protocoloElement.textContent.trim() : 'Não encontrado';
    data.protocolo = parseInt(rawProtocolo, 10);
    if (isNaN(data.protocolo)) {
        data.protocolo = rawProtocolo;
    }

    // Processamento da Data e Hora
    data.dataHora = dataHoraElement ? dataHoraElement.textContent.trim() : 'Não encontrado';

    // Processamento do Bloco e Unidade
    if (perfilOcorrenciaDiv) {
        const blocoElement = perfilOcorrenciaDiv.querySelector('div.esq.t100.s11.truncate:nth-child(2)');
        if (blocoElement) {
            const blocoText = blocoElement.textContent.trim();
            const blocoMatch = blocoText.match(/Bloco\s+([A-Za-z])/);
            data.bloco = blocoMatch && blocoMatch[1] ? blocoMatch[1].toUpperCase() : 'Não encontrado';
            const unidadeMatch = blocoText.match(/-\s*(\d+)/);
            data.unidade = unidadeMatch && unidadeMatch[1] ? unidadeMatch[1].trim() : 'Não encontrado';
        } else {
            data.bloco = 'Não encontrado';
            data.unidade = 'Não encontrado';
        }
    } else {
        data.bloco = 'Bloco não encontrado';
        data.unidade = 'Unidade não encontrada';
    }

    // Processamento do Status
    data.status = statusSelectElement && statusSelectElement.options[statusSelectElement.selectedIndex] ? 
                  statusSelectElement.options[statusSelectElement.selectedIndex].textContent : 'Não encontrado';

    // URL
    const iframe = document.getElementById('IFRAME_DETALHE');
    data.iframeUrl = iframe && iframe.src ? iframe.src : window.location.href;

    // Extração de total de mensagens e data da última mensagem
    if (comentGridDiv) {
        const messageLines = comentGridDiv.querySelectorAll('.linha[style*="padding: 0 0 12% 0"]');
        data.total_mensagens = messageLines ? messageLines.length : 0;
        if (messageLines.length > 0) {
            const lastMessageLine = messageLines[messageLines.length - 1];
            const dateElement = lastMessageLine.querySelector('.perfil_ocorrencia > div.esq.t100.s11.truncate:nth-child(3)');
            const dateText = dateElement ? dateElement.textContent.trim() : '';
            const dateTimeMatch = dateText.match(/(\d{2}\/\d{2}\/\d{4}\s\d{2}:\d{2}:\d{2})/);
            data.data_ultima_mensagem = dateTimeMatch ? dateTimeMatch[1] : 'Não encontrado';
        } else {
            data.data_ultima_mensagem = 'Não encontrado';
        }
    } else {
        data.total_mensagens = 0;
        data.data_ultima_mensagem = 'Não encontrado';
    }

    return data;
}

// Função para checar a existência de dados na API
async function checkExistingData(protocolo) {
    if (!protocolo || typeof protocolo !== 'number') {
        console.warn("Protocolo inválido para a verificação da API.");
        return null;
    }
    const checkUrl = `https://mini.davinunes.eti.br/ocorrenciasCondominioDigital/check.php?id=${protocolo}`;
    
    try {
        const response = await fetch(checkUrl);
        if (!response.ok) {
            console.error(`Erro na requisição de checagem da API: ${response.status} ${response.statusText}`);
            return null;
        }
        const result = await response.json();
        if (result.status === 'success' && result.data && Object.keys(result.data).length > 0) {
            return result.data;
        }
        return null;
    } catch (error) {
        console.error('Erro de rede na checagem da API:', error);
        return null;
    }
}

// Função para atualizar os dados exibidos no formulário
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

// Função para preencher os checkboxes e botões com base nos dados da API
function fillFormFromApi(apiData) {
    if (apiData) {
        document.getElementById('chkSubsindico').checked = apiData.sub === 1;
        document.getElementById('chkSindico').checked = apiData.sindico === 1;
        document.getElementById('chkAdm').checked = apiData.adm === 1;
        document.getElementById('chkResolvido').checked = apiData.resolvido === 1;

        const buttons = document.querySelectorAll('#responsabilidade-buttons button');
        buttons.forEach(btn => btn.classList.remove('active'));

        if (apiData.responsabilidade === 'sindico') {
            document.getElementById('btnSindico').classList.add('active');
        } else if (apiData.responsabilidade === 'sub') {
            document.getElementById('btnSub').classList.add('active');
        }
    }
}

// Function to create and inject the mini-form into the main page
async function injectForm(sourceDocument) {
    const extractedData = extractData(sourceDocument);
    let formContainer = document.getElementById('condominio-extension-form');

    if (typeof extractedData.protocolo !== 'number' || extractedData.protocolo === 0) {
        if (formContainer) {
            formContainer.remove();
        }
        return;
    }
    
    if (!formContainer) {
        formContainer = document.createElement('div');
        formContainer.id = 'condominio-extension-form';
        formContainer.style.cssText = `
            position: fixed;
            bottom: 20px;
            right: 20px;
            background-color: #f0f4f8;
            border: 1px solid #d1d9e6;
            border-radius: 12px;
            padding: 20px;
            box-shadow: 0 8px 16px rgba(0, 0, 0, 0.2);
            z-index: 10000;
            font-family: 'Inter', sans-serif;
            color: #334155;
            max-width: 300px;
            display: flex;
            flex-direction: column;
            gap: 15px;
        `;

        formContainer.innerHTML = `
            <style>
                @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600&display=swap');
                @import url('https://fonts.googleapis.com/icon?family=Material+Icons');

                #condominio-extension-form h3 {
                    margin-top: 0;
                    margin-bottom: 15px;
                    color: #1e293b;
                    font-weight: 600;
                    font-size: 1.2em;
                }
                #condominio-extension-form .extracted-data {
                    background-color: #e2e8f0;
                    padding: 10px;
                    border-radius: 8px;
                    font-size: 0.9em;
                    color: #475569;
                    display: flex;
                    flex-direction: column;
                    gap: 5px;
                }
                #condominio-extension-form label {
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    font-size: 0.95em;
                    cursor: pointer;
                    color: #475569;
                }
                #condominio-extension-form input[type="checkbox"] {
                    width: 18px;
                    height: 18px;
                    accent-color: #4f46e5;
                    border-radius: 4px;
                }
                #condominio-extension-form button {
                    background-color: #4f46e5;
                    color: white;
                    padding: 12px 20px;
                    border: none;
                    border-radius: 8px;
                    cursor: pointer;
                    font-size: 1em;
                    font-weight: 600;
                    transition: background-color 0.3s ease, transform 0.1s ease;
                    box-shadow: 0 4px 8px rgba(79, 70, 229, 0.3);
                }
                #condominio-extension-form button:hover {
                    background-color: #6366f1;
                    transform: translateY(-2px);
                }
                #condominio-extension-form button:active {
                    transform: translateY(0);
                    box-shadow: 0 2px 4px rgba(79, 70, 229, 0.3);
                }
                #condominio-extension-form .feedback-icons {
                    display: flex;
                    justify-content: space-around;
                    align-items: center;
                    margin-top: 10px;
                    min-height: 24px;
                }
                #condominio-extension-form .feedback-icon {
                    font-family: 'Material Icons';
                    font-size: 24px;
                    line-height: 1;
                    animation: fadeOut 3s forwards;
                }
                #condominio-extension-form .feedback-icon.success {
                    color: #16a34a;
                }
                #condominio-extension-form .feedback-icon.error {
                    color: #dc2626;
                }
                @keyframes fadeOut {
                    0% { opacity: 1; }
                    80% { opacity: 1; }
                    100% { opacity: 0; }
                }

                #condominio-extension-form .close-button {
                    position: absolute;
                    top: 10px;
                    right: 10px;
                    background: none;
                    border: none;
                    font-size: 1.5em;
                    color: #94a3b8;
                    cursor: pointer;
                    line-height: 1;
                }
                #condominio-extension-form .close-button:hover {
                    color: #64748b;
                }
                #displayIframeUrl {
                    white-space: nowrap;
                    overflow: hidden;
                    text-overflow: ellipsis;
                    max-width: 100%;
                    display: block;
                }
                .responsibility-button-group {
                    display: flex;
                }
                .responsibility-button-group button {
                    background-color: #e2e8f0;
                    color: #475569;
                    border: 1px solid #94a3b8;
                    flex-grow: 1;
                    transition: background-color 0.3s ease, color 0.3s ease;
                }
                .responsibility-button-group button:first-child {
                    border-right: none;
                    border-top-left-radius: 8px;
                    border-bottom-left-radius: 8px;
                }
                .responsibility-button-group button:last-child {
                    border-top-right-radius: 8px;
                    border-bottom-right-radius: 8px;
                }
                .responsibility-button-group .active {
                    background-color: #4f46e5;
                    color: white;
                }
            </style>
            <h3>Registrar Ocorrência</h3>
            <div class="extracted-data">
                <span id="displayProtocolo"></span>
                <span id="displayDataHora"></span>
                <span id="displayBloco"></span>
                <span id="displayUnidade"></span>
                <span id="displayStatus"></span>
                <span id="displayIframeUrl"></span>
            </div>
            <label>
                <input type="checkbox" id="chkSubsindico"> Interação Subsíndico
            </label>
            <label>
                <input type="checkbox" id="chkSindico"> Interação Síndico
            </label>
            <label>
                <input type="checkbox" id="chkAdm"> Interação Adm.
            </label>
            <label>
                <input type="checkbox" id="chkResolvido"> Resolvido
            </label>
            <div class="flex items-center justify-between mt-3">
                <label class="text-sm">Responsabilidade:</label>
                <div id="responsabilidade-buttons" class="flex rounded-lg overflow-hidden text-sm">
                    <button id="btnSub" class="px-3 py-1 flex-1 transition-colors duration-200">Subsíndico</button>
                    <button id="btnSindico" class="px-3 py-1 flex-1 transition-colors duration-200">Síndico</button>
                </div>
            </div>
            <button id="sendDataBtn" class="mt-4">Sincronizar</button>
            <div id="feedbackIcons" class="feedback-icons"></div>
            <button class="close-button">&times;</button>
        `;

        document.body.appendChild(formContainer);

        // Adiciona listeners para os novos botões de responsabilidade
        const subButton = document.getElementById('btnSub');
        const sindicoButton = document.getElementById('btnSindico');
        
        // Lógica de toggle para os botões de responsabilidade
        subButton.addEventListener('click', () => {
            const isActive = subButton.classList.contains('active');
            // Remove a classe 'active' de todos
            document.querySelectorAll('#responsabilidade-buttons button').forEach(btn => btn.classList.remove('active'));
            // Adiciona a classe 'active' apenas se não estava ativa
            if (!isActive) {
                subButton.classList.add('active');
            }
        });

        sindicoButton.addEventListener('click', () => {
            const isActive = sindicoButton.classList.contains('active');
            document.querySelectorAll('#responsabilidade-buttons button').forEach(btn => btn.classList.remove('active'));
            if (!isActive) {
                sindicoButton.classList.add('active');
            }
        });

        // Add listener for the send button
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
            
            // Adicionado a captura dos checkboxes de interação subsindico e sindico
            formData.append('subsindico', document.getElementById('chkSubsindico').checked ? 'Sim' : 'Não');
            formData.append('sindico', document.getElementById('chkSindico').checked ? 'Sim' : 'Não');
            
            // Envia o novo campo 'responsabilidade' com base no botão ativo
            const activeResponsibilityButton = document.querySelector('#responsabilidade-buttons button.active');
            formData.append('responsabilidade', activeResponsibilityButton ? activeResponsibilityButton.id.substring(3).toLowerCase() : '');

            // Campos de adm e resolvido continuam como antes
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
                try {
                    result = await response.json();
                } catch (e) {
                    result = { status: 'error', message: 'Resposta inválida do servidor.' };
                }

                const success = response.ok && result.status === 'success';
                const icon = document.createElement('span');
                icon.className = 'feedback-icon material-icons';
                icon.textContent = success ? 'check_circle' : 'cancel';
                icon.classList.add(success ? 'success' : 'error');
                icon.title = success ? `Sucesso: ${result.action} - ID: ${result.id}` : `Erro: ${result.message}`;
                feedbackIconsContainer.appendChild(icon);

                if (success) {
                    if (iframe && iframe.contentDocument) {
                        injectForm(iframe.contentDocument);
                    } else {
                        injectForm(document);
                    }
                }
            } catch (error) {
                const errorIcon = document.createElement('span');
                errorIcon.className = 'feedback-icon material-icons error';
                errorIcon.textContent = 'error';
                errorIcon.title = 'Erro de rede ou inesperado.';
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
            document.querySelectorAll('#responsabilidade-buttons button').forEach(btn => btn.classList.remove('active'));
        }
    }
}


// Lógica principal de injeção da extensão
window.addEventListener('load', () => {
    const pathname = window.location.pathname;
    
    if (pathname.includes('mensagem_detalhe.aspx')) {
        const extractedData = extractData(document);
        if (typeof extractedData.protocolo === 'number') {
            injectForm(document);
        }
    } else if (pathname.includes('mensagensV1.aspx')) {
        const iframe = document.getElementById('IFRAME_DETALHE');
        if (iframe) {
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
