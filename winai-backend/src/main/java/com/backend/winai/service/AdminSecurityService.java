package com.backend.winai.service;

import com.backend.winai.entity.AmpliaAdminModule;
import com.backend.winai.entity.AmpliaStaffRole;
import com.backend.winai.entity.User;
import com.backend.winai.entity.UserRole;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;

/**
 * Autorização do painel /admin: administradores plenos ou colaborador interno com permissões por módulo.
 */
@Service("adminSecurity")
public class AdminSecurityService {

    public boolean canAccess(Authentication authentication, String moduleId) {
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
            return internalUserHasModule(user, moduleId);
        }
        if (user.getRole() == UserRole.USER && Boolean.TRUE.equals(user.getAmpliaInternalStaff())) {
            return internalUserHasModule(user, moduleId);
        }
        return false;
    }

    private boolean internalUserHasModule(User user, String moduleId) {
        if (moduleId == null || moduleId.isBlank()) {
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
        if (perms != null && Boolean.TRUE.equals(perms.get("*"))) {
            return true;
        }
        return perms != null && Boolean.TRUE.equals(perms.get(moduleId.trim()));
    }

    public static List<String> effectivePermissionKeys(AmpliaStaffRole role) {
        if (role == null) {
            return List.of();
        }
        if (Boolean.TRUE.equals(role.getFullAccess())) {
            return new ArrayList<>(AmpliaAdminModule.allIds());
        }
        Map<String, Boolean> perms = role.getPermissionsJson();
        if (perms == null) {
            return List.of();
        }
        List<String> out = new ArrayList<>();
        for (AmpliaAdminModule m : AmpliaAdminModule.values()) {
            if (Boolean.TRUE.equals(perms.get(m.name()))) {
                out.add(m.name());
            }
        }
        if (Boolean.TRUE.equals(perms.get("*"))) {
            out.clear();
            out.addAll(AmpliaAdminModule.allIds());
        }
        return out;
    }
}
