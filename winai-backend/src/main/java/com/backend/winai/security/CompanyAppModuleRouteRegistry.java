package com.backend.winai.security;

import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;

/**
 * Prefixos de URL (mais específicos primeiro) → módulo do app cliente.
 * Rotas não listadas aqui não passam por checagem de módulo no filtro (transversais).
 */
@Component
public class CompanyAppModuleRouteRegistry {

    private static final List<PrefixMapping> MAPPINGS;

    static {
        List<PrefixMapping> list = new ArrayList<>(List.of(
                new PrefixMapping("/api/v1/whatsapp/broadcasts", CompanyAppModule.ACTIVE_BASE),
                new PrefixMapping("/api/v1/dashboard/export", CompanyAppModule.CRM),
                new PrefixMapping("/api/v1/dashboard/goals", CompanyAppModule.GOALS),
                new PrefixMapping("/api/v1/dashboard/strategic-playbook", CompanyAppModule.GOALS),
                new PrefixMapping("/api/v1/whatsapp", CompanyAppModule.WHATSAPP),
                new PrefixMapping("/api/v1/leads", CompanyAppModule.CRM),
                new PrefixMapping("/api/v1/knowledge-bases", CompanyAppModule.CRM),
                new PrefixMapping("/api/v1/intelligent-listening", CompanyAppModule.INTELLIGENT_LISTENING),
                new PrefixMapping("/api/v1/meetings", CompanyAppModule.CALENDAR),
                new PrefixMapping("/api/v1/agendamento", CompanyAppModule.CALENDAR),
                new PrefixMapping("/api/v1/marketing", CompanyAppModule.MARKETING),
                new PrefixMapping("/api/v1/google-ads", CompanyAppModule.MARKETING),
                new PrefixMapping("/api/v1/traffic/chat", CompanyAppModule.MARKETING),
                new PrefixMapping("/api/v1/consultancy", CompanyAppModule.CONSULTANCY),
                new PrefixMapping("/api/v1/uazap", CompanyAppModule.WHATSAPP)));
        list.sort(Comparator.comparing((PrefixMapping m) -> m.prefix.length()).reversed());
        MAPPINGS = List.copyOf(list);
    }

    public CompanyAppModule resolveModule(String requestUri) {
        if (requestUri == null) {
            return null;
        }
        for (PrefixMapping m : MAPPINGS) {
            if (requestUri.startsWith(m.prefix)) {
                return m.module;
            }
        }
        return null;
    }

    private record PrefixMapping(String prefix, CompanyAppModule module) {}
}
