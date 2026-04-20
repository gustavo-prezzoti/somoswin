package com.backend.winai.entity;

/**
 * Ações granulares do painel Amplia (/admin). Combinam com {@link AmpliaAdminModule} como {@code modulo:acao}.
 */
public enum AmpliaAdminAction {
    list,
    read,
    create,
    update,
    delete;

    public static boolean isValid(String raw) {
        if (raw == null || raw.isBlank()) {
            return false;
        }
        try {
            AmpliaAdminAction.valueOf(raw.trim().toLowerCase());
            return true;
        } catch (IllegalArgumentException e) {
            return false;
        }
    }
}
