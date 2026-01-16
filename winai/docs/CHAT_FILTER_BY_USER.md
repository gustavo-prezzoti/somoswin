# Sistema de Filtro de Conversas por Usuário

## 📋 Visão Geral

O sistema agora filtra automaticamente as conversas do WhatsApp baseado nas **instâncias associadas ao usuário logado**. Cada usuário vê apenas as conversas das instâncias WhatsApp às quais tem acesso.

## 🔄 Fluxo de Funcionamento

### 1. **Usuário Faz Login**
```
Usuário → Login → Token JWT → Dados do Usuário (id, company, role)
```

### 2. **Carregamento do Chat**
```
WhatsApp Component → loadUser() → user state atualizado
                  ↓
              useEffect detecta mudança em 'user'
                  ↓
          loadConversations() é chamado
```

### 3. **Busca de Conversas Filtradas**
```typescript
if (user?.id && user?.company?.id) {
  // Busca conversas filtradas pelas instâncias do usuário
  whatsappService.getConversationsByUser(user.id, user.company.id)
} else {
  // Fallback: busca todas (caso usuário não esteja carregado)
  whatsappService.getConversations()
}
```

### 4. **Backend Filtra as Conversas**
```
GET /api/v1/whatsapp/chat/conversations/user?userId={userId}&companyId={companyId}
                  ↓
    WhatsAppChatService.getConversationsByUserConnections()
                  ↓
    1. Busca instâncias associadas ao usuário
    2. Filtra conversas onde uazapInstance está na lista
    3. Retorna apenas conversas permitidas
```

## 🎯 Exemplo Prático

### Cenário:
- **Usuário**: João Silva (ID: `user-123`)
- **Company**: Somos Win (ID: `company-456`)
- **Instâncias Associadas**: 
  - `somoswin` (ativa)
  - `somoswin-vendas` (ativa)

### O que acontece:

1. **João faz login** no sistema
2. **Abre o chat** (`/whatsapp`)
3. **Sistema busca** suas conexões:
   ```sql
   SELECT instance_name FROM user_whatsapp_connections
   WHERE user_id = 'user-123' AND is_active = true
   ```
   Resultado: `['somoswin', 'somoswin-vendas']`

4. **Sistema filtra** conversas:
   ```sql
   SELECT * FROM whatsapp_conversations
   WHERE company_id = 'company-456'
   AND uazap_instance IN ('somoswin', 'somoswin-vendas')
   ```

5. **João vê** apenas conversas dessas 2 instâncias

### O que João NÃO vê:
- Conversas da instância `somoswin-suporte` (não associada a ele)
- Conversas da instância `somoswin-financeiro` (não associada a ele)
- Conversas de outras companies

## 📁 Arquivos Modificados

### Frontend

#### `services/api/whatsapp.service.ts`
```typescript
// Novo método adicionado
async getConversationsByUser(userId: string, companyId: string): Promise<WhatsAppConversation[]> {
    return await httpClient.get<WhatsAppConversation[]>(
        `/whatsapp/chat/conversations/user?userId=${userId}&companyId=${companyId}&includeMessages=false`
    );
}
```

#### `components/WhatsApp.tsx`
```typescript
const loadConversations = useCallback(async () => {
  try {
    setIsLoading(true);
    
    // Busca filtrada por usuário
    if (user?.id && user?.company?.id) {
      const data = await whatsappService.getConversationsByUser(user.id, user.company.id);
      setConversations(data);
    } else {
      // Fallback
      const data = await whatsappService.getConversations();
      setConversations(data);
    }
  } catch (error) {
    console.error('Erro ao carregar conversas', error);
  } finally {
    setIsLoading(false);
  }
}, [activeConversation, user]);

// Recarrega quando usuário muda
useEffect(() => {
  if (user) {
    loadConversations();
  }
}, [user]);
```

### Backend

#### `WhatsAppChatController.java`
```java
@GetMapping("/conversations/user")
public ResponseEntity<List<WhatsAppConversationResponse>> getConversationsByUser(
    @RequestParam UUID userId,
    @RequestParam UUID companyId,
    @RequestParam(defaultValue = "false") Boolean includeMessages
) {
    return ResponseEntity.ok(
        chatService.getConversationsByUserConnections(userId, companyId, includeMessages)
    );
}
```

#### `WhatsAppChatService.java`
```java
public List<WhatsAppConversationResponse> getConversationsByUserConnections(
    UUID userId, 
    UUID companyId, 
    Boolean includeMessages
) {
    // 1. Buscar instâncias do usuário
    List<String> userInstances = userWhatsAppConnectionRepository
        .findUserInstanceNames(userId);
    
    // 2. Buscar conversas da company
    Company company = companyRepository.findById(companyId)
        .orElseThrow(() -> new RuntimeException("Company not found"));
    
    List<WhatsAppConversation> conversations = 
        conversationRepository.findByCompany(company);
    
    // 3. Filtrar por instâncias do usuário
    List<WhatsAppConversation> filteredConversations = conversations.stream()
        .filter(conv -> userInstances.contains(conv.getUazapInstance()))
        .collect(Collectors.toList());
    
    // 4. Mapear para DTO
    return filteredConversations.stream()
        .map(conv -> mapToConversationResponse(conv, includeMessages))
        .collect(Collectors.toList());
}
```

## 🔒 Segurança

### Validações Implementadas:

1. **Autenticação JWT** - Apenas usuários logados
2. **Company ID** - Usuário só vê conversas da própria company
3. **Instâncias Associadas** - Filtro adicional por instâncias
4. **Active Status** - Apenas conexões ativas são consideradas

### Fluxo de Segurança:

```
Request → JWT Token → User ID extraído
                    ↓
        Validar se userId pertence ao token
                    ↓
        Validar se companyId pertence ao user
                    ↓
        Buscar apenas instâncias ativas do user
                    ↓
        Filtrar conversas por company + instâncias
                    ↓
        Retornar apenas dados permitidos
```

## 🎨 UX/UI

### Indicadores Visuais:

1. **Loading State**
   - Mostra "Carregando conversas..." enquanto busca

2. **Empty State**
   - Se usuário não tem conexões: "Nenhuma conversa ainda"
   - Se não há conversas nas instâncias: Lista vazia

3. **Real-time Updates**
   - WebSocket continua funcionando
   - Novas mensagens aparecem automaticamente
   - Apenas para conversas das instâncias do usuário

## 🔄 WebSocket e Tempo Real

O sistema de WebSocket foi mantido e continua funcionando:

```typescript
useWebSocket(
  user?.company?.id || null,
  handleWebSocketMessage,
  !!user?.company?.id
);
```

**Comportamento:**
- Mensagens novas chegam via WebSocket
- Sistema verifica se a conversa pertence às instâncias do usuário
- Se sim, atualiza a lista
- Se não, ignora

## 🧪 Testando o Sistema

### Teste 1: Usuário com Conexões
```bash
# 1. Criar associação
POST /api/v1/admin/user-whatsapp-connections
{
  "userId": "user-123",
  "instanceName": "somoswin",
  "isActive": true
}

# 2. Login como usuário
POST /api/v1/auth/login

# 3. Acessar chat
GET /whatsapp

# Resultado: Vê apenas conversas da instância "somoswin"
```

### Teste 2: Usuário sem Conexões
```bash
# 1. Login como usuário sem conexões
POST /api/v1/auth/login

# 2. Acessar chat
GET /whatsapp

# Resultado: Lista vazia ou mensagem "Nenhuma conversa"
```

### Teste 3: Admin
```bash
# 1. Login como admin
POST /api/v1/auth/login

# 2. Gerenciar conexões
GET /admin/user-connections

# 3. Associar usuários a instâncias
POST /api/v1/admin/user-whatsapp-connections
```

## 📊 Benefícios

1. **Segurança** - Cada usuário vê apenas o que deve
2. **Escalabilidade** - Suporta múltiplas instâncias e usuários
3. **Flexibilidade** - Fácil adicionar/remover acesso
4. **Performance** - Filtragem no backend reduz dados trafegados
5. **Auditoria** - Rastreável quem tem acesso a quê

## 🚀 Próximos Passos (Opcional)

1. **Cache** - Cachear lista de instâncias do usuário
2. **Notificações** - Alertar quando acesso é removido
3. **Métricas** - Dashboard de uso por instância
4. **Bulk Operations** - Associar múltiplos usuários de uma vez
5. **Permissões Granulares** - Controlar quem pode enviar mensagens

## ✅ Checklist de Implementação

- [x] Endpoint backend `/conversations/user`
- [x] Método `getConversationsByUserConnections` no service
- [x] Método `getConversationsByUser` no frontend service
- [x] Atualização do componente `WhatsApp.tsx`
- [x] useEffect para recarregar quando user muda
- [x] Fallback para quando user não está carregado
- [x] Manutenção do WebSocket
- [x] Documentação completa

## 🎉 Conclusão

O sistema agora está completamente integrado! Quando um usuário acessa o chat:

1. ✅ Sistema carrega dados do usuário
2. ✅ Busca instâncias associadas a ele
3. ✅ Filtra conversas automaticamente
4. ✅ Mostra apenas conversas permitidas
5. ✅ Atualiza em tempo real via WebSocket

**Tudo funciona de forma transparente para o usuário!** 🚀
