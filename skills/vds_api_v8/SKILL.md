---
name: integração_api_vds_v8
description: Especificação técnica completa de endpoints REST da API v8 do Vida de Síndico (vds.app.br / apiv8.vds.app.br) para autenticação, ocorrências (com busca por protocolo), portaria, eventos de acesso, entregas e boletos.
---

# Skill: Integração com API v8 (Vida de Síndico / apiv8.vds.app.br)

Esta skill fornece todas as diretrizes, endpoints, headers e payloads para comunicação direta backend-to-backend com a API v8 da plataforma Vida de Síndico.

## 1. Base URL e Autenticação

- **Base URL:** `https://apiv8.vds.app.br`
- **Origin Header:** `https://app1.vidadesindico.com.br`
- **Padrão de Autenticação:** Bearer Token JWT/JWE no header `Authorization`.

### Fluxo de Autenticação
1. **Token Anônimo:** `POST /auth/anon` com body `{}`. Retorna token primário.
2. **Login:** `POST /login` enviando `Authorization: Bearer <token_anon>` e body:
   ```json
   {
     "app": "976",
     "username": "<USUARIO>",
     "password": "<SENHA>",
     "crypt": false
   }
   ```
3. **Validação de Sessão:** `GET /usuario/status` (Retorna HTTP 200 se token válido ou HTTP 401 se expirado).

---

## 2. Endpoints Mapeados por Módulo

### A. Ocorrências e Fale Com
- **Listar Não Lidas:** `GET /ocorrencia?page=1&limit=20&sortBy=dtExibicao&order=desc&Caixa=0&Lida=0&Condominio.Uuid={condominioUuid}`
- **Listar por Categoria:** `GET /ocorrencia?Tipo={codigoTipo}&page=1&limit=20&sortBy=dtExibicao&order=desc&Caixa=0&Lida=0&Condominio.Uuid={condominioUuid}`
- **Buscar por Número do Protocolo:** `GET /ocorrencia?page=1&limit=20&sortBy=dtExibicao&order=desc&Lida=9&Condominio.Uuid={condominioUuid}&Protocolo={numeroProtocolo}&Caixa=0`
  - Usa `Lida=9` para buscar a ocorrência independentemente de estar lida ou não lida.
- **Detalhes da Ocorrência:** `GET /ocorrencia/{ocorrenciaUuid}`
  - Retorna a estrutura com array `eventos[]` contendo histórico completo de mensagens, fotos, remetente, cargo e anexos.
- **Marcar Leitura:** `PUT /ocorrencia/visualizar/{ocorrenciaUuid}`
  - Utiliza o método **HTTP PUT** com `content-length: 0`.
- **Ordens de Serviço:** `GET /ocorrencia/{ocorrenciaUuid}/ordem-servico`
- **Grupos de Encaminhamento:** `GET /ocorrencia/encaminhar/grupos?condominioUuid={condominioUuid}`
- **Upload de Mídia / Anexos:** `POST /upload`
  - Body: `{"base64String": "data:image/png;base64,..."}`

### B. Eventos de Acesso e Portaria
- **Listar Acessos por Período:** `GET /evento_acesso?page=1&limit=21&sortBy=dthora&order=desc&dtInicio={YYYY-MM-DDTHH:mm}&dtFim={YYYY-MM-DDTHH:mm}`
- **Listar Acessos por Unidade:** `GET /evento_acesso?page=1&limit=21&sortBy=dthora&order=desc&dtInicio={dtInicio}&dtFim={dtFim}&unidade.bloco.uuid={blocoUuid}&unidade.uuid={unidadeUuid}`
- **Tipos de Eventos de Acesso:** `GET /evento_tipo`
- **Padrão de Fotos de Acesso:**
  - Visitantes: `https://app.vidadesindico.com.br/app/dados/visitante/{ANO}/{MES}/f-{ID}.jpg`
  - Fotos de Pessoas: `https://app.vidadesindico.com.br/app/dados/cond/{COND_ID}/foto/PESSOA/f-{ID}.jpg`
  - Fotos de Moradores: `https://app.vidadesindico.com.br/app/dados/cond/{COND_ID}/foto/MORADOR/p-{ID}.jpg`

### C. Entregas e Encomendas
- **Listar Entregas:** `GET /entrega?page=1&limit=21&sortBy=dthora&order=desc`
- **Listar Entregas por Unidade:** `GET /entrega?page=1&limit=21&sortBy=dthora&order=desc&Bloco.Uuid={blocoUuid}&Unidade.Uuid={unidadeUuid}`
- **Detalhe da Entrega:** `GET /entrega/{entregaUuid}`

### D. Estrutura de Unidades e Boletos
- **Listar Blocos:** `GET /bloco?Combo=True&IsAdmin=false&Condominio.Uuid={condominioUuid}`
- **Listar Unidades:** `GET /unidade?Combo=True&bloco.uuid={blocoUuid}`
- **Listar Boletos por Unidade:** `GET /boleto?page=1&limit=20&sortBy=status&order=asc&Ano={ano}&Bloco.Uuid={blocoUuid}&Unidade.Uuid={unidadeUuid}`

### E. Documentos e Avisos
- **Modelos de Documento:** `GET /documento_modelo?tipo=8&orderBy=dthora`
- **Detalhe do Modelo:** `GET /documento_modelo/{id}`

---

## 3. Diretrizes de Implementação
- **Interceptador HTTP:** Implementar middleware/interceptor HTTP que capture respostas `401 Unauthorized` e realize re-autenticação automática chamando o fluxo de login.
- **Cache de Token:** Manter o token em cache com renovação sob demanda.
- **Parsing de Datas:** Usar padrão ISO 8601 (`YYYY-MM-DDTHH:mm:ss`) para parâmetros de filtro de data e hora.
