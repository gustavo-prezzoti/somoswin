package com.backend.winai.util;

import com.backend.winai.entity.WhatsAppConversation;

/**
 * Nome mostrado no app e APIs: sempre prioriza o {@link com.backend.winai.entity.Lead}
 * no CRM; nunca deve refletir o nome da instância (evitado nos webhooks em mensagens fromMe).
 * Se o lead ainda não tem nome útil, usa o push name do cliente no WhatsApp após ele responder.
 */
public final class WhatsAppConversationDisplayName {

    private WhatsAppConversationDisplayName() {
    }

    public static String resolve(WhatsAppConversation conversation) {
        if (conversation == null) {
            return "";
        }
        if (conversation.getLead() != null) {
            String ln = conversation.getLead().getName();
            if (ln != null && !ln.isBlank()) {
                String trimmed = ln.trim();
                if (!isPlaceholderLeadName(trimmed)) {
                    return trimmed;
                }
            }
        }
        String cn = conversation.getContactName();
        if (cn != null && !cn.isBlank() && !"Unknown".equalsIgnoreCase(cn.trim())) {
            return cn.trim();
        }
        String phone = conversation.getPhoneNumber();
        return phone != null ? phone : "";
    }

    /**
     * Nome genérico criado pelo sistema antes do cliente responder ou nome vazio — pode ser
     * substituído pelo push real do WhatsApp na primeira resposta.
     */
    public static boolean isPlaceholderLeadName(String name) {
        if (name == null) {
            return true;
        }
        String n = name.trim();
        if (n.isEmpty()) {
            return true;
        }
        if ("lead whatsapp".equalsIgnoreCase(n)) {
            return true;
        }
        if ("lead".equalsIgnoreCase(n)) {
            return true;
        }
        return false;
    }
}
