package com.backend.winai.util;

/**
 * E-mail mascarado e prefixo estável para filtrar logs do fluxo admin (/auth/login, /user/me) em Docker.
 */
public final class AuthAuditHelper {

    public static final String FLOW_PREFIX = "[AmpliaAdminFlow]";

    private AuthAuditHelper() {}

    public static String maskEmail(String email) {
        if (email == null || email.isBlank()) {
            return "(empty)";
        }
        String trimmed = email.trim();
        int at = trimmed.indexOf('@');
        if (at <= 0) {
            return "***";
        }
        String local = trimmed.substring(0, at);
        String domain = trimmed.substring(at + 1);
        String maskedLocal =
                local.length() <= 2 ? local.charAt(0) + "*" : local.substring(0, 2) + "***";
        return maskedLocal + "@" + domain;
    }
}
