console.log('[BOLETO] Script MAIN world carregado.');

// 1. Mock do webkit para evitar erros de ReferenceError
if (typeof window.webkit === 'undefined') {
    window.webkit = {
        messageHandlers: new Proxy({}, {
            get: function(target, prop) {
                return {
                    postMessage: function(msg) {
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
        window.abrirArquivo = function(url) {
            console.log('[BOLETO] Interceptado abrirArquivo com URL:', url);
            if (url && typeof url === 'string') {
                window.open(url, '_blank');
            } else {
                try { originalAbrirArquivo(url); } catch(e) { console.error(e); }
            }
        };
        window.abrirArquivo.isIntercepted = true;
        console.log('[BOLETO] Função abrirArquivo sobrescrita com sucesso!');
        interceptedAny = true;
    }
    
    if (typeof window.AbreSV === 'function' && !window.AbreSV.isIntercepted) {
        const originalAbreSV = window.AbreSV;
        window.AbreSV = function(url) {
            console.log('[BOLETO] Interceptado AbreSV com URL:', url);
            if (url && typeof url === 'string') {
                window.open(url, '_blank');
            } else {
                try { originalAbreSV(url); } catch(e) { console.error(e); }
            }
        };
        window.AbreSV.isIntercepted = true;
        console.log('[BOLETO] Função AbreSV sobrescrita com sucesso!');
        interceptedAny = true;
    }
    
    // Podemos manter o intervalo rodando em vez de limpar, já que o site
    // pode sobrescrever a função novamente após algum update panel (AJAX) do ASP.NET.
}, 500);
