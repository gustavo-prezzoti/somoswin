# Componente ConfirmModal - Guia de Uso

## 📋 Visão Geral

O `ConfirmModal` é um componente reutilizável para confirmação de ações em todas as telas do admin. Ele garante consistência visual e de UX em todo o sistema.

## 🎯 Localização

```
winai/src/components/Admin/
├── ConfirmModal.tsx
└── ConfirmModal.css
```

## 📦 Importação

```tsx
import ConfirmModal from './ConfirmModal';
```

## 🔧 Props

| Prop | Tipo | Obrigatório | Padrão | Descrição |
|------|------|-------------|--------|-----------|
| `isOpen` | `boolean` | ✅ | - | Controla se o modal está visível |
| `title` | `string` | ✅ | - | Título do modal |
| `message` | `string` | ✅ | - | Mensagem descritiva |
| `confirmText` | `string` | ❌ | "Confirmar" | Texto do botão de confirmação |
| `cancelText` | `string` | ❌ | "Cancelar" | Texto do botão de cancelar |
| `onConfirm` | `() => void` | ✅ | - | Função executada ao confirmar |
| `onCancel` | `() => void` | ✅ | - | Função executada ao cancelar |
| `variant` | `'danger' \| 'warning' \| 'info'` | ❌ | "danger" | Variante de cor do modal |

## 🎨 Variantes

### Danger (Vermelho)
Usado para ações destrutivas como deletar, remover, excluir.

```tsx
<ConfirmModal
    variant="danger"
    title="Confirmar Exclusão"
    message="Esta ação não pode ser desfeita."
    // ...
/>
```

### Warning (Amarelo)
Usado para ações que requerem atenção mas não são destrutivas.

```tsx
<ConfirmModal
    variant="warning"
    title="Atenção"
    message="Você tem certeza que deseja continuar?"
    // ...
/>
```

### Info (Azul)
Usado para confirmações informativas.

```tsx
<ConfirmModal
    variant="info"
    title="Confirmar Ação"
    message="Deseja prosseguir com esta operação?"
    // ...
/>
```

## 💡 Exemplo Completo

### 1. Adicionar Estados

```tsx
const [showDeleteModal, setShowDeleteModal] = useState(false);
const [itemToDelete, setItemToDelete] = useState<string | null>(null);
```

### 2. Criar Funções

```tsx
const openDeleteModal = (itemId: string) => {
    setItemToDelete(itemId);
    setShowDeleteModal(true);
};

const handleDelete = async () => {
    if (!itemToDelete) return;
    
    try {
        // Sua lógica de exclusão aqui
        await deleteItem(itemToDelete);
        
        // Fechar modal e limpar estado
        setShowDeleteModal(false);
        setItemToDelete(null);
        
        // Recarregar dados
        loadData();
    } catch (error) {
        console.error('Erro ao deletar:', error);
    }
};
```

### 3. Adicionar Botão

```tsx
<button onClick={() => openDeleteModal(item.id)}>
    <Trash2 size={16} />
</button>
```

### 4. Renderizar Modal

```tsx
<ConfirmModal
    isOpen={showDeleteModal}
    title="Confirmar Exclusão"
    message="Tem certeza que deseja excluir este item? Esta ação não pode ser desfeita."
    confirmText="Excluir"
    cancelText="Cancelar"
    variant="danger"
    onConfirm={handleDelete}
    onCancel={() => {
        setShowDeleteModal(false);
        setItemToDelete(null);
    }}
/>
```

## 🎯 Casos de Uso

### Deletar Usuário

```tsx
<ConfirmModal
    isOpen={showDeleteModal}
    title="Excluir Usuário"
    message="Tem certeza que deseja excluir este usuário? Todos os dados associados serão perdidos."
    confirmText="Excluir Usuário"
    variant="danger"
    onConfirm={handleDeleteUser}
    onCancel={closeModal}
/>
```

### Desativar Instância

```tsx
<ConfirmModal
    isOpen={showDeactivateModal}
    title="Desativar Instância"
    message="Deseja desativar esta instância? Ela poderá ser reativada posteriormente."
    confirmText="Desativar"
    variant="warning"
    onConfirm={handleDeactivate}
    onCancel={closeModal}
/>
```

### Confirmar Alterações

```tsx
<ConfirmModal
    isOpen={showSaveModal}
    title="Salvar Alterações"
    message="Deseja salvar as alterações realizadas?"
    confirmText="Salvar"
    variant="info"
    onConfirm={handleSave}
    onCancel={closeModal}
/>
```

## ✨ Benefícios

1. **Consistência** - Mesmo visual em todas as telas
2. **Reutilizável** - Não precisa recriar o modal em cada tela
3. **Manutenível** - Mudanças em um lugar afetam todo o sistema
4. **Acessível** - Estrutura semântica e responsiva
5. **Flexível** - 3 variantes para diferentes contextos

## 🎨 Customização

Se precisar customizar cores ou estilos, edite o arquivo `ConfirmModal.css`. As mudanças serão aplicadas em todas as telas que usam o componente.

## 📱 Responsividade

O modal é totalmente responsivo:
- Desktop: Botões lado a lado
- Mobile: Botões empilhados verticalmente

## ⚠️ Boas Práticas

1. **Use variantes apropriadas**
   - `danger`: Ações destrutivas
   - `warning`: Ações que requerem atenção
   - `info`: Confirmações gerais

2. **Mensagens claras**
   - Seja específico sobre o que vai acontecer
   - Mencione se a ação é irreversível

3. **Textos dos botões**
   - Use verbos de ação ("Excluir", "Confirmar", "Salvar")
   - Evite textos genéricos quando possível

4. **Limpeza de estado**
   - Sempre limpe os estados ao fechar o modal
   - Previna memory leaks

## 🔄 Migração de Modais Existentes

Se você tem um modal customizado, migre para o ConfirmModal:

**Antes:**
```tsx
{showModal && (
    <div className="modal-overlay">
        <div className="modal-content">
            <h2>Título</h2>
            <p>Mensagem</p>
            <button onClick={handleConfirm}>OK</button>
            <button onClick={handleCancel}>Cancelar</button>
        </div>
    </div>
)}
```

**Depois:**
```tsx
<ConfirmModal
    isOpen={showModal}
    title="Título"
    message="Mensagem"
    confirmText="OK"
    onConfirm={handleConfirm}
    onCancel={handleCancel}
/>
```

## 🎉 Conclusão

Use o `ConfirmModal` em todas as telas do admin para manter consistência e melhorar a experiência do usuário!
