# WIN.AI - Documentação da API Backend

## Visão Geral

Esta documentação descreve os endpoints da API RESTful do sistema WIN.AI. Todos os endpoints retornam respostas em formato JSON.

**Base URL:** `https://api.win-ai.com/v1`

---

## Autenticação

A API utiliza autenticação via **JWT (JSON Web Token)**. Após o login bem-sucedido, o token deve ser incluído no header de todas as requisições autenticadas.

```http
Authorization: Bearer <token>
```

---

## Endpoints

### 1. Login

Realiza a autenticação do usuário no sistema.

#### Request

```http
POST /auth/login
Content-Type: application/json
```

#### Body

| Campo      | Tipo     | Obrigatório | Descrição                        |
|------------|----------|-------------|----------------------------------|
| `email`    | `string` | ✅ Sim       | E-mail corporativo do usuário   |
| `password` | `string` | ✅ Sim       | Senha de acesso                  |

#### Exemplo de Requisição

```json
{
  "email": "usuario@empresa.com",
  "password": "senhaSegura123"
}
```

#### Respostas

##### ✅ Sucesso (200 OK)

```json
{
  "success": true,
  "message": "Login realizado com sucesso",
  "data": {
    "user": {
      "id": "uuid-do-usuario",
      "email": "usuario@empresa.com",
      "name": "Nome do Usuário",
      "role": "admin | user | operator",
      "plan": "Plano Ultra | Plano Pro | Plano Starter",
      "companyId": "uuid-da-empresa",
      "companyName": "Nome da Empresa",
      "createdAt": "2025-01-08T00:00:00.000Z",
      "updatedAt": "2025-01-08T00:00:00.000Z"
    },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "refresh-token-uuid",
    "expiresIn": 86400
  }
}
```

##### ❌ Credenciais Inválidas (401 Unauthorized)

```json
{
  "success": false,
  "message": "Credenciais inválidas",
  "error": {
    "code": "INVALID_CREDENTIALS",
    "details": "E-mail ou senha incorretos"
  }
}
```

##### ❌ Usuário Inativo (403 Forbidden)

```json
{
  "success": false,
  "message": "Usuário desativado",
  "error": {
    "code": "USER_INACTIVE",
    "details": "Esta conta foi desativada. Entre em contato com o suporte."
  }
}
```

##### ❌ Campos Obrigatórios (400 Bad Request)

```json
{
  "success": false,
  "message": "Dados inválidos",
  "error": {
    "code": "VALIDATION_ERROR",
    "details": {
      "email": "O campo e-mail é obrigatório",
      "password": "O campo senha é obrigatório"
    }
  }
}
```

---

### 2. Ativar Instância

Ativa uma nova instância (empresa/conta) no sistema WIN.AI. Este endpoint é utilizado pelo administrador para criar novas contas de clientes.

#### Request

```http
POST /instances/activate
Content-Type: application/json
Authorization: Bearer <admin_token>
```

> ⚠️ **Nota:** Este endpoint requer autenticação com permissão de administrador.

#### Body

| Campo         | Tipo     | Obrigatório | Descrição                                    |
|---------------|----------|-------------|----------------------------------------------|
| `companyName` | `string` | ✅ Sim       | Razão Social ou Nome da Empresa             |
| `segment`     | `string` | ✅ Sim       | Segmento de atuação (ver valores permitidos)|
| `email`       | `string` | ✅ Sim       | E-mail corporativo do responsável           |
| `whatsapp`    | `string` | ✅ Sim       | WhatsApp de contato (formato: 5511999999999)|
| `leadVolume`  | `string` | ❌ Não       | Volume mensal estimado de leads             |
| `plan`        | `string` | ✅ Sim       | Plano contratado                            |

##### Valores Permitidos para `segment`

| Valor         | Descrição              |
|---------------|------------------------|
| `ecommerce`   | E-commerce / Varejo    |
| `saas`        | SaaS / Tecnologia      |
| `infoproduct` | Infoprodutos / Educação|
| `service`     | Prestação de Serviços  |
| `health`      | Saúde / Bem-estar      |
| `realestate`  | Imobiliário            |

##### Valores Permitidos para `leadVolume`

| Valor       | Descrição                  |
|-------------|----------------------------|
| `100-500`   | Até 500 leads/mês          |
| `500-1000`  | De 500 a 1.000 leads/mês   |
| `1000-5000` | De 1.000 a 5.000 leads/mês |
| `5000+`     | Acima de 5.000 leads/mês   |

##### Valores Permitidos para `plan`

| Valor           | Descrição                           |
|-----------------|-------------------------------------|
| `starter`       | Plano Starter (básico)              |
| `pro`           | Plano Pro (intermediário)           |
| `ultra`         | Plano Ultra (completo)              |
| `enterprise`    | Plano Enterprise (personalizado)    |

#### Exemplo de Requisição

```json
{
  "companyName": "Minha Empresa LTDA",
  "segment": "ecommerce",
  "email": "contato@minhaempresa.com",
  "whatsapp": "5511999999999",
  "leadVolume": "500-1000",
  "plan": "ultra"
}
```

#### Respostas

##### ✅ Sucesso (201 Created)

```json
{
  "success": true,
  "message": "Instância ativada com sucesso",
  "data": {
    "instance": {
      "id": "uuid-da-instancia",
      "companyId": "uuid-da-empresa",
      "companyName": "Minha Empresa LTDA",
      "segment": "ecommerce",
      "plan": "ultra",
      "status": "active",
      "createdAt": "2025-01-08T00:00:00.000Z"
    },
    "admin": {
      "id": "uuid-do-usuario-admin",
      "email": "contato@minhaempresa.com",
      "temporaryPassword": "Win@2025temp",
      "mustChangePassword": true
    },
    "resources": {
      "whatsappConnected": false,
      "agentsEnabled": ["sdr", "traffic"],
      "leadLimit": 1000,
      "usersLimit": 10
    }
  }
}
```

##### ❌ E-mail Já Cadastrado (409 Conflict)

```json
{
  "success": false,
  "message": "E-mail já cadastrado",
  "error": {
    "code": "EMAIL_ALREADY_EXISTS",
    "details": "Já existe uma conta com este e-mail"
  }
}
```

##### ❌ Sem Permissão (403 Forbidden)

```json
{
  "success": false,
  "message": "Acesso negado",
  "error": {
    "code": "FORBIDDEN",
    "details": "Você não tem permissão para ativar instâncias"
  }
}
```

##### ❌ Dados Inválidos (400 Bad Request)

```json
{
  "success": false,
  "message": "Dados inválidos",
  "error": {
    "code": "VALIDATION_ERROR",
    "details": {
      "companyName": "O nome da empresa é obrigatório",
      "segment": "Segmento inválido. Valores permitidos: ecommerce, saas, infoproduct, service, health, realestate",
      "email": "E-mail inválido",
      "whatsapp": "WhatsApp deve conter apenas números (código do país + DDD + número)"
    }
  }
}
```

---

## Códigos de Erro

| Código                  | HTTP Status | Descrição                                |
|-------------------------|-------------|------------------------------------------|
| `INVALID_CREDENTIALS`   | 401         | E-mail ou senha incorretos               |
| `USER_INACTIVE`         | 403         | Conta de usuário desativada              |
| `FORBIDDEN`             | 403         | Sem permissão para acessar o recurso     |
| `VALIDATION_ERROR`      | 400         | Dados de entrada inválidos               |
| `EMAIL_ALREADY_EXISTS`  | 409         | E-mail já cadastrado no sistema          |
| `INSTANCE_NOT_FOUND`    | 404         | Instância não encontrada                 |
| `TOKEN_EXPIRED`         | 401         | Token JWT expirado                       |
| `TOKEN_INVALID`         | 401         | Token JWT inválido                       |
| `INTERNAL_ERROR`        | 500         | Erro interno do servidor                 |

---

## Rate Limiting

A API possui limite de requisições para proteger o sistema:

| Endpoint            | Limite                    |
|---------------------|---------------------------|
| `POST /auth/login`  | 5 tentativas / minuto / IP|
| Outros endpoints    | 100 requisições / minuto  |

Quando o limite é excedido, a API retorna:

```http
HTTP/1.1 429 Too Many Requests
Retry-After: 60
```

```json
{
  "success": false,
  "message": "Limite de requisições excedido",
  "error": {
    "code": "RATE_LIMIT_EXCEEDED",
    "retryAfter": 60
  }
}
```

---

## Headers Comuns

### Request Headers

| Header           | Valor                      | Descrição                    |
|------------------|----------------------------|------------------------------|
| `Content-Type`   | `application/json`         | Tipo de conteúdo da request  |
| `Authorization`  | `Bearer <token>`           | Token JWT de autenticação    |
| `Accept-Language`| `pt-BR`                    | Idioma preferido             |

### Response Headers

| Header           | Descrição                                |
|------------------|------------------------------------------|
| `X-Request-Id`   | ID único da requisição (para debugging)  |
| `X-RateLimit-Remaining` | Requisições restantes no período |
| `X-RateLimit-Reset`     | Timestamp de reset do limite     |

---

## Exemplos de Implementação

### cURL

#### Login

```bash
curl -X POST https://api.win-ai.com/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "usuario@empresa.com",
    "password": "senhaSegura123"
  }'
```

#### Ativar Instância

```bash
curl -X POST https://api.win-ai.com/v1/instances/activate \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -d '{
    "companyName": "Minha Empresa LTDA",
    "segment": "ecommerce",
    "email": "contato@minhaempresa.com",
    "whatsapp": "5511999999999",
    "leadVolume": "500-1000",
    "plan": "ultra"
  }'
```

### JavaScript (Fetch)

```javascript
// Login
async function login(email, password) {
  const response = await fetch('https://api.win-ai.com/v1/auth/login', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ email, password }),
  });
  
  const data = await response.json();
  
  if (data.success) {
    localStorage.setItem('token', data.data.token);
    return data.data.user;
  } else {
    throw new Error(data.message);
  }
}

// Ativar Instância
async function activateInstance(instanceData) {
  const token = localStorage.getItem('token');
  
  const response = await fetch('https://api.win-ai.com/v1/instances/activate', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify(instanceData),
  });
  
  return response.json();
}
```

---

## Ambiente de Desenvolvimento

Para testes, utilize a URL de desenvolvimento:

**Base URL (Dev):** `http://localhost:3000/v1`

---

## Suporte

Em caso de dúvidas ou problemas com a API:

- **E-mail:** api-support@win-ai.com
- **Documentação:** https://docs.win-ai.com
- **Status:** https://status.win-ai.com
