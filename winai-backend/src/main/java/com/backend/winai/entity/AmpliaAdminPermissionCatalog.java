package com.backend.winai.entity;

import java.util.Collections;
import java.util.LinkedHashSet;
import java.util.Set;

/**
 * Catálogo de chaves {@code modulo:acao}. Validação de papéis e expansão de JWT.
 */
public final class AmpliaAdminPermissionCatalog {

    private static final Set<String> ALL_KEYS;

    static {
        LinkedHashSet<String> s = new LinkedHashSet<>();
        for (AmpliaAdminModule m : AmpliaAdminModule.values()) {
            for (AmpliaAdminAction a : AmpliaAdminAction.values()) {
                s.add(m.name() + ":" + a.name());
            }
        }
        ALL_KEYS = Collections.unmodifiableSet(s);
    }

    private AmpliaAdminPermissionCatalog() {}

    public static Set<String> allGranularKeys() {
        return ALL_KEYS;
    }

    /** Chave composta {@code modulo:acao}. */
    public static boolean isValidGranularKey(String key) {
        if (key == null || !key.contains(":")) {
            return false;
        }
        int i = key.indexOf(':');
        if (i <= 0 || i >= key.length() - 1) {
            return false;
        }
        String mod = key.substring(0, i).trim();
        String act = key.substring(i + 1).trim();
        if (!AmpliaAdminModule.isValid(mod)) {
            return false;
        }
        return AmpliaAdminAction.isValid(act);
    }

    /**
     * Válido no JSON de permissões: chave granular, chave legada (só módulo), ou '*' (wildcard lógico).
     */
    public static boolean isValidPermissionEntryKey(String key) {
        if (key == null || key.isBlank()) {
            return false;
        }
        String k = key.trim();
        if ("*".equals(k)) {
            return true;
        }
        if (k.contains(":")) {
            return isValidGranularKey(k);
        }
        return AmpliaAdminModule.isValid(k);
    }

    public static void validatePermissionMap(java.util.Map<String, ?> map) {
        if (map == null) {
            return;
        }
        for (String key : map.keySet()) {
            if (!isValidPermissionEntryKey(key)) {
                throw new IllegalArgumentException("Permissão inválida: " + key);
            }
        }
    }

    public static String key(String module, String action) {
        if (module == null || action == null) {
            return "";
        }
        return module.trim() + ":" + action.trim().toLowerCase();
    }
}
