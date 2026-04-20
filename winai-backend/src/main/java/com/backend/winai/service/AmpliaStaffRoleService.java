package com.backend.winai.service;

import com.backend.winai.dto.request.CreateAmpliaStaffRoleRequest;
import com.backend.winai.dto.request.PatchAmpliaStaffRoleRequest;
import com.backend.winai.dto.response.AmpliaStaffRoleResponse;
import com.backend.winai.entity.AmpliaAdminPermissionCatalog;
import com.backend.winai.entity.AmpliaStaffRole;
import com.backend.winai.repository.AmpliaStaffRoleRepository;
import com.backend.winai.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class AmpliaStaffRoleService {

    private final AmpliaStaffRoleRepository roleRepository;
    private final UserRepository userRepository;

    @Transactional(readOnly = true)
    public List<AmpliaStaffRoleResponse> listForAdmin() {
        return roleRepository.findAll().stream()
                .sorted((a, b) -> a.getName().compareToIgnoreCase(b.getName()))
                .map(this::toResponse)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<AmpliaStaffRoleResponse> listActiveForStaffForms() {
        return roleRepository.findByActiveTrueOrderByNameAsc().stream()
                .map(this::toResponse)
                .collect(Collectors.toList());
    }

    @Transactional
    public AmpliaStaffRoleResponse create(CreateAmpliaStaffRoleRequest request) {
        String name = request.getName().trim();
        if (roleRepository.existsByNameIgnoreCase(name)) {
            throw new RuntimeException("Já existe um papel com esse nome");
        }
        validatePermissions(request.getFullAccess(), request.getPermissions());

        AmpliaStaffRole role = AmpliaStaffRole.builder()
                .name(name)
                .description(request.getDescription() != null ? request.getDescription().trim() : null)
                .active(true)
                .fullAccess(Boolean.TRUE.equals(request.getFullAccess()))
                .permissionsJson(normalizePermissions(request.getPermissions(), request.getFullAccess()))
                .legacyStaffType(null)
                .build();
        role = roleRepository.save(role);
        return toResponse(role);
    }

    @Transactional
    public AmpliaStaffRoleResponse update(UUID id, PatchAmpliaStaffRoleRequest request) {
        AmpliaStaffRole role = roleRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Papel não encontrado"));
        if (request.getName() != null && !request.getName().isBlank()) {
            String nm = request.getName().trim();
            if (roleRepository.existsByNameIgnoreCaseAndIdNot(nm, id)) {
                throw new RuntimeException("Já existe um papel com esse nome");
            }
            role.setName(nm);
        }
        if (request.getDescription() != null) {
            role.setDescription(request.getDescription().isBlank() ? null : request.getDescription().trim());
        }
        if (request.getActive() != null) {
            role.setActive(request.getActive());
        }
        if (request.getFullAccess() != null) {
            role.setFullAccess(request.getFullAccess());
        }
        if (request.getPermissions() != null) {
            validatePermissions(role.getFullAccess(), request.getPermissions());
            role.setPermissionsJson(normalizePermissions(request.getPermissions(), role.getFullAccess()));
        } else if (request.getFullAccess() != null) {
            role.setPermissionsJson(normalizePermissions(Map.of(), role.getFullAccess()));
        }
        role = roleRepository.save(role);
        return toResponse(role);
    }

    @Transactional
    public void delete(UUID id) {
        AmpliaStaffRole role = roleRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Papel não encontrado"));
        if (role.getLegacyStaffType() != null) {
            throw new RuntimeException("Não é possível excluir um papel de sistema legado.");
        }
        long inUse = userRepository.countByAmpliaStaffRole_Id(id);
        if (inUse > 0) {
            throw new RuntimeException(
                    "Existem colaboradores usando este papel. Reatribua o papel deles antes de excluir.");
        }
        roleRepository.delete(role);
    }

    private void validatePermissions(boolean fullAccess, Map<String, Boolean> perms) {
        if (fullAccess) {
            return;
        }
        AmpliaAdminPermissionCatalog.validatePermissionMap(perms);
    }

    private Map<String, Boolean> normalizePermissions(Map<String, Boolean> raw, boolean fullAccess) {
        if (fullAccess) {
            return new HashMap<>();
        }
        Map<String, Boolean> out = new HashMap<>();
        if (raw != null) {
            for (Map.Entry<String, Boolean> e : raw.entrySet()) {
                if (e.getKey() != null && Boolean.TRUE.equals(e.getValue())) {
                    out.put(e.getKey().trim(), true);
                }
            }
        }
        return out;
    }

    private AmpliaStaffRoleResponse toResponse(AmpliaStaffRole role) {
        return AmpliaStaffRoleResponse.builder()
                .id(role.getId())
                .name(role.getName())
                .description(role.getDescription())
                .active(Boolean.TRUE.equals(role.getActive()))
                .fullAccess(Boolean.TRUE.equals(role.getFullAccess()))
                .permissions(role.getPermissionsJson() != null ? new HashMap<>(role.getPermissionsJson()) : Map.of())
                .legacyStaffType(role.getLegacyStaffType() != null ? role.getLegacyStaffType().name() : null)
                .build();
    }

    public AmpliaStaffRole requireActiveRole(UUID id) {
        AmpliaStaffRole r = roleRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Papel não encontrado"));
        if (!Boolean.TRUE.equals(r.getActive())) {
            throw new RuntimeException("Papel inativo");
        }
        return r;
    }
}
