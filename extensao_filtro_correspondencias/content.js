// content.js - Extensão Isolador de Correspondências (Condomínio Digital)

(function () {
    console.log('[CORRESPONDÊNCIAS] 📬 Inicializando módulo Isolador de Correspondências...');

    let isFilterActive = localStorage.getItem('ext_modo_somente_correspondencias') === 'true';
    let correspondenciasCount = 0;
    const capturedCorrespondenciasMap = new Map();

    // 1. Injetar Estilos da Extensão
    function injectStyles() {
        if (document.getElementById('ext-correspondencias-styles')) return;

        const style = document.createElement('style');
        style.id = 'ext-correspondencias-styles';
        style.textContent = `
            @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
            @import url('https://fonts.googleapis.com/icon?family=Material+Icons');

            /* Botão Flutuante de Toggle */
            #ext-corr-floating-container {
                position: fixed;
                top: 20px;
                right: 20px;
                z-index: 999999;
                font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
                display: flex;
                flex-direction: column;
                align-items: flex-end;
                gap: 8px;
                user-select: none;
            }

            .ext-corr-toggle-pill {
                display: flex;
                align-items: center;
                gap: 10px;
                background: #1e293b;
                color: #ffffff;
                padding: 8px 16px;
                border-radius: 9999px;
                box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.3), 0 8px 10px -6px rgba(0, 0, 0, 0.2);
                border: 1px solid rgba(255, 255, 255, 0.15);
                cursor: pointer;
                transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
                backdrop-filter: blur(8px);
            }

            .ext-corr-toggle-pill:hover {
                transform: translateY(-2px);
                box-shadow: 0 14px 28px -5px rgba(0, 0, 0, 0.4);
            }

            .ext-corr-toggle-pill.active {
                background: linear-gradient(135deg, #059669 0%, #10b981 100%);
                border-color: rgba(255, 255, 255, 0.3);
            }

            .ext-corr-pill-icon {
                font-size: 20px;
                display: flex;
                align-items: center;
                justify-content: center;
            }

            .ext-corr-pill-title {
                font-size: 12px;
                font-weight: 600;
                letter-spacing: 0.3px;
                text-transform: uppercase;
            }

            .ext-corr-badge {
                background: rgba(255, 255, 255, 0.2);
                padding: 2px 7px;
                border-radius: 12px;
                font-size: 11px;
                font-weight: 700;
            }

            .ext-corr-switch {
                position: relative;
                width: 34px;
                height: 18px;
                background-color: #475569;
                border-radius: 20px;
                transition: background-color 0.2s;
            }

            .ext-corr-toggle-pill.active .ext-corr-switch {
                background-color: #ffffff;
            }

            .ext-corr-switch-knob {
                position: absolute;
                top: 2px;
                left: 2px;
                width: 14px;
                height: 14px;
                background-color: #ffffff;
                border-radius: 50%;
                transition: transform 0.2s;
            }

            .ext-corr-toggle-pill.active .ext-corr-switch-knob {
                transform: translateX(16px);
                background-color: #059669;
            }

            /* Regras de ocultação quando o modo estiver ATIVO */
            body.ext-somente-correspondencias-on .alert_ca_conteudo .linha[data-is-correspondencia="false"],
            body.ext-somente-correspondencias-on .box-conteudo .linha[data-is-correspondencia="false"],
            body.ext-somente-correspondencias-on #box-conteudo .linha[data-is-correspondencia="false"],
            body.ext-somente-correspondencias-on .alert_ca_conteudo > div[data-is-correspondencia="false"],
            body.ext-somente-correspondencias-on .box-conteudo > div[data-is-correspondencia="false"] {
                display: none !important;
            }

            /* Destaque visual suave para correspondências */
            .linha[data-is-correspondencia="true"],
            div[data-is-correspondencia="true"] {
                border-left: 4px solid #10b981 !important;
                background-color: rgba(240, 253, 244, 0.8) !important;
                transition: background-color 0.3s ease;
            }
        `;
        document.head.appendChild(style);
    }

    // 2. Classificador Inteligente de Itens da Esteira
    function detectCorrespondenciaType(element) {
        if (!element || element.nodeType !== Node.ELEMENT_NODE) return null;

        // 1. É botão/cabeçalho de ação com envelope ou link direto de correspondência?
        const hasEnvelope = element.querySelector('img[src*="envelope" i], img[src*="carta" i], img[src*="correspondencia" i], img[src*="mail" i], [class*="envelope" i], [id*="envelope" i], a[onclick*="correspondencia" i], a[onclick*="encomenda" i], a[onclick*="entrega" i]');
        if (hasEnvelope) return 'header';

        // 2. É linha de texto/dados de correspondência?
        const textContent = (element.textContent || "").toLowerCase();
        const keywords = ['correspondência', 'correspondencia', 'encomenda', 'pacote', 'carta simples', 'carta registrada', 'sedex', 'entrega recebida'];
        for (const kw of keywords) {
            if (textContent.includes(kw)) return 'body';
        }

        return null;
    }

    // 3. Processar e classificar elementos dentro do container
    function processContainerElements(container) {
        if (!container) return;

        // Linhas ou divs diretas
        const items = Array.from(container.querySelectorAll('.linha, :scope > div'));
        const corrElementsSet = new Set();

        // 1ª Passada: Identificação estrita e pareamento da dupla sem efeito cascata
        items.forEach((item) => {
            const type = detectCorrespondenciaType(item);
            if (type === 'header') {
                corrElementsSet.add(item);
                if (item.nextElementSibling && (item.nextElementSibling.classList.contains('linha') || item.nextElementSibling.tagName === 'DIV')) {
                    corrElementsSet.add(item.nextElementSibling);
                }
            } else if (type === 'body') {
                corrElementsSet.add(item);
                if (item.previousElementSibling && (item.previousElementSibling.classList.contains('linha') || item.previousElementSibling.tagName === 'DIV')) {
                    corrElementsSet.add(item.previousElementSibling);
                }
            }
        });

        // 2ª Passada: Aplicar atributos e remover itens não-correspondência do DOM se filtro estiver ativo
        items.forEach(item => {
            if (corrElementsSet.has(item)) {
                item.dataset.isCorrespondencia = 'true';
            } else {
                item.dataset.isCorrespondencia = 'false';
                // Remove do DOM para a esteira não atingir limite e descartar correspondências antigas
                if (isFilterActive) {
                    item.remove();
                }
            }
        });

        // 3ª Passada: Contabilizar as duplas de correspondência de forma exata
        let duplasCount = 0;
        corrElementsSet.forEach(el => {
            if (detectCorrespondenciaType(el) === 'header') {
                duplasCount++;
            }
        });

        if (duplasCount === 0 && corrElementsSet.size > 0) {
            duplasCount = Math.ceil(corrElementsSet.size / 2);
        }

        correspondenciasCount = duplasCount;
        updateBadgeCounter();
    }

    function updateBadgeCounter() {
        const badge = document.getElementById('ext-corr-count-badge');
        if (badge) {
            badge.textContent = correspondenciasCount;
        }
    }

    // 4. Criar o Botão Flutuante
    function ensureFloatingToggle() {
        if (document.getElementById('ext-corr-floating-container')) return;

        const container = document.createElement('div');
        container.id = 'ext-corr-floating-container';

        const pill = document.createElement('div');
        pill.id = 'ext-corr-pill';
        pill.className = `ext-corr-toggle-pill ${isFilterActive ? 'active' : ''}`;
        pill.title = 'Clique para alternar a exibição apenas de correspondências na esteira';

        pill.innerHTML = `
            <span class="material-icons ext-corr-pill-icon">mark_email_unread</span>
            <span class="ext-corr-pill-title">Só Correspondências</span>
            <span id="ext-corr-count-badge" class="ext-corr-badge">${correspondenciasCount}</span>
            <div class="ext-corr-switch">
                <div class="ext-corr-switch-knob"></div>
            </div>
        `;

        pill.addEventListener('click', () => {
            isFilterActive = !isFilterActive;
            localStorage.setItem('ext_modo_somente_correspondencias', isFilterActive);
            applyFilterState();
        });

        container.appendChild(pill);
        document.body.appendChild(container);

        applyFilterState();
    }

    function applyFilterState() {
        const pill = document.getElementById('ext-corr-pill');
        if (isFilterActive) {
            document.body.classList.add('ext-somente-correspondencias-on');
            if (pill) pill.classList.add('active');
        } else {
            document.body.classList.remove('ext-somente-correspondencias-on');
            if (pill) pill.classList.remove('active');
        }
    }

    // 5. Iniciar Observador na Esteira
    function initMonitoring() {
        injectStyles();
        ensureFloatingToggle();

        const findContainersAndObserve = () => {
            const targets = [
                document.querySelector('.alert_ca_conteudo'),
                document.querySelector('.box-conteudo'),
                document.querySelector('#box-conteudo')
            ].filter(Boolean);

            if (targets.length > 0) {
                targets.forEach(target => {
                    // Processa itens já presentes
                    processContainerElements(target);

                    // Observa inserção de novos nós em tempo real (AJAX/UpdatePanel)
                    const observer = new MutationObserver((mutations) => {
                        let hasAdded = false;
                        mutations.forEach(m => {
                            if (m.addedNodes.length > 0) hasAdded = true;
                        });
                        if (hasAdded) {
                            processContainerElements(target);
                        }
                    });

                    observer.observe(target, { childList: true, subtree: true });
                });
                console.log('[CORRESPONDÊNCIAS] 👀 Observer anexado à esteira com sucesso.');
            } else {
                // Tenta novamente em breve se o container ainda não foi renderizado
                setTimeout(findContainersAndObserve, 1000);
            }
        };

        findContainersAndObserve();
    }

    // Inicialização
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initMonitoring);
    } else {
        initMonitoring();
    }

    window.addEventListener('load', initMonitoring);
})();
