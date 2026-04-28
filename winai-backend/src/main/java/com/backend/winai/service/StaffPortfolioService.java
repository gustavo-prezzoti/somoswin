package com.backend.winai.service;

import com.backend.winai.entity.Company;
import com.backend.winai.entity.CompanyStaffAssignment;
import com.backend.winai.entity.User;
import com.backend.winai.repository.CompanyIdNameProjection;
import com.backend.winai.repository.CompanyRepository;
import com.backend.winai.repository.CompanyStaffAssignmentRepository;
import com.backend.winai.repository.LeadRepository;
import com.backend.winai.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.UUID;

/**
 * Carteira explícita (company_staff_assignment) vs fallback por leads onde o colaborador é {@link com.backend.winai.entity.Lead#getOwnerUser()}.
 */
@Service
@RequiredArgsConstructor
public class StaffPortfolioService {

    private final CompanyStaffAssignmentRepository assignmentRepository;
    private final LeadRepository leadRepository;
    private final CompanyRepository companyRepository;
    private final UserRepository userRepository;

    /**
     * @param explicitAssignments true se há pelo menos uma linha em company_staff_assignment para o colaborador.
     *                            Quando true, métricas de CRM/playbook devem usar apenas {@link #assignedCompanyIds}.
     *                            Quando false, usar a lógica legada por owner em Lead / publisher em diagnóstico.
     */
    public record PortfolioResolution(boolean explicitAssignments, List<UUID> assignedCompanyIds) {}

    public PortfolioResolution resolve(UUID staffUserId) {
        List<UUID> assigned = assignmentRepository.findCompanyIdsByStaffUserId(staffUserId);
        return new PortfolioResolution(!assigned.isEmpty(), assigned);
    }

    /**
     * Empresas para escopo administrativo (finanças por carteira, alertas de metas, resumo de clientes): explícito OU empresas derivadas de leads como owner.
     */
    public List<UUID> scopeCompanyIdsForAggregations(UUID staffUserId) {
        PortfolioResolution r = resolve(staffUserId);
        if (r.explicitAssignments()) {
            return r.assignedCompanyIds();
        }
        return leadRepository.findDistinctCompanyIdsByOwnerUserId(staffUserId);
    }

    @Transactional
    public void replaceAssignments(UUID staffUserId, List<UUID> companyIds, UUID actorUserId) {
        User staff = userRepository.findById(staffUserId)
                .orElseThrow(() -> new RuntimeException("Usuário não encontrado"));
        if (!Boolean.TRUE.equals(staff.getAmpliaInternalStaff())) {
            throw new RuntimeException("Carteira disponível apenas para colaboradores internos");
        }
        User actor = actorUserId != null ? userRepository.findById(actorUserId).orElse(null) : null;

        assignmentRepository.deleteByStaffUser_Id(staffUserId);

        if (companyIds == null || companyIds.isEmpty()) {
            return;
        }

        Set<UUID> unique = new HashSet<>(companyIds);
        List<Company> companies = companyRepository.findAllById(unique);
        if (companies.size() != unique.size()) {
            throw new RuntimeException("Uma ou mais empresas não existem");
        }

        List<CompanyStaffAssignment> batch = new ArrayList<>(companies.size());
        for (Company c : companies) {
            batch.add(CompanyStaffAssignment.builder()
                    .company(c)
                    .staffUser(staff)
                    .createdByUser(actor)
                    .build());
        }
        assignmentRepository.saveAll(batch);
    }

    public List<CompanyIdNameProjection> listAssignmentOptions() {
        return companyRepository.findAllCompanyIdAndNameOrderedByName();
    }
}
