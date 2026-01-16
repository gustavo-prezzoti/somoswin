# Implementação Frontend - Chat WhatsApp com Modo IA/HUMAN

## 📋 Mudanças Necessárias no WhatsApp.tsx

### 1. Remover Estado Local `supportMode`
```typescript
// REMOVER esta linha:
const [supportMode, setSupportMode] = useState<'IA' | 'HUMAN'>('IA');

// O modo agora vem da conversa ativa:
const supportMode = activeConversation?.supportMode || 'IA';
```

### 2. Adicionar Função para Alternar Modo
```typescript
const handleToggleSupportMode = async (mode: 'IA' | 'HUMAN') => {
  if (!activeConversation) return;
  
  try {
    const updated = await whatsappService.toggleSupportMode(activeConversation.id, mode);
    
    // Atualizar conversa ativa
    setActiveConversation(updated);
    
    // Atualizar na lista
    setConversations(prev => prev.map(c => 
      c.id === updated.id ? updated : c
    ));
  } catch (error) {
    console.error('Erro ao alternar modo:', error);
  }
};
```

### 3. Atualizar Botões de Modo (Linha ~486-500)
```typescript
<div className="flex bg-gray-100 p-1 rounded-xl">
  <button
    onClick={() => handleToggleSupportMode('IA')}
    disabled={supportMode === 'IA'}
    className={`flex items-center gap-2 px-4 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${
      supportMode === 'IA' 
        ? 'bg-white text-emerald-600 shadow-sm cursor-not-allowed' 
        : 'text-gray-400 hover:bg-white/50'
    }`}
  >
    <Bot size={12} /> IA
  </button>
  <button
    onClick={() => handleToggleSupportMode('HUMAN')}
    disabled={supportMode === 'HUMAN'}
    className={`flex items-center gap-2 px-4 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${
      supportMode === 'HUMAN' 
        ? 'bg-white text-rose-500 shadow-sm cursor-not-allowed' 
        : 'text-gray-400 hover:bg-white/50'
    }`}
  >
    <UserCheck size={12} /> Humano
  </button>
</div>
```

### 4. Remover Ícones de Áudio/Vídeo (Linha ~503-505)
```typescript
// REMOVER estas linhas:
<button className="p-2.5 text-gray-400 hover:text-emerald-600 transition-colors"><Phone size={18} /></button>
<button className="p-2.5 text-gray-400 hover:text-emerald-600 transition-colors"><Video size={18} /></button>

// Manter apenas o botão de Info
<button
  onClick={() => setIsDetailsOpen(!isDetailsOpen)}
  className={`p-2.5 rounded-lg transition-all ${
    isDetailsOpen ? 'text-emerald-600 bg-emerald-50' : 'text-gray-400 hover:bg-gray-50'
  }`}
>
  <Info size={18} />
</button>
```

### 5. Desabilitar Input quando IA está Ativa (Linha ~568-581)
```typescript
<input
  type="text"
  placeholder={
    supportMode === 'IA' 
      ? "IA está respondendo automaticamente..." 
      : "Digite sua mensagem..."
  }
  className={`w-full px-6 py-3.5 border-none rounded-2xl focus:ring-1 focus:ring-emerald-500 outline-none transition-all text-sm font-medium ${
    supportMode === 'IA'
      ? 'bg-gray-100 cursor-not-allowed text-gray-400'
      : 'bg-gray-50'
  }`}
  value={message}
  onChange={(e) => setMessage(e.target.value)}
  onKeyPress={(e) => {
    if (e.key === 'Enter' && !e.shiftKey && supportMode === 'HUMAN') {
      e.preventDefault();
      handleSendMessage();
    }
  }}
  disabled={isSending || supportMode === 'IA'}
  readOnly={supportMode === 'IA'}
/>
```

### 6. Implementar Upload de Arquivo (Linha ~566)
```typescript
// Adicionar estado para arquivo
const [selectedFile, setSelectedFile] = useState<File | null>(null);
const fileInputRef = useRef<HTMLInputElement>(null);

// Função para selecionar arquivo
const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
  const file = e.target.files?.[0];
  if (file) {
    setSelectedFile(file);
    // Aqui você pode mostrar preview ou enviar diretamente
    handleSendFile(file);
  }
};

// Função para enviar arquivo
const handleSendFile = async (file: File) => {
  if (!activeConversation) return;
  
  try {
    setIsSending(true);
    
    // Determinar tipo de mídia
    let mediaType = 'document';
    if (file.type.startsWith('image/')) mediaType = 'image';
    else if (file.type.startsWith('video/')) mediaType = 'video';
    else if (file.type.startsWith('audio/')) mediaType = 'audio';
    
    const formData = new FormData();
    formData.append('file', file);
    formData.append('phoneNumber', activeConversation.phoneNumber);
    formData.append('mediaType', mediaType);
    if (activeConversation.leadId) {
      formData.append('leadId', activeConversation.leadId);
    }
    
    // Chamar API de upload
    const response = await fetch(
      `${import.meta.env.VITE_API_URL}/api/v1/whatsapp/chat/send/media/upload?companyId=${user.company.id}`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('win_access_token')}`
        },
        body: formData
      }
    );
    
    if (!response.ok) throw new Error('Erro ao enviar arquivo');
    
    const sentMessage = await response.json();
    setMessages(prev => [...prev, sentMessage]);
    setSelectedFile(null);
    loadConversations();
  } catch (error) {
    console.error('Erro ao enviar arquivo:', error);
    alert('Erro ao enviar arquivo');
  } finally {
    setIsSending(false);
  }
};

// Botão de anexo
<input
  ref={fileInputRef}
  type="file"
  accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.xls,.xlsx"
  onChange={handleFileSelect}
  className="hidden"
/>
<button 
  onClick={() => fileInputRef.current?.click()}
  disabled={supportMode === 'IA'}
  className={`p-3 transition-colors ${
    supportMode === 'IA'
      ? 'text-gray-300 cursor-not-allowed'
      : 'text-gray-400 hover:text-emerald-600'
  }`}
>
  <Paperclip size={20} />
</button>
```

### 7. Atualizar Botão de Envio (Linha ~584-593)
```typescript
<button
  onClick={handleSendMessage}
  disabled={!message.trim() || isSending || supportMode === 'IA'}
  className={`p-3.5 rounded-2xl transition-all shadow-lg disabled:opacity-50 disabled:cursor-not-allowed ${
    supportMode === 'IA'
      ? 'bg-gray-300 text-gray-500'
      : supportMode === 'HUMAN'
      ? 'bg-rose-500 text-white shadow-rose-500/20'
      : 'bg-emerald-600 text-white shadow-emerald-600/20'
  }`}
>
  {isSending ? <Loader2 size={20} className="animate-spin" /> : <Send size={20} />}
</button>
```

### 8. Remover Ícone de Emoji (Linha ~582)
```typescript
// REMOVER esta linha:
<button className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-300 hover:text-emerald-500 transition-colors"><Smile size={20} /></button>
```

## 🎨 Melhorias Visuais

### Indicador de Modo Ativo
Adicionar badge visual mostrando o modo atual:

```typescript
// No header da conversa, após o nome do contato
{activeConversation && (
  <span className={`ml-2 px-2 py-0.5 rounded-full text-[8px] font-black uppercase ${
    activeConversation.supportMode === 'IA'
      ? 'bg-emerald-100 text-emerald-600'
      : 'bg-rose-100 text-rose-600'
  }`}>
    {activeConversation.supportMode === 'IA' ? '🤖 IA Ativa' : '👤 Humano'}
  </span>
)}
```

### Mensagem de Aviso quando IA está Ativa
```typescript
// Antes da área de input, mostrar aviso
{supportMode === 'IA' && (
  <div className="px-6 py-3 bg-emerald-50 border-t border-emerald-100">
    <div className="max-w-4xl mx-auto flex items-center gap-2 text-emerald-700">
      <Bot size={16} />
      <p className="text-xs font-medium">
        IA está respondendo automaticamente. Alterne para modo HUMANO para enviar mensagens.
      </p>
    </div>
  </div>
)}
```

## 🔄 Atualização em Tempo Real

Quando o modo mudar via WebSocket, atualizar automaticamente:

```typescript
const handleWebSocketMessage = useCallback((data: any) => {
  if (data.type === 'SUPPORT_MODE_CHANGED') {
    // Atualizar conversa na lista
    setConversations(prev => prev.map(c =>
      c.id === data.conversationId
        ? { ...c, supportMode: data.mode }
        : c
    ));
    
    // Atualizar conversa ativa se for a mesma
    if (activeConversation?.id === data.conversationId) {
      setActiveConversation(prev => prev ? { ...prev, supportMode: data.mode } : null);
    }
  }
  // ... resto do código
}, [activeConversation]);
```

## ✅ Checklist de Implementação

- [ ] Remover estado local `supportMode`
- [ ] Adicionar função `handleToggleSupportMode`
- [ ] Atualizar botões de modo (IA/HUMAN)
- [ ] Remover ícones de Phone e Video
- [ ] Desabilitar input quando IA ativa
- [ ] Implementar upload de arquivo
- [ ] Atualizar botão de envio
- [ ] Remover ícone de emoji
- [ ] Adicionar badge de modo ativo
- [ ] Adicionar mensagem de aviso
- [ ] Testar alternância de modo
- [ ] Testar upload de arquivos
- [ ] Testar bloqueio de input com IA

## 🧪 Testes

1. **Modo IA**:
   - Input deve estar desabilitado
   - Botão de anexo desabilitado
   - Botão de envio desabilitado
   - Placeholder: "IA está respondendo automaticamente..."

2. **Modo HUMAN**:
   - Input habilitado
   - Botão de anexo habilitado
   - Botão de envio habilitado
   - Placeholder: "Digite sua mensagem..."

3. **Upload de Arquivo**:
   - Clicar no anexo abre seletor
   - Selecionar imagem/vídeo/documento
   - Arquivo é enviado
   - Mensagem aparece no chat

4. **Alternância de Modo**:
   - Clicar em IA → modo muda para IA
   - Clicar em HUMAN → modo muda para HUMAN
   - Estado persiste no banco
   - Atualiza em tempo real

## 🎯 Resultado Final

- ✅ Sem ícones de áudio/vídeo no header
- ✅ Anexo funcional para arquivos
- ✅ Input bloqueado quando IA ativa
- ✅ Modo (IA/HUMAN) salvo por conversa
- ✅ Interface clara do modo atual
- ✅ Experiência fluida e intuitiva
