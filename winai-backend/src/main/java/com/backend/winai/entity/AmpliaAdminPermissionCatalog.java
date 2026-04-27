package com.backend.winai.entity;

import java.util.Collections;
import java.util.EnumMap;
import java.util.EnumSet;
import java.util.LinkedHashSet;
import java.util.Map;
import java.util.Set;

/**
 * Catálogo de chaves {@code modulo:acao} alinhado a rotas reais do painel Amplia. Validação de papéis e expansão de JWT.
 */
public final class AmpliaAdminPermissionCatalog {

    private static final Map<AmpliaAdminModule, Set<AmpliaAdminAction>> ACTIONS_BY_MODULE;
    private static final Set<String> ALL_KEYS;

    static {
        EnumMap<AmpliaAdminModule, Set<AmpliaAdminAction>> m = new EnumMap<>(AmpliaAdminModule.class);

        m.put(AmpliaAdminModule.dashboard, EnumSet.of(AmpliaAdminAction.list, AmpliaAdminAction.read));
        m.put(AmpliaAdminModule.financas, EnumSet.of(AmpliaAdminAction.list));
        m.put(AmpliaAdminModule.alertas, EnumSet.of(AmpliaAdminAction.list, AmpliaAdminAction.update));
        m.put(AmpliaAdminModule.performance, EnumSet.of(AmpliaAdminAction.list));

        m.put(AmpliaAdminModule.clientes,
                EnumSet.of(AmpliaAdminAction.list, AmpliaAdminAction.read, AmpliaAdminAction.create,
                        AmpliaAdminAction.update, AmpliaAdminAction.delete));
        m.put(AmpliaAdminModule.usuarios,
                EnumSet.of(AmpliaAdminAction.list, AmpliaAdminAction.read, AmpliaAdminAction.create,
                        AmpliaAdminAction.update, AmpliaAdminAction.delete));
        m.put(AmpliaAdminModule.metaads, EnumSet.of(AmpliaAdminAction.list, AmpliaAdminAction.read, AmpliaAdminAction.update));
        m.put(AmpliaAdminModule.metas, EnumSet.of(AmpliaAdminAction.list, AmpliaAdminAction.read));

        m.put(AmpliaAdminModule.gestao_equipe,
                EnumSet.of(AmpliaAdminAction.list, AmpliaAdminAction.read, AmpliaAdminAction.create, AmpliaAdminAction.update));

        m.put(AmpliaAdminModule.contratos,
                EnumSet.of(AmpliaAdminAction.list, AmpliaAdminAction.read, AmpliaAdminAction.create,
                        AmpliaAdminAction.update, AmpliaAdminAction.delete));
        m.put(AmpliaAdminModule.planos,
                EnumSet.of(AmpliaAdminAction.list, AmpliaAdminAction.read, AmpliaAdminAction.create,
                        AmpliaAdminAction.update, AmpliaAdminAction.delete));
        m.put(AmpliaAdminModule.consultoria,
                EnumSet.of(AmpliaAdminAction.list, AmpliaAdminAction.read, AmpliaAdminAction.create, AmpliaAdminAction.update));

        m.put(AmpliaAdminModule.instancias,
                EnumSet.of(AmpliaAdminAction.list, AmpliaAdminAction.read, AmpliaAdminAction.create,
                        AmpliaAdminAction.update, AmpliaAdminAction.delete));
        m.put(AmpliaAdminModule.conexoes,
                EnumSet.of(AmpliaAdminAction.list, AmpliaAdminAction.read, AmpliaAdminAction.create,
                        AmpliaAdminAction.update, AmpliaAdminAction.delete));
        m.put(AmpliaAdminModule.agentes,
                EnumSet.of(AmpliaAdminAction.list, AmpliaAdminAction.read, AmpliaAdminAction.create,
                        AmpliaAdminAction.update, AmpliaAdminAction.delete));

        m.put(AmpliaAdminModule.followup,
                EnumSet.of(AmpliaAdminAction.list, AmpliaAdminAction.read, AmpliaAdminAction.update, AmpliaAdminAction.delete));

        m.put(AmpliaAdminModule.notificacoes_globais,
                EnumSet.of(AmpliaAdminAction.list, AmpliaAdminAction.read, AmpliaAdminAction.update));

        m.put(AmpliaAdminModule.prompts, EnumSet.noneOf(AmpliaAdminAction.class));

        Map<AmpliaAdminModule, Set<AmpliaAdminAction>> unmodifiable = new EnumMap<>(AmpliaAdminModule.class);
        for (Map.Entry<AmpliaAdminModule, Set<AmpliaAdminAction>> e : m.entrySet()) {
            unmodifiable.put(e.getKey(), Collections.unmodifiableSet(e.getValue()));
        }
        ACTIONS_BY_MODULE = Collections.unmodifiableMap(unmodifiable);

        LinkedHashSet<String> keys = new LinkedHashSet<>();
        for (Map.Entry<AmpliaAdminModule, Set<AmpliaAdminAction>> e : ACTIONS_BY_MODULE.entrySet()) {
            String mn = e.getKey().name();
            for (AmpliaAdminAction a : e.getValue()) {
                keys.add(mn + ":" + a.name());
            }
        }
        ALL_KEYS = Collections.unmodifiableSet(keys);
    }

    private AmpliaAdminPermissionCatalog() {}

    /** Ações expostas na API para o módulo (expansão de JWT e checagem de chave granular). */
    public static Set<AmpliaAdminAction> actionsFor(AmpliaAdminModule module) {
        if (module == null) {
            return Set.of();
        }
        return ACTIONS_BY_MODULE.getOrDefault(module, Set.of());
    }

    public static Set<String> allGranularKeys() {
        return ALL_KEYS;
    }

    /** Chave composta {@code modulo:acao} permitida no catálogo. */
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
        if (!AmpliaAdminModule.isValid(mod) || !AmpliaAdminAction.isValid(act)) {
            return false;
        }
        AmpliaAdminModule module;
        try {
            module = AmpliaAdminModule.valueOf(mod);
        } catch (IllegalArgumentException e) {
            return false;
        }
        AmpliaAdminAction action = AmpliaAdminAction.valueOf(act.toLowerCase());
        return actionsFor(module).contains(action);
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
