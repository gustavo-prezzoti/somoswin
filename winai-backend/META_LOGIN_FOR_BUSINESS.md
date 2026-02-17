# Facebook Login - Erro "App não está disponível"

## ⚠️ Causa principal: Business Verification

O erro **"Parece que esse app não está disponível"** e **"Este app precisa pelo menos do supported permission"** ocorre quando **usuários externos** (que não têm função no app) tentam conectar.

Segundo a [documentação da Meta](https://developers.facebook.com/docs/development/release/business-verification):

> Apps que permitem que outras empresas acessem seus próprios dados precisam estar conectados a uma empresa que completou a **Business Verification**. Até lá, usuários de outras empresas não conseguirão conceder permissões ao app.

- **Usuários com função** (Admin, Desenvolvedor, Testador) → conectam normalmente
- **Usuários externos** → precisam que a empresa do app esteja **verificada**

### Como resolver

1. **Meta for Developers** → seu app (n8n-somoswin-DM) → **Configurações** → **Básico** → **Verificação**
2. Clique em **Iniciar verificação** e vincule o app a uma empresa (Business)
3. No **Business Manager** (business.facebook.com), complete a **Verificação da empresa** com os documentos solicitados
4. Após aprovação (pode levar alguns dias), usuários externos poderão conectar

### Alternativa temporária

Para testar com outros usuários sem Business Verification: adicione-os como **Testadores** em Funções → Funções no App Dashboard.

---

## Erro "pages_read_engagement" ao buscar posts da página

O endpoint de posts da página exige **`pages_read_engagement`** e, em alguns casos, **`pages_read_user_content`** ou o recurso **Page Public Content Access**.

### Como resolver (Facebook Login for Business)

1. **Meta for Developers** → seu app → **Use cases** → **Facebook Login for Business**
2. Edite a configuração (config_id) usada pelo app
3. Em **Permissions**, adicione:
   - **`pages_read_engagement`** (obrigatório)
   - **`pages_read_user_content`** (recomendado para ler posts)
   - **`whatsapp_business_management`** (para listar números WhatsApp nas campanhas)
4. Salve e peça aos usuários para **reconectar** a conta Meta em Configurações

Se o app usa OAuth com `scope` (sem config_id), inclua todas as permissões no scope. Usuários que conectaram antes precisam reconectar para conceder as novas permissões.
