package com.backend.winai.service;

import com.backend.winai.entity.Company;
import com.backend.winai.entity.User;
import com.backend.winai.entity.UserRole;
import com.backend.winai.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.util.Optional;
import java.util.UUID;

/**
 * Responsável financeiro = primeiro usuário criado na empresa (quem registrou a conta ou base temporal).
 * Convites posteriores não pagam nem veem faturamento.
 */
@Service
@RequiredArgsConstructor
public class SubscriptionBillingService {

    private final UserRepository userRepository;

    public boolean isBillingOwner(User user) {
        if (user == null || user.getCompany() == null) {
            return false;
        }
        if (user.getRole() == UserRole.SUPER_ADMIN) {
            return true;
        }
        UUID companyId = user.getCompany().getId();
        Optional<User> first = userRepository.findFirstByCompany_IdOrderByCreatedAtAscIdAsc(companyId);
        return first.map(u -> u.getId().equals(user.getId())).orElse(false);
    }

    public boolean isCompanySubscriptionBlocked(Company company) {
        if (company == null) {
            return true;
        }
        LocalDate endDate = company.getSubscriptionEndDate();
        String subStatus = company.getSubscriptionStatus();
        String subId = company.getAsaasSubscriptionId();

        boolean expired = endDate != null && endDate.isBefore(LocalDate.now());
        boolean noActiveSubscription = subId == null || subId.isBlank();
        boolean statusNotActive = !"ACTIVE".equals(subStatus);

        return expired || (noActiveSubscription && statusNotActive);
    }
}
