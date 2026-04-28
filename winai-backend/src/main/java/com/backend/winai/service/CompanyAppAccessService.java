package com.backend.winai.service;

import com.backend.winai.entity.User;
import com.backend.winai.entity.UserRole;
import com.backend.winai.security.CompanyAppModule;
import org.springframework.stereotype.Service;

import java.util.Map;

@Service
public class CompanyAppAccessService {

    /**
     * SUPER_ADMIN e colaborador interno Amplia: acesso total às APIs do app cliente.
     * ADMIN da empresa: acesso total aos módulos do app (papél na empresa).
     * app_full_access: bypass do mapa.
     * app_module_grants null ou vazio: compatível com antes — todos os módulos permitidos.
     */
    public boolean mayAccessModule(User user, CompanyAppModule module) {
        if (user == null || module == null) {
            return false;
        }
        if (user.getRole() == UserRole.SUPER_ADMIN) {
            return true;
        }
        if (Boolean.TRUE.equals(user.getAmpliaInternalStaff())) {
            return true;
        }
        if (user.getRole() == UserRole.ADMIN && user.getCompany() != null) {
            return true;
        }
        if (Boolean.TRUE.equals(user.getAppFullAccess())) {
            return true;
        }
        Map<String, Boolean> grants = user.getAppModuleGrants();
        if (grants == null || grants.isEmpty()) {
            return true;
        }
        Boolean v = grants.get(module.name());
        if (v == null) {
            return true;
        }
        return Boolean.TRUE.equals(v);
    }
}
