package com.backend.winai.service;

import com.backend.winai.dto.request.GlobalNotificationConfigRequest;
import com.backend.winai.entity.Company;
import com.backend.winai.entity.GlobalNotificationConfig;
import com.backend.winai.repository.CompanyRepository;
import com.backend.winai.repository.GlobalNotificationConfigRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class GlobalNotificationService {

    private final GlobalNotificationConfigRepository repository;
    private final CompanyRepository companyRepository;

    @Transactional(readOnly = true)
    public GlobalNotificationConfig getConfig(UUID companyId) {
        return repository.findByCompanyId(companyId).orElse(null);
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
