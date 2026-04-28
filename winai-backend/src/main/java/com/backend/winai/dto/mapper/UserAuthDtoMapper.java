package com.backend.winai.dto.mapper;

import com.backend.winai.dto.response.AuthResponse;
import com.backend.winai.entity.AmpliaStaffRole;
import com.backend.winai.entity.User;
import com.backend.winai.service.AdminSecurityService;

public final class UserAuthDtoMapper {

    private UserAuthDtoMapper() {}

    public static AuthResponse.UserDTO toDto(User fullUser) {
        AuthResponse.CompanyDTO companyDTO = null;
        if (fullUser.getCompany() != null) {
            companyDTO = AuthResponse.CompanyDTO.builder()
                    .id(fullUser.getCompany().getId())
                    .name(fullUser.getCompany().getName())
                    .segment(fullUser.getCompany().getSegment())
                    .plan(fullUser.getCompany().getPlan())
                    .build();
        }

        String planName;
        if (Boolean.TRUE.equals(fullUser.getAmpliaInternalStaff())) {
            planName = "INTERNAL_STAFF";
        } else if (fullUser.getCompany() != null) {
            planName = fullUser.getCompany().getPlan().name();
        } else {
            planName = "STARTER";
        }

        AmpliaStaffRole sr = fullUser.getAmpliaStaffRole();
        AuthResponse.UserDTO.UserDTOBuilder b = AuthResponse.UserDTO.builder()
                .id(fullUser.getId())
                .email(fullUser.getEmail())
                .name(fullUser.getName())
                .role(fullUser.getRole().name())
                .plan(planName)
                .company(companyDTO)
                .avatarUrl(fullUser.getAvatarUrl())
                .phone(fullUser.getPhone())
                .jobTitle(fullUser.getJobTitle())
                .ampliaInternalStaff(Boolean.TRUE.equals(fullUser.getAmpliaInternalStaff()))
                .ampliaStaffType(fullUser.getAmpliaStaffType() != null ? fullUser.getAmpliaStaffType().name() : null);

        if (Boolean.TRUE.equals(fullUser.getAmpliaInternalStaff())) {
            if (sr != null) {
                b.ampliaStaffRoleId(sr.getId())
                        .ampliaStaffRoleName(sr.getName())
                        .ampliaStaffPermissions(AdminSecurityService.effectivePermissionKeys(sr))
                        .ampliaStaffFullAccess(sr.getFullAccess());
            } else {
                b.ampliaStaffPermissions(java.util.List.of()).ampliaStaffFullAccess(false);
            }
        }

        b.appFullAccess(Boolean.TRUE.equals(fullUser.getAppFullAccess()))
                .appModuleGrants(fullUser.getAppModuleGrants());

        return b.build();
    }
}
