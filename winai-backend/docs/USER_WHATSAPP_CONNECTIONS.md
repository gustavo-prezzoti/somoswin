# Sistema de Associação de Usuários com Conexões do WhatsApp

## Visão Geral

Este sistema permite que administradores associem usuários específicos a conexões do WhatsApp (instâncias do Uazap), garantindo que cada usuário veja apenas as conversas das instâncias às quais tem acesso.

## Estrutura

### Entidades

#### UserWhatsAppConnection
Tabela de associação entre usuários e instâncias do WhatsApp.

**Campos:**
- `id`: UUID único da associação
- `user_id`: ID do usuário (FK para `users`)
- `instance_name`: Nome da instância do Uazap (ex: "somoswin")
- `instance_token`: Token de autenticação da instância (opcional)
- `instance_base_url`: URL base da API (ex: "https://somoswin.uazapi.com")
- `description`: Descrição opcional da conexão
- `is_active`: Indica se a conexão está ativa
- `created_at`: Data de criação
- `updated_at`: Data da última atualização

**Constraints:**
- Um usuário não pode ter duas conexões com a mesma instância (unique constraint em `user_id` + `instance_name`)
- Cascade delete: ao deletar um usuário, suas conexões são removidas automaticamente

## Endpoints da API

### Admin - Gerenciamento de Conexões

Base URL: `/api/v1/admin/user-whatsapp-connections`

Todos os endpoints requerem autenticação e role `ADMIN`.

#### 1. Criar Associação
```http
POST /api/v1/admin/user-whatsapp-connections
Content-Type: application/json

{
  "userId": "uuid-do-usuario",
  "instanceName": "somoswin",
  "instanceToken": "token-opcional",
  "instanceBaseUrl": "https://somoswin.uazapi.com",
  "description": "Conexão principal",
  "isActive": true
}
```

#### 2. Atualizar Associação
```http
PUT /api/v1/admin/user-whatsapp-connections/{connectionId}
Content-Type: application/json

{
  "instanceToken": "novo-token",
  "description": "Descrição atualizada",
  "isActive": false
}
```

#### 3. Listar Todas as Associações
```http
GET /api/v1/admin/user-whatsapp-connections
```

#### 4. Buscar Associação por ID
```http
GET /api/v1/admin/user-whatsapp-connections/{connectionId}
```

#### 5. Listar Associações de um Usuário
```http
GET /api/v1/admin/user-whatsapp-connections/user/{userId}
```

#### 6. Listar Associações Ativas de um Usuário
```http
GET /api/v1/admin/user-whatsapp-connections/user/{userId}/active
```

#### 7. Listar Instâncias do Usuário
```http
GET /api/v1/admin/user-whatsapp-connections/user/{userId}/instances
```

Retorna apenas os nomes das instâncias:
```json
["somoswin", "outra-instancia"]
```

#### 8. Verificar Acesso
```http
GET /api/v1/admin/user-whatsapp-connections/user/{userId}/has-access/{instanceName}
```

Retorna `true` ou `false`.

#### 9. Deletar Associação
```http
DELETE /api/v1/admin/user-whatsapp-connections/{connectionId}
```

### WhatsApp Chat - Conversas Filtradas

#### Buscar Conversas do Usuário
```http
GET /api/v1/whatsapp/chat/conversations/user?userId={userId}&companyId={companyId}&includeMessages=false
```

Este endpoint retorna apenas as conversas das instâncias que o usuário tem acesso.

## Fluxo de Uso

### 1. Criar Usuário (se necessário)
Use o endpoint de criação de usuários existente.

### 2. Associar Usuário a Conexões
Como admin, crie associações entre o usuário e as instâncias do WhatsApp:

```bash
curl -X POST https://server.somoswin.com.br/api/v1/admin/user-whatsapp-connections \
  -H "Authorization: Bearer {admin-token}" \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "123e4567-e89b-12d3-a456-426614174000",
    "instanceName": "somoswin",
    "instanceToken": "token-da-instancia",
    "instanceBaseUrl": "https://somoswin.uazapi.com",
    "description": "Conexão principal do time de vendas",
    "isActive": true
  }'
```

### 3. Buscar Conversas Filtradas
O usuário pode buscar suas conversas usando o endpoint filtrado:

```bash
curl -X GET "https://server.somoswin.com.br/api/v1/whatsapp/chat/conversations/user?userId=123e4567-e89b-12d3-a456-426614174000&companyId=company-uuid&includeMessages=true" \
  -H "Authorization: Bearer {user-token}"
```

## Migração do Banco de Dados

Execute o script SQL para criar a tabela:

```bash
psql -U winai_user -d winai_db -f sql/02_create_user_whatsapp_connections.sql
```

Ou, se estiver usando Docker:

```bash
docker exec -i postgres_container psql -U winai_user -d winai_db < sql/02_create_user_whatsapp_connections.sql
```

## Segurança

- Apenas administradores podem criar, atualizar ou deletar associações
- Usuários podem apenas visualizar suas próprias conversas filtradas
- Tokens de instância são armazenados de forma segura no banco de dados
- Validação de unicidade previne duplicação de associações

## Exemplos de Uso

### Cenário 1: Associar um vendedor a uma instância
```json
POST /api/v1/admin/user-whatsapp-connections
{
  "userId": "vendedor-uuid",
  "instanceName": "vendas-sp",
  "description": "Equipe de vendas São Paulo"
}
```

### Cenário 2: Associar um gerente a múltiplas instâncias
```json
// Primeira associação
POST /api/v1/admin/user-whatsapp-connections
{
  "userId": "gerente-uuid",
  "instanceName": "vendas-sp"
}

// Segunda associação
POST /api/v1/admin/user-whatsapp-connections
{
  "userId": "gerente-uuid",
  "instanceName": "vendas-rj"
}
```

### Cenário 3: Desativar acesso temporariamente
```json
PUT /api/v1/admin/user-whatsapp-connections/{connectionId}
{
  "isActive": false
}
```

## Integração com Frontend

No painel admin, você pode criar uma interface para:

1. **Listar usuários** e suas conexões atuais
2. **Adicionar/remover conexões** para cada usuário
3. **Visualizar instâncias disponíveis** (pode vir do endpoint de instâncias do Uazap)
4. **Ativar/desativar conexões** sem deletá-las

Exemplo de componente React:

```jsx
// Componente para gerenciar conexões de um usuário
function UserConnectionsManager({ userId }) {
  const [connections, setConnections] = useState([]);
  
  useEffect(() => {
    fetch(`/api/v1/admin/user-whatsapp-connections/user/${userId}`)
      .then(res => res.json())
      .then(setConnections);
  }, [userId]);
  
  const addConnection = async (instanceName) => {
    await fetch('/api/v1/admin/user-whatsapp-connections', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId,
        instanceName,
        isActive: true
      })
    });
    // Recarregar conexões
  };
  
  // Renderizar lista de conexões e botão para adicionar
}
```

## Troubleshooting

### Usuário não vê nenhuma conversa
- Verifique se o usuário tem conexões ativas: `GET /api/v1/admin/user-whatsapp-connections/user/{userId}/active`
- Verifique se as conversas têm o campo `uazapInstance` preenchido corretamente

### Erro ao criar associação duplicada
- Cada usuário pode ter apenas uma associação por instância
- Delete a associação existente ou atualize-a

### Performance lenta ao listar conversas
- Os índices criados no banco devem otimizar as queries
- Considere adicionar paginação se houver muitas conversas
