package com.backend.winai.service;

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

@Service("adminSecurity")
public class AdminSecurityService {

    public boolean canAccess(Authentication authentication, String moduleId) {
        return hasPermission(authentication, moduleId, null);
    }

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

    public boolean hasPermission(Authentication authentication, String module, String ignoredAction) {
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
            return internalUserHasPermission(user, module);
        }
        if (user.getRole() == UserRole.USER && Boolean.TRUE.equals(user.getAmpliaInternalStaff())) {
            return internalUserHasPermission(user, module);
        }
        return false;
    }

    private boolean internalUserHasPermission(User user, String moduleId) {
        if (moduleId == null || moduleId.isBlank()) {
            return false;
        }
        String module = AmpliaAdminPermissionCatalog.normalizeKey(moduleId);
        if (module == null || !AmpliaAdminModule.isValid(module)) {
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
        if (Boolean.TRUE.equals(perms.get(module))) {
            return true;
        }
        for (Map.Entry<String, Boolean> e : perms.entrySet()) {
            if (!Boolean.TRUE.equals(e.getValue()) || e.getKey() == null) continue;
            String normalized = AmpliaAdminPermissionCatalog.normalizeKey(e.getKey());
            if (module.equals(normalized)) {
                return true;
            }
        }
        return false;
    }

    public static List<String> effectivePermissionKeys(AmpliaStaffRole role) {
        if (role == null) {
            return List.of();
        }
        if (Boolean.TRUE.equals(role.getFullAccess())) {
            return new ArrayList<>(AmpliaAdminPermissionCatalog.allModuleKeys());
        }
        Map<String, Boolean> perms = role.getPermissionsJson();
        if (perms == null) {
            return List.of();
        }
        if (Boolean.TRUE.equals(perms.get("*"))) {
            return new ArrayList<>(AmpliaAdminPermissionCatalog.allModuleKeys());
        }
        Set<String> out = new LinkedHashSet<>();
        for (Map.Entry<String, Boolean> e : perms.entrySet()) {
            if (!Boolean.TRUE.equals(e.getValue()) || e.getKey() == null) {
                continue;
            }
            String normalized = AmpliaAdminPermissionCatalog.normalizeKey(e.getKey());
            if (normalized == null || normalized.isEmpty() || "*".equals(normalized)) {
                continue;
            }
            if (AmpliaAdminModule.isValid(normalized)) {
                out.add(normalized);
            }
        }
        return new ArrayList<>(out);
    }
}
