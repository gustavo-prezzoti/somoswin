package com.backend.winai.entity;

import java.util.Collections;
import java.util.LinkedHashSet;
import java.util.Set;

public final class AmpliaAdminPermissionCatalog {

    private static final Set<String> ALL_KEYS;

    static {
        LinkedHashSet<String> keys = new LinkedHashSet<>();
        for (AmpliaAdminModule m : AmpliaAdminModule.values()) {
            keys.add(m.name());
        }
        ALL_KEYS = Collections.unmodifiableSet(keys);
    }

    private AmpliaAdminPermissionCatalog() {}

    public static Set<String> allModuleKeys() {
        return ALL_KEYS;
    }

    public static boolean isValidPermissionEntryKey(String key) {
        if (key == null || key.isBlank()) {
            return false;
        }
        String k = key.trim();
        if ("*".equals(k)) {
            return true;
        }
        if (k.contains(":")) {
            String mod = k.substring(0, k.indexOf(':')).trim();
            return AmpliaAdminModule.isValid(mod);
        }
        return AmpliaAdminModule.isValid(k);
    }

    public static String normalizeKey(String key) {
        if (key == null) return null;
        String k = key.trim();
        if (k.isEmpty() || "*".equals(k)) return k;
        if (k.contains(":")) {
            return k.substring(0, k.indexOf(':')).trim();
        }
        return k;
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
}
