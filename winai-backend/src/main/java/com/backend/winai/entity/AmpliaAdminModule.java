package com.backend.winai.entity;

import java.util.Collections;
import java.util.LinkedHashSet;
import java.util.Set;

/**
 * Chaves de módulo do painel Amplia (/admin). Alinhado ao menu em adminAmpliaRoutes.
 */
public enum AmpliaAdminModule {
    dashboard,
    clientes,
    usuarios,
    metaads,
    metas,
    alertas,
    performance,
    gestao_equipe,
    contratos,
    /** Catálogo de planos (CRUD / clone) para contratos e Asaas */
    planos,
    financas,
    instancias,
    conexoes,
    agentes,
    followup,
    prompts,
    /** Configuração admin: alertas WhatsApp / transbordo humano por empresa */
    notificacoes_globais,
    consultoria;

    private static final Set<String> ALL_IDS;

    static {
        LinkedHashSet<String> s = new LinkedHashSet<>();
        for (AmpliaAdminModule m : values()) {
            s.add(m.name());
        }
        ALL_IDS = Collections.unmodifiableSet(s);
    }

    public static Set<String> allIds() {
        return ALL_IDS;
    }

    public static boolean isValid(String id) {
        if (id == null || id.isBlank()) {
            return false;
        }
        if ("*".equals(id.trim())) {
            return true;
        }
        try {
            AmpliaAdminModule.valueOf(id.trim());
            return true;
        } catch (IllegalArgumentException e) {
            return false;
        }
    }

    public static void validatePermissionMap(java.util.Map<String, Boolean> map) {
        if (map == null) {
            return;
        }
        for (String key : map.keySet()) {
            if (!isValid(key)) {
                throw new IllegalArgumentException("Permissão inválida: " + key);
            }
        }
    }
}
