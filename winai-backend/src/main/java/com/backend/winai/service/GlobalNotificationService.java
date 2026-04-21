package com.backend.winai.service;

import com.backend.winai.dto.request.GlobalNotificationConfigRequest;
import com.backend.winai.dto.response.GlobalNotificationConfigResponse;
import com.backend.winai.entity.Company;
import com.backend.winai.entity.GlobalNotificationConfig;
import com.backend.winai.repository.CompanyRepository;
import com.backend.winai.repository.GlobalNotificationConfigRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class GlobalNotificationService {

    private final GlobalNotificationConfigRepository repository;
    private final CompanyRepository companyRepository;

    @Transactional(readOnly = true)
    public GlobalNotificationConfig getConfig(UUID companyId) {
        return repository.findByCompanyId(companyId).orElse(null);
    }

    @Transactional(readOnly = true)
    public GlobalNotificationConfigResponse getConfigResponse(UUID companyId) {
        return repository.findByCompanyId(companyId)
                .map(c -> toResponse(c, companyId))
                .orElse(null);
    }

    @Transactional
    public GlobalNotificationConfigResponse saveConfigResponse(GlobalNotificationConfigRequest request) {
        GlobalNotificationConfig saved = saveConfig(request);
        return toResponse(saved, request.getCompanyId());
    }

    private GlobalNotificationConfigResponse toResponse(GlobalNotificationConfig c, UUID companyId) {
        if (c == null) {
            return null;
        }
        return GlobalNotificationConfigResponse.builder()
                .id(c.getId())
                .companyId(companyId)
                .humanHandoffNotificationEnabled(c.getHumanHandoffNotificationEnabled())
                .humanHandoffPhone(c.getHumanHandoffPhone())
                .humanHandoffMessage(c.getHumanHandoffMessage())
                .humanHandoffClientMessage(c.getHumanHandoffClientMessage())
                .createdAt(c.getCreatedAt())
                .updatedAt(c.getUpdatedAt())
                .build();
    }

    @Transactional
    public GlobalNotificationConfig saveConfig(GlobalNotificationConfigRequest request) {
        Company company = companyRepository.findById(request.getCompanyId())
                .orElseThrow(() -> new RuntimeException("Company not found"));

        GlobalNotificationConfig config = repository.findByCompany(company)
                .orElse(GlobalNotificationConfig.builder().company(company).build());

        config.setHumanHandoffNotificationEnabled(request.getHumanHandoffNotificationEnabled());
        config.setHumanHandoffPhone(request.getHumanHandoffPhone());
        config.setHumanHandoffMessage(request.getHumanHandoffMessage());
        config.setHumanHandoffClientMessage(request.getHumanHandoffClientMessage());

        return repository.save(config);
    }
}
