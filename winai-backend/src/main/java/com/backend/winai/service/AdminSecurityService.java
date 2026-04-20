package com.backend.winai.service;

import com.backend.winai.entity.AmpliaAdminAction;
import com.backend.winai.entity.AmpliaAdminModule;
import com.backend.winai.entity.AmpliaAdminPermissionCatalog;
import com.backend.winai.entity.AmpliaStaffRole;
import com.backend.winai.entity.User;
import com.backend.winai.entity.UserRole;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;

/**
 * Autorização do painel /admin: administradores plenos ou colaborador interno com permissões por módulo/ação.
 */
@Service("adminSecurity")
public class AdminSecurityService {

    public boolean canAccess(Authentication authentication, String moduleId) {
        if (moduleId == null || moduleId.isBlank()) {
            return false;
        }
        for (AmpliaAdminAction a : AmpliaAdminAction.values()) {
            if (hasPermission(authentication, moduleId.trim(), a.name())) {
                return true;
            }
        }
        return false;
    }

    /**
     * Verifica permissão granular {@code module:action} ou legado {@code module} (= todas as ações).
     */
    /**
     * Knowledge Base: clientes (empresa) não passam por RBAC Amplia; colaborador interno precisa de {@code agentes:acao}.
     */
    public boolean canUseKnowledgeBase(Authentication authentication, String action) {
        if (authentication == null || !authentication.isAuthenticated()) {
            return false;
        }
        if (!(authentication.getPrincipal() instanceof User user)) {
            return false;
        }
        if (!Boolean.TRUE.equals(user.getAmpliaInternalStaff())) {
            return true;
        }
        return hasPermission(authentication, "agentes", action);
    }

    public boolean hasPermission(Authentication authentication, String module, String action) {
        if (authentication == null || !authentication.isAuthenticated()) {
            return false;
        }
        Object principal = authentication.getPrincipal();
        if (!(principal instanceof User user)) {
            return false;
        }
        if (user.getRole() == UserRole.SUPER_ADMIN) {
            return true;
        }
        if (user.getRole() == UserRole.ADMIN) {
            if (!Boolean.TRUE.equals(user.getAmpliaInternalStaff())) {
                return true;
            }
            return internalUserHasPermission(user, module, action);
        }
        if (user.getRole() == UserRole.USER && Boolean.TRUE.equals(user.getAmpliaInternalStaff())) {
            return internalUserHasPermission(user, module, action);
        }
        return false;
    }

    private boolean internalUserHasPermission(User user, String moduleId, String action) {
        if (moduleId == null || moduleId.isBlank() || action == null || action.isBlank()) {
            return false;
        }
        String module = moduleId.trim();
        String act = action.trim().toLowerCase();
        if (!AmpliaAdminModule.isValid(module) || !AmpliaAdminAction.isValid(act)) {
            return false;
        }
        AmpliaStaffRole role = user.getAmpliaStaffRole();
        if (role == null || !Boolean.TRUE.equals(role.getActive())) {
            return false;
        }
        if (Boolean.TRUE.equals(role.getFullAccess())) {
            return true;
        }
        Map<String, Boolean> perms = role.getPermissionsJson();
        if (perms == null) {
            return false;
        }
        if (Boolean.TRUE.equals(perms.get("*"))) {
            return true;
        }
        String granular = module + ":" + act;
        if (Boolean.TRUE.equals(perms.get(granular))) {
            return true;
        }
        // Legado: chave só com nome do módulo concede todas as ações daquele módulo
        return Boolean.TRUE.equals(perms.get(module));
    }

    public static List<String> effectivePermissionKeys(AmpliaStaffRole role) {
        if (role == null) {
            return List.of();
        }
        if (Boolean.TRUE.equals(role.getFullAccess())) {
            return new ArrayList<>(AmpliaAdminPermissionCatalog.allGranularKeys());
        }
        Map<String, Boolean> perms = role.getPermissionsJson();
        if (perms == null) {
            return List.of();
        }
        if (Boolean.TRUE.equals(perms.get("*"))) {
            return new ArrayList<>(AmpliaAdminPermissionCatalog.allGranularKeys());
        }
        Set<String> out = new LinkedHashSet<>();
        for (Map.Entry<String, Boolean> e : perms.entrySet()) {
            if (!Boolean.TRUE.equals(e.getValue()) || e.getKey() == null) {
                continue;
            }
            String k = e.getKey().trim();
            if (k.isEmpty()) {
                continue;
            }
            if (k.contains(":")) {
                if (AmpliaAdminPermissionCatalog.isValidGranularKey(k)) {
                    out.add(k);
                }
                continue;
            }
            if ("*".equals(k)) {
                out.addAll(AmpliaAdminPermissionCatalog.allGranularKeys());
                continue;
            }
            if (AmpliaAdminModule.isValid(k)) {
                for (AmpliaAdminAction a : AmpliaAdminAction.values()) {
                    out.add(k + ":" + a.name());
                }
            }
        }
        return new ArrayList<>(out);
    }
}
