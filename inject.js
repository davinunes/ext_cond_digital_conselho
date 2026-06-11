console.log('[BOLETO] Script MAIN world carregado.');

// 0. Forçar viewport de celular em telas de desktop (larguras >= 480px)
(function () {
    const css = `
        @media (min-width: 480px) {
            html {
                background-color: #f3f4f6 !important;
                display: flex !important;
                justify-content: center !important;
                align-items: flex-start !important;
                min-height: 100vh !important;
                overflow-y: auto !important;
            }
            body {
                max-width: 550px !important;
                width: 100% !important;
                min-height: 100vh !important;
                margin: 0 auto !important;
                box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1) !important;
                background-color: #ffffff !important;
                position: relative !important;
                transform: translate3d(0, 0, 0) !important; /* Cria um containing block para elementos com position: fixed */
            }
            /* Ajustar diálogos e modais para caberem na tela do celular simulada */
            dialog.mdl-dialog, .mdl-dialog, .ui-dialog {
                max-width: 90% !important;
                width: auto !important;
            }
        }
    `;
    const style = document.createElement('style');
    style.id = 'mobile-layout-override';
    style.textContent = css;
    if (document.documentElement) {
        document.documentElement.appendChild(style);
    } else {
        document.addEventListener('DOMContentLoaded', () => {
            document.documentElement.appendChild(style);
        });
    }
})();

// 1. Mock do webkit para evitar erros de ReferenceError
if (typeof window.webkit === 'undefined') {
    window.webkit = {
        messageHandlers: new Proxy({}, {
            get: function (target, prop) {
                return {
                    postMessage: function (msg) {
                        console.log('[BOLETO] Mock webkit acionado:', prop, msg);
                        let targetUrl = null;
                        if (typeof msg === 'string' && msg.startsWith('http')) {
                            targetUrl = msg;
                        } else if (typeof msg === 'object' && msg !== null) {
                            if (msg.url) targetUrl = msg.url;
                            else if (msg.link) targetUrl = msg.link;
                        }
                        if (targetUrl) {
                            window.open(targetUrl, '_blank');
                        }
                    }
                };
            }
        })
    };
    console.log('[BOLETO] Objeto webkit mockado com sucesso na inicialização.');
}

// 2. Interceptação direta da função abrirArquivo() e AbreSV()
const interceptorTimer = setInterval(() => {
    let interceptedAny = false;

    if (typeof window.abrirArquivo === 'function' && !window.abrirArquivo.isIntercepted) {
        const originalAbrirArquivo = window.abrirArquivo;
        window.abrirArquivo = function (url) {
            console.log('[BOLETO] Interceptado abrirArquivo com URL:', url);
            if (url && typeof url === 'string') {
                window.open(url, '_blank');
            } else {
                try { originalAbrirArquivo(url); } catch (e) { console.error(e); }
            }
        };
        window.abrirArquivo.isIntercepted = true;
        console.log('[BOLETO] Função abrirArquivo sobrescrita com sucesso!');
        interceptedAny = true;
    }

    if (typeof window.AbreSV === 'function' && !window.AbreSV.isIntercepted) {
        const originalAbreSV = window.AbreSV;
        window.AbreSV = function (url) {
            console.log('[BOLETO] Interceptado AbreSV com URL:', url);
            if (url && typeof url === 'string') {
                window.open(url, '_blank');
            } else {
                try { originalAbreSV(url); } catch (e) { console.error(e); }
            }
        };
        window.AbreSV.isIntercepted = true;
        console.log('[BOLETO] Função AbreSV sobrescrita com sucesso!');
        interceptedAny = true;
    }

    // Podemos manter o intervalo rodando em vez de limpar, já que o site
    // pode sobrescrever a função novamente após algum update panel (AJAX) do ASP.NET.
}, 500);
