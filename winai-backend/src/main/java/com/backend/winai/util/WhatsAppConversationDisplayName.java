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

    /**
     * Remove nomes que não são do contato: igual à instância UaZap, ao owner, ou ao nome da empresa —
     * cenário comum quando o payload preenche {@code chat.name} com o nome comercial da conexão.
     */
    public static String sanitizeInboundContactDisplayName(
            String name,
            String instanceName,
            String owner,
            String companyName,
            String companyContratante) {
        if (name == null) {
            return null;
        }
        String t = name.trim();
        if (t.isEmpty() || "unknown".equalsIgnoreCase(t)) {
            return null;
        }
        if (instanceName != null && !instanceName.isBlank() && t.equalsIgnoreCase(instanceName.trim())) {
            return null;
        }
        if (owner != null && !owner.isBlank()) {
            String ow = owner.trim();
            if (t.equalsIgnoreCase(ow)) {
                return null;
            }
            String digitsOwner = ow.replaceAll("\\D", "");
            String digitsName = t.replaceAll("\\D", "");
            if (!digitsOwner.isEmpty() && !digitsName.isEmpty() && digitsOwner.equals(digitsName)) {
                return null;
            }
        }
        if (companyName != null && !companyName.isBlank() && t.equalsIgnoreCase(companyName.trim())) {
            return null;
        }
        if (companyContratante != null && !companyContratante.isBlank() && t.equalsIgnoreCase(companyContratante.trim())) {
            return null;
        }
        return t;
    }

    /** Nome atual do lead parece genérico ou é o mesmo da instância/empresa — pode ser substituído por um push válido. */
    public static boolean isLikelyNonCustomerLeadName(
            String name,
            String instanceName,
            String owner,
            String companyName,
            String companyContratante) {
        if (name == null || name.isBlank()) {
            return false;
        }
        if (isPlaceholderLeadName(name)) {
            return true;
        }
        return sanitizeInboundContactDisplayName(name, instanceName, owner, companyName, companyContratante) == null;
    }
}
