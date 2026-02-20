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
   - **`whatsapp_business_management`** (obrigatório para listar números via WABAs com System User)
   - **`whatsapp_business_messaging`** (recomendado para `client_whatsapp_business_accounts`)
4. Salve e peça aos usuários para **reconectar** a conta Meta em Configurações

Se o app usa OAuth com `scope` (sem config_id), inclua todas as permissões no scope. Usuários que conectaram antes precisam reconectar para conceder as novas permissões.

---

## Dois config_id: Enterprise + SomosAmplia

- **Enterprise (1749892883082238)** – System User token, ads, páginas, WABAs. Usado no connect principal.
- **SomosAmplia (1792297934776856)** – User token, `whatsapp_business_management`. Usado no botão "Adicionar número".

O User token permite `/me/accounts?fields=whatsapp_number`, que retorna os números vinculados às páginas. Configure `META_WHATSAPP_CONFIG_ID=1792297934776856`.

---

## Números WhatsApp nas campanhas (Click to WhatsApp)

Para o seletor "Número WhatsApp" na criação de campanha exibir os números conectados ao Business Manager:

1. **Conecte o WhatsApp à página** no Facebook: Configurações da Página → WhatsApp → Vincular número
2. **Permissão** `whatsapp_business_management` no app (Facebook Login for Business)
3. **Reconecte** o Meta Ads em Configurações após adicionar a permissão
4. Os números são obtidos via `/{business-id}/owned_pages?fields=id,name,whatsapp_number` (BM) e fallbacks
