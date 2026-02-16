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
