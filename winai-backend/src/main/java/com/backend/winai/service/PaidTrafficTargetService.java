package com.backend.winai.service;

import com.backend.winai.dto.marketing.paidtraffic.PaidTrafficTargetDTO;
import com.backend.winai.entity.Company;
import com.backend.winai.entity.CompanyPaidTrafficTarget;
import com.backend.winai.entity.User;
import com.backend.winai.repository.CompanyPaidTrafficTargetRepository;
import com.backend.winai.repository.CompanyRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;

@Service
@RequiredArgsConstructor
public class PaidTrafficTargetService {

    private final CompanyPaidTrafficTargetRepository targetRepository;
    private final CompanyRepository companyRepository;

    public PaidTrafficTargetDTO getForMonth(User user, String yearMonth) {
        String ym = yearMonth != null && !yearMonth.isBlank()
                ? yearMonth
                : LocalDate.now().toString().substring(0, 7);
        return targetRepository.findByCompany_IdAndYearMonth(user.getCompany().getId(), ym)
                .map(this::toDto)
                .orElse(PaidTrafficTargetDTO.builder().yearMonth(ym).build());
    }

    @Transactional
    public PaidTrafficTargetDTO save(User user, PaidTrafficTargetDTO dto) {
        if (dto.getYearMonth() == null || dto.getYearMonth().isBlank()) {
            throw new IllegalArgumentException("yearMonth obrigatório (yyyy-MM)");
        }
        Company company = companyRepository.findById(user.getCompany().getId())
                .orElseThrow(() -> new IllegalArgumentException("Empresa não encontrada"));
        CompanyPaidTrafficTarget t = targetRepository
                .findByCompany_IdAndYearMonth(company.getId(), dto.getYearMonth())
                .orElse(CompanyPaidTrafficTarget.builder()
                        .company(company)
                        .yearMonth(dto.getYearMonth())
                        .build());
        t.setCompany(company);
        t.setYearMonth(dto.getYearMonth());
        t.setInvestmentGoal(dto.getInvestmentGoal());
        t.setRoasGoal(dto.getRoasGoal());
        t.setCplGoal(dto.getCplGoal());
        t.setCtrGoal(dto.getCtrGoal());
        targetRepository.save(t);
        return toDto(t);
    }

    private PaidTrafficTargetDTO toDto(CompanyPaidTrafficTarget t) {
        return PaidTrafficTargetDTO.builder()
                .yearMonth(t.getYearMonth())
                .investmentGoal(t.getInvestmentGoal())
                .roasGoal(t.getRoasGoal())
                .cplGoal(t.getCplGoal())
                .ctrGoal(t.getCtrGoal())
                .build();
    }
}
