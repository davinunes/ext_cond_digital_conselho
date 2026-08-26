# Plano de Implementação: Integração Direta Backend-to-Backend com API v8 (Vida de Síndico)

Este documento detalha o planejamento técnico completo para integrar o sistema do conselho diretamente à API RESTful v8 da plataforma Vida de Síndico (`apiv8.vds.app.br`), eliminando a necessidade de intermediação via extensão de navegador Chrome.

---

## 1. Visão Geral e Arquitetura

A plataforma Vida de Síndico opera com uma arquitetura de API REST centralizada (`apiv8.vds.app.br`). Toda a comunicação utiliza requisições HTTP/JSON autenticadas via header `Authorization: Bearer <token>`.

### Benefícios da Integração Direta:
- **Automação Contínua:** Rotinas automatizadas em background (cron jobs / worker threads) rodando no servidor do conselho.
- **Maior Confiabilidade:** Elimina falhas de extensão de navegador, expiração manual de sessão ou dependência de telas abertas.
- **Integração Multimódulo:** Coleta de ocorrências por ID/protocolo, extratos financeiros, registros de acesso, entregas e suporte ao envio de anexos.

---

## 2. Módulos da Integração

### Módulo 1: Autenticação e Gestão de Sessão (`AuthService`)

#### 1.1. Obtenção do Token Anônimo (Boot)
- **Endpoint:** `POST https://apiv8.vds.app.br/auth/anon`
- **Headers:** `Content-Type: application/json`, `Origin: https://app1.vidadesindico.com.br`
- **Body:** `{}`
- **Objetivo:** Obter o token temporário inicial necessário para efetuar o login.

#### 1.2. Login de Usuário
- **Endpoint:** `POST https://apiv8.vds.app.br/login`
- **Headers:** `Authorization: Bearer <token_anon>`, `Content-Type: application/json`
- **Body:**
  ```json
  {
    "app": "976",
    "username": "<USUARIO>",
    "password": "<SENHA>",
    "crypt": false
  }
  ```
- **Objetivo:** Obter o `Bearer Token` definitivo do usuário logado.

#### 1.3. Validação e Renovação de Token
- **Estratégia de Cache:** Armazenar o token em memória / Redis / Banco com timestamp de geração.
- **Health check de Sessão:** `GET https://apiv8.vds.app.br/usuario/status` ou `GET https://apiv8.vds.app.br/permissao`
- **Tratamento de 401:** Em caso de resposta `HTTP 401 Unauthorized` em qualquer requisição, o `AuthService` deve automaticamente interceptar a falha, renovar o token executando a sequência (Anon -> Login) e reexecutar a requisição original.

---

### Módulo 2: Ocorrências e Fale Com (`OcorrenciaService`)

#### 2.1. Listagem de Ocorrências Não Lidas e Filtradas
- **Endpoint:** `GET https://apiv8.vds.app.br/ocorrencia`
- **Query Parameters:**
  - `page`: Número da página (padrão: 1)
  - `limit`: Quantidade por página (ex: 20 ou 50)
  - `sortBy`: `dtExibicao`
  - `order`: `desc`
  - `Caixa`: `0`
  - `Lida`: `0` (Somente não lidas) ou `9` (Busca geral: Lidas e Não Lidas)
  - `Tipo`: Código da categoria (ex: `85` para Fale Com / Sugestão / Anotação)
  - `Protocolo`: Número do protocolo (ex: `259314`) para **busca direta por protocolo**
  - `Condominio.Uuid`: `<UUID_DO_CONDOMINIO>`
- **Objetivo:** Consultar pendências ou recuperar uma ocorrência específica através de seu número de protocolo.

#### 2.2. Detalhamento e Reconstrução da Linha do Tempo / Chat
- **Endpoint:** `GET https://apiv8.vds.app.br/ocorrencia/{ocorrenciaUuid}`
- **Mapeamento de Dados:**
  - `titulo`, `protocolo`, `data`, `por` (Autor), `unidadeNome`
  - `eventos[]`: Lista cronológica contendo mensagens, respostas da administração, fotos de perfil, data/hora e anexos (`listaAnexo[]`).
- **Marcação de Leitura (HTTP PUT):** `PUT https://apiv8.vds.app.br/ocorrencia/visualizar/{ocorrenciaUuid}`
- **Ordens de Serviço Vinculadas:** `GET https://apiv8.vds.app.br/ocorrencia/{ocorrenciaUuid}/ordem-servico`
- **Grupos de Encaminhamento:** `GET https://apiv8.vds.app.br/ocorrencia/encaminhar/grupos?condominioUuid=<UUID>`

#### 2.3. Envio de Mídia / Anexos (Upload Service)
- **Endpoint:** `POST https://apiv8.vds.app.br/upload`
- **Headers:** `Authorization: Bearer <token>`, `Content-Type: application/json`
- **Body:**
  ```json
  {
    "base64String": "data:image/png;base64,iVBORw0KGgoAAA..."
  }
  ```
- **Objetivo:** Enviar fotos/documentos antes de vincular a uma mensagem ou ocorrência.

---

### Módulo 3: Eventos de Acesso e Portaria (`AcessoService`)

#### 3.1. Listagem de Eventos de Entrada e Saída
- **Endpoint:** `GET https://apiv8.vds.app.br/evento_acesso`
- **Query Parameters:**
  - `page`: Número da página (ex: 1, 2)
  - `limit`: Quantidade por página (ex: 21)
  - `sortBy`: `dthora`
  - `order`: `desc`
  - `dtInicio`: Data e hora inicial (ISO `YYYY-MM-DDTHH:mm`, ex: `2026-07-29T00:00`)
  - `dtFim`: Data e hora final (ISO `YYYY-MM-DDTHH:mm`, ex: `2026-07-29T23:59`)
  - `unidade.bloco.uuid`: `<BLOCO_UUID>` (Opcional - filtro por bloco)
  - `unidade.uuid`: `<UNIDADE_UUID>` (Opcional - filtro por unidade)
- **Objetivo:** Rastrear a movimentação de acesso no condomínio (moradores, visitantes, prestadores, veículos).

#### 3.2. Categorias de Acesso
- **Endpoint:** `GET https://apiv8.vds.app.br/evento_tipo`
- **Objetivo:** Mapear os tipos de registro de acesso (Pedestre, Veículo, Biometria, QrCode, etc.).

#### 3.3. Resolução de Imagens de Pessoas e Visitantes
- **Padrão de URLs Estáticas de Fotos:**
  - Visitantes: `https://app.vidadesindico.com.br/app/dados/visitante/{ANO}/{MES}/f-{ID}.jpg`
  - Fotos de Moradores/Pessoas: `https://app.vidadesindico.com.br/app/dados/cond/{COND_ID}/foto/PESSOA/f-{ID}.jpg`
  - Fotos de Perfil do Morador: `https://app.vidadesindico.com.br/app/dados/cond/{COND_ID}/foto/MORADOR/p-{ID}.jpg`

---

### Módulo 4: Rastreamento de Entregas e Encomendas (`EntregaService`)

#### 4.1. Listar Entregas
- **Endpoint:** `GET https://apiv8.vds.app.br/entrega`
- **Query Parameters:**
  - `page`: 1
  - `limit`: 21
  - `sortBy`: `dthora`
  - `order`: `desc`
  - `Bloco.Uuid`: `<BLOCO_UUID>` (Opcional)
  - `Unidade.Uuid`: `<UNIDADE_UUID>` (Opcional)
- **Objetivo:** Consultar a chegada e retirada de correspondências e pacotes por morador/unidade.

#### 4.2. Detalhes de uma Entrega
- **Endpoint:** `GET https://apiv8.vds.app.br/entrega/{entregaUuid}`

---

### Módulo 5: Mapeamento Físico e Boletos (`FinanceiroService`)

#### 5.1. Mapeamento de Estrutura (Blocos e Unidades)
- **Listar Blocos:** `GET https://apiv8.vds.app.br/bloco?Combo=True&IsAdmin=false&Condominio.Uuid=<UUID>`
- **Listar Unidades do Bloco:** `GET https://apiv8.vds.app.br/unidade?Combo=True&bloco.uuid=<BLOCO_UUID>`

#### 5.2. Consulta de Boletos por Unidade
- **Endpoint:** `GET https://apiv8.vds.app.br/boleto`
- **Query Parameters:**
  - `page`: 1
  - `limit`: 20
  - `sortBy`: `status`
  - `order`: `asc`
  - `Ano`: Ex: `2026`
  - `Bloco.Uuid`: `<BLOCO_UUID>`
  - `Unidade.Uuid`: `<UNIDADE_UUID>`
- **Objetivo:** Rastrear o histórico financeiro da unidade, verificando emissão de 2ª via e identificando lançamento de cobranças extras ou multas.

---

### Módulo 6: Documentos e Avisos Institucionais (`DocumentoService`)

- **Listar Modelos de Documento:** `GET https://apiv8.vds.app.br/documento_modelo?tipo=8&orderBy=dthora`
- **Detalhes do Modelo:** `GET https://apiv8.vds.app.br/documento_modelo/{id}`

---

## 3. Plano de Verificação e Validação

1. **Teste de Autenticação:** Script isolado para validar a sequência de autenticação (`/auth/anon` -> `/login`) e verificar se o token gerado é mantido com sucesso.
2. **Teste de Busca por Protocolo & Leitura (PUT):** Testar consulta por `Protocolo=XXXXXX` e envio de `PUT /ocorrencia/visualizar/{uuid}`.
3. **Teste de Coleta de Acessos:** Testar consultas por intervalo de datas em `/evento_acesso` e validar se os registros contêm as URLs corretas de foto de perfil/visitante.
4. **Teste de Entregas e Boletos:** Validar filtros por `Bloco.Uuid` e `Unidade.Uuid`.
5. **Tolerância a Falhas (401 Retry):** Testar o middleware de interceptação de erros HTTP 401 para renovação automática de token.
