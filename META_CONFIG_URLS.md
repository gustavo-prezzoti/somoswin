# Configurações da Meta Marketing API - WinAI

Este arquivo contém as URLs e configurações necessárias para o painel de desenvolvedor da Meta (Facebook for Developers).

## 1. URLs de Configuração

### Callback de Login (OAuth)
Utilizada para o redirecionamento após o usuário autorizar a conexão.
- **URL:** `https://server.somoswin.com.br/api/v1/marketing/auth/meta/callback`

### Desautorização de Aplicativo
URL chamada pela Meta quando um usuário remove o aplicativo pelas configurações do Facebook.
- **URL:** `https://server.somoswin.com.br/api/v1/marketing/auth/meta/deauthorize`

### Solicitação de Exclusão de Dados
URL para conformidade com privacidade (LGPD/GDPR), permitindo que usuários solicitem a exclusão de seus dados.
- **URL:** `https://server.somoswin.com.br/api/v1/marketing/auth/meta/data-deletion`

---

## 2. Permissões Necessárias (Scopes)
Adicione estas permissões na seção "Marketing API" e "Instagram Graph API":
- `public_profile`
- `email`
- `ads_management`
- `ads_read`
- `business_management`
- `leads_retrieval`
- `pages_read_engagement`
- `pages_show_list`
- `instagram_basic`
- `instagram_manage_insights`

---

## 3. Credenciais Atuais (application.properties)
- **App ID:** `829099083620605`
- **Redirect URI:** `https://server.somoswin.com.br/api/v1/marketing/auth/meta/callback`
