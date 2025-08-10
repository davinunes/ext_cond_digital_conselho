// content.js

// Function to extract data from a specific document (can be the main document or the iframe's document)
function extractData(contextDocument) {
    const data = {};

    // Extract Protocolo
    const protocoloElement = contextDocument.getElementById('ctl00_conteudo_lblProtocolo');
    let rawProtocolo = protocoloElement ? protocoloElement.textContent.trim() : 'Não encontrado';
    
    // Convert protocol to an integer to ensure correct matching in upsert
    // If not a valid number, keep as "Não encontrado" or the original value.
    data.protocolo = parseInt(rawProtocolo, 10);
    if (isNaN(data.protocolo)) {
        data.protocolo = rawProtocolo; // Keep original value if not a number
    }

    // Extract Date and Time
    const dataHoraElement = contextDocument.getElementById('ctl00_conteudo_lblEm');
    data.dataHora = dataHoraElement ? dataHoraElement.textContent.trim() : 'Não encontrado';

    // Extract Block (only the letter) and Unit
    const perfilOcorrenciaDiv = contextDocument.querySelector('.perfil_ocorrencia');
    if (perfilOcorrenciaDiv) {
        const blocoElement = perfilOcorrenciaDiv.querySelector('div.esq.t100.s11.truncate:nth-child(2)');
        if (blocoElement) {
            const blocoText = blocoElement.textContent.trim();
            // Use a regular expression to find "Bloco X" and capture the letter X
            const blocoMatch = blocoText.match(/Bloco\s+([A-Za-z])/);
            data.bloco = blocoMatch && blocoMatch[1] ? blocoMatch[1].toUpperCase() : 'Não encontrado';

            // Use a regular expression to find the unit number (e.g., "1206")
            const unidadeMatch = blocoText.match(/-\s*(\d+)/);
            data.unidade = unidadeMatch && unidadeMatch[1] ? unidadeMatch[1].trim() : 'Não encontrado';

        } else {
            data.bloco = 'Não encontrado';
            data.unidade = 'Não encontrado';
        }
    } else {
        data.bloco = 'Bloco não encontrado (div perfil_ocorrencia não encontrada no iframe)';
        data.unidade = 'Unidade não encontrada (div perfil_ocorrencia não encontrada no iframe)';
    }

    // Extract Status from the select - Get the text content of the selected option
    const statusSelectElement = contextDocument.getElementById('ctl00_conteudo_ddlStatus');
    data.status = statusSelectElement && statusSelectElement.options[statusSelectElement.selectedIndex] ? 
                  statusSelectElement.options[statusSelectElement.selectedIndex].textContent : 'Não encontrado';


    // Extrair URL do iframe
    const iframe = document.getElementById('IFRAME_DETALHE');
    data.iframeUrl = iframe ? iframe.src : 'Não encontrado';

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
        // O endpoint retorna success mesmo se o dado não existe, então checamos a propriedade 'data'
        if (result.status === 'success' && result.data && Object.keys(result.data).length > 0) {
            return result.data;
        }
        return null; // Retorna nulo se o dado não for encontrado
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

// Função para preencher os checkboxes com base nos dados da API
function fillCheckboxesFromApi(apiData) {
    if (apiData) {
        document.getElementById('chkSubsindico').checked = apiData.sub === 1;
        document.getElementById('chkSindico').checked = apiData.sindico === 1;
        document.getElementById('chkAdministracao').checked = apiData.adm === 1;
        // O campo 'resolvido' da API corresponde ao checkbox 'Resolvido'
        document.getElementById('chkResolvido').checked = apiData.resolvido === 1;
    }
}

// Function to create and inject the mini-form into the main page
async function injectForm(sourceDocument) {
    const extractedData = extractData(sourceDocument);
    let formContainer = document.getElementById('condominio-extension-form');

    // Se o protocolo for "Não encontrado", remove o formulário se ele existir
    // e retorna para não recriá-lo sem dados válidos.
    if (typeof extractedData.protocolo !== 'number' && formContainer) {
        formContainer.remove();
        return;
    }
    
    // Se o formulário não existe e o protocolo é válido, cria um novo
    if (!formContainer && typeof extractedData.protocolo === 'number') {
        formContainer = document.createElement('div');
        formContainer.id = 'condominio-extension-form';
        formContainer.style.cssText = `
            position: fixed;
            bottom: 20px;
            right: 20px;
            background-color: #f0f4f8; /* Light blue-gray */
            border: 1px solid #d1d9e6; /* Slightly darker border */
            border-radius: 12px; /* More rounded corners */
            padding: 20px;
            box-shadow: 0 8px 16px rgba(0, 0, 0, 0.2); /* Stronger shadow */
            z-index: 10000;
            font-family: 'Inter', sans-serif; /* Modern font */
            color: #334155; /* Darker text for contrast */
            max-width: 300px;
            display: flex;
            flex-direction: column;
            gap: 15px; /* Spacing between elements */
        `;

        formContainer.innerHTML = `
            <style>
                @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600&display=swap');
                /* Material Icons for feedback */
                @import url('https://fonts.googleapis.com/icon?family=Material+Icons');

                #condominio-extension-form h3 {
                    margin-top: 0;
                    margin-bottom: 15px;
                    color: #1e293b; /* Darker heading */
                    font-weight: 600;
                    font-size: 1.2em;
                }
                #condominio-extension-form .extracted-data {
                    background-color: #e2e8f0; /* Slightly darker background for data */
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
                    color: #475569; /* Slightly lighter label text */
                }
                #condominio-extension-form input[type="checkbox"] {
                    width: 18px;
                    height: 18px;
                    accent-color: #4f46e5; /* Purple accent for checkboxes */
                    border-radius: 4px;
                }
                #condominio-extension-form button {
                    background-color: #4f46e5; /* Purple button */
                    color: white;
                    padding: 12px 20px;
                    border: none;
                    border-radius: 8px;
                    cursor: pointer;
                    font-size: 1em;
                    font-weight: 600;
                    transition: background-color 0.3s ease, transform 0.1s ease;
                    box-shadow: 0 4px 8px rgba(79, 70, 229, 0.3); /* Shadow for button */
                }
                #condominio-extension-form button:hover {
                    background-color: #6366f1; /* Lighter purple on hover */
                    transform: translateY(-2px);
                }
                #condominio-extension-form button:active {
                    transform: translateY(0);
                    box-shadow: 0 2px 4px rgba(79, 70, 229, 0.3);
                }
                /* Feedback icons styling */
                #condominio-extension-form .feedback-icons {
                    display: flex;
                    justify-content: space-around;
                    align-items: center;
                    margin-top: 10px;
                    min-height: 24px; /* Ensure space for icons */
                }
                #condominio-extension-form .feedback-icon {
                    font-family: 'Material Icons';
                    font-size: 24px;
                    line-height: 1;
                    /* Optional: Add animation for visual feedback */
                    animation: fadeOut 3s forwards; /* Fade out after 3 seconds */
                }
                #condominio-extension-form .feedback-icon.success {
                    color: #16a34a; /* Green */
                }
                #condominio-extension-form .feedback-icon.error {
                    color: #dc2626; /* Red */
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
                /* Custom style for the URL to hide overflow */
                #displayIframeUrl {
                    white-space: nowrap;
                    overflow: hidden;
                    text-overflow: ellipsis;
                    max-width: 100%; /* Important for overflow to work */
                    display: block;
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
                <input type="checkbox" id="chkSubsindico"> Subsíndico
            </label>
            <label>
                <input type="checkbox" id="chkSindico"> Síndico
            </label>
            <label>
                <input type="checkbox" id="chkAdministracao"> Administração
            </label>
            <label>
                <input type="checkbox" id="chkResolvido"> Resolvido
            </label>
            <button id="sendDataBtn">Sincronizar</button>
            <div id="feedbackIcons" class="feedback-icons"></div>
            <button class="close-button">&times;</button>
        `;

        document.body.appendChild(formContainer);

        // Add listener for the send button
        document.getElementById('sendDataBtn').addEventListener('click', async () => {
            // Re-extract data from the iframe before sending to ensure it's the latest
            const iframe = document.getElementById('IFRAME_DETALHE');
            let currentExtractedData = {};
            if (iframe && iframe.contentDocument) {
                currentExtractedData = extractData(iframe.contentDocument);
            } else {
                console.warn("Iframe or its content not available for data extraction.");
            }

            // Create a FormData object to send data as application/x-www-form-urlencoded
            const formData = new URLSearchParams();
            formData.append('id', currentExtractedData.protocolo);
            formData.append('abertura', currentExtractedData.dataHora);
            formData.append('bloco', currentExtractedData.bloco);
            formData.append('unidade', currentExtractedData.unidade);
            formData.append('url', currentExtractedData.iframeUrl);
            formData.append('status', currentExtractedData.status);
            formData.append('subsindico', document.getElementById('chkSubsindico').checked ? 'Sim' : 'Não');
            formData.append('sindico', document.getElementById('chkSindico').checked ? 'Sim' : 'Não');
            formData.append('administracao', document.getElementById('chkAdministracao').checked ? 'Sim' : 'Não');
            formData.append('resolvido', document.getElementById('chkResolvido').checked ? 'Sim' : 'Não');

            console.log('Dados a serem enviados:', Object.fromEntries(formData.entries()));
            const feedbackIconsContainer = document.getElementById('feedbackIcons');
            feedbackIconsContainer.innerHTML = ''; // Clear previous icons

            // URL do seu script PHP
            const phpWebhookUrl = 'https://mini.davinunes.eti.br/ocorrenciasCondominioDigital/upsert.php';

            try {
                const response = await fetch(phpWebhookUrl, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/x-www-form-urlencoded'
                    },
                    body: formData.toString()
                });

                let result;
                try {
                    result = await response.json();
                } catch (e) {
                    console.error('Failed to parse JSON response:', e);
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
                    console.log('Dados enviados com sucesso para o PHP!', result);
                    // Adiciona a chamada para re-injetar o formulário após o sucesso para
                    // atualizar o estado (cor de fundo, etc.)
                    const iframe = document.getElementById('IFRAME_DETALHE');
                    if (iframe && iframe.contentDocument) {
                        injectForm(iframe.contentDocument);
                    }
                } else {
                    console.error('Erro ao enviar dados para o PHP:', result.message, response.status);
                }

            } catch (error) {
                console.error('Erro inesperado na requisição fetch:', error);
                const errorIcon = document.createElement('span');
                errorIcon.className = 'feedback-icon material-icons error';
                errorIcon.textContent = 'error';
                errorIcon.title = 'Erro de rede ou inesperado.';
                feedbackIconsContainer.appendChild(errorIcon);
            }
        });

        // Add listener for the close button
        document.querySelector('#condominio-extension-form .close-button').addEventListener('click', () => {
            formContainer.remove();
        });
    }
    
    // Check for existing data and update form
    const existingData = await checkExistingData(extractedData.protocolo);
    
    if (existingData) {
        // Se a ocorrência existe, muda o fundo e preenche os checkboxes
        formContainer.style.backgroundColor = '#bbf7d0'; // Um tom de verde claro do Tailwind
        fillCheckboxesFromApi(existingData);
    } else {
        // Se a ocorrência não existe, mantém o fundo padrão e reseta os checkboxes
        formContainer.style.backgroundColor = '#f0f4f8';
        if (formContainer) {
          document.getElementById('chkSubsindico').checked = false;
          document.getElementById('chkSindico').checked = false;
          document.getElementById('chkAdministracao').checked = false;
          document.getElementById('chkResolvido').checked = false;
        }
    }
    
    // A partir daqui, a lógica de checagem da API será executada
    updateDisplayedData(extractedData);
}


// Observa o iframe para detectar quando o conteúdo é carregado
const iframe = document.getElementById('IFRAME_DETALHE');

// Lógica de injeção baseada na URL
if (window.location.pathname.includes('mensagem_detalhe.aspx') && !iframe) {
    // Caso de URL de mensagem aberta diretamente
    window.addEventListener('load', () => injectForm(document));
} else if (window.location.pathname.includes('mensagensV1.aspx')) {
    // Caso de listagem de mensagens
    window.addEventListener('load', () => {
        injectForm(document); // Injeta o formulário na carga inicial da página
    });

    if (iframe) {
        iframe.addEventListener('load', () => {
            console.log('Iframe carregado. Tentando injetar/atualizar formulário.');
            try {
                // Remove o formulário antigo para garantir que os checkboxes sejam resetados corretamente
                const oldForm = document.getElementById('condominio-extension-form');
                if (oldForm) {
                    oldForm.remove();
                }
                injectForm(iframe.contentDocument);
            } catch (e) {
                console.error("Erro ao acessar contentDocument do iframe (possível problema de CORS ou iframe ainda não pronto):", e);
            }
        });
    }
}
