package com.backend.winai.service;

import com.backend.winai.dto.request.CreateAccessInvitationRequest;
import com.backend.winai.dto.request.UpdateCompanyProfileRequest;
import com.backend.winai.dto.response.AccessInvitationListItemResponse;
import com.backend.winai.dto.response.CompanyMemberResponse;
import com.backend.winai.dto.response.CompanyProfileResponse;
import com.backend.winai.entity.*;
import com.backend.winai.repository.AccessInvitationRepository;
import com.backend.winai.repository.CompanyRepository;
import com.backend.winai.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.ZonedDateTime;
import java.util.Collections;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class CompanyTeamService {

    private static final int INVITE_EXPIRY_DAYS = 7;

    private final CompanyRepository companyRepository;
    private final UserRepository userRepository;
    private final AccessInvitationRepository accessInvitationRepository;
    private final EmailService emailService;

    public CompanyProfileResponse getCompanyProfile(User user) {
        Company company = requireCompany(user);
        return mapCompanyProfile(company);
    }

    @Transactional
    public CompanyProfileResponse updateCompanyProfile(User user, UpdateCompanyProfileRequest request) {
        if (user.getRole() != UserRole.ADMIN) {
            throw new RuntimeException("Apenas administradores podem editar os dados da empresa");
        }
        Company company = requireCompany(user);
        if (request.getSegment() != null) {
            company.setSegment(request.getSegment());
        }
        if (request.getWebsite() != null) {
            company.setWebsite(request.getWebsite());
        }
        if (request.getInstagramHandle() != null) {
            company.setInstagramHandle(request.getInstagramHandle());
        }
        if (request.getRevenueRange() != null) {
            company.setRevenueRange(request.getRevenueRange());
        }
        if (request.getTeamSize() != null) {
            company.setTeamSize(request.getTeamSize());
        }
        if (request.getCityState() != null) {
            company.setCityState(request.getCityState());
        }
        company = companyRepository.save(company);
        return mapCompanyProfile(company);
    }

    public List<CompanyMemberResponse> listMembers(User user) {
        Company company = requireCompany(user);
        return userRepository.findByCompanyId(company.getId()).stream()
                .map(u -> CompanyMemberResponse.builder()
                        .id(u.getId())
                        .email(u.getEmail())
                        .name(u.getName())
                        .role(u.getRole().name())
                        .jobTitle(u.getJobTitle())
                        .isActive(u.getIsActive())
                        .avatarUrl(u.getAvatarUrl())
                        .build())
                .collect(Collectors.toList());
    }

    public List<AccessInvitationListItemResponse> listPendingInvitations(User user) {
        if (user.getRole() != UserRole.ADMIN) {
            return Collections.emptyList();
        }
        Company company = requireCompany(user);
        return accessInvitationRepository
                .findByCompany_IdAndStatusOrderByCreatedAtDesc(company.getId(), InvitationStatus.PENDING)
                .stream()
                .map(this::mapInvitation)
                .collect(Collectors.toList());
    }

    @Transactional
    public AccessInvitationListItemResponse createInvitation(User admin, CreateAccessInvitationRequest request) {
        if (admin.getRole() != UserRole.ADMIN) {
            throw new RuntimeException("Apenas administradores podem convidar membros");
        }
        Company company = companyRepository.findByIdWithPlan(requireCompany(admin).getId())
                .orElseThrow(() -> new RuntimeException("Empresa não encontrada"));

        if (request.getRole() != UserRole.USER && request.getRole() != UserRole.ADMIN) {
            throw new RuntimeException("Nível de permissão inválido para convite");
        }

        String emailNorm = normalizeEmail(request.getEmail());
        if (userRepository.findByEmail(emailNorm).isPresent()) {
            throw new RuntimeException("Já existe um usuário cadastrado com este e-mail");
        }

        enforceUserLimit(company);

        String token = generateInviteToken();
        AccessInvitation inv = AccessInvitation.builder()
                .company(company)
                .email(emailNorm)
                .invitedName(request.getInvitedName())
                .jobTitle(request.getJobTitle())
                .role(request.getRole())
                .token(token)
                .status(InvitationStatus.PENDING)
                .invitedBy(admin)
                .expiresAt(ZonedDateTime.now().plusDays(INVITE_EXPIRY_DAYS))
                .build();

        inv = accessInvitationRepository.save(inv);

        emailService.sendAccessInvitation(emailNorm, company.getName(), token);

        return mapInvitation(inv);
    }

    @Transactional
    public void revokeInvitation(User admin, UUID invitationId) {
        if (admin.getRole() != UserRole.ADMIN) {
            throw new RuntimeException("Apenas administradores podem revogar convites");
        }
        Company company = requireCompany(admin);
        AccessInvitation inv = accessInvitationRepository.findById(invitationId)
                .orElseThrow(() -> new RuntimeException("Convite não encontrado"));
        if (!inv.getCompany().getId().equals(company.getId())) {
            throw new RuntimeException("Convite não pertence à sua empresa");
        }
        if (inv.getStatus() != InvitationStatus.PENDING) {
            throw new RuntimeException("Apenas convites pendentes podem ser revogados");
        }
        inv.setStatus(InvitationStatus.REVOKED);
        accessInvitationRepository.save(inv);
    }

    private void enforceUserLimit(Company company) {
        Integer limit = company.getPlanEntity() != null ? company.getPlanEntity().getUserLimit() : null;
        if (limit == null) {
            return;
        }
        long users = userRepository.countByCompany_Id(company.getId());
        long pending = accessInvitationRepository.countByCompany_IdAndStatus(company.getId(),
                InvitationStatus.PENDING);
        if (users + pending >= limit) {
            throw new RuntimeException("Limite de usuários do plano atingido. Revogue um convite pendente ou faça upgrade.");
        }
    }

    private Company requireCompany(User user) {
        if (user.getCompany() == null) {
            throw new RuntimeException("Sem empresa associada à conta");
        }
        return user.getCompany();
    }

    private CompanyProfileResponse mapCompanyProfile(Company c) {
        return CompanyProfileResponse.builder()
                .id(c.getId())
                .name(c.getName())
                .segment(c.getSegment())
                .website(c.getWebsite())
                .instagramHandle(c.getInstagramHandle())
                .revenueRange(c.getRevenueRange())
                .teamSize(c.getTeamSize())
                .cityState(c.getCityState())
                .whatsapp(c.getWhatsapp())
                .leadVolume(c.getLeadVolume())
                .build();
    }

    private AccessInvitationListItemResponse mapInvitation(AccessInvitation inv) {
        return AccessInvitationListItemResponse.builder()
                .id(inv.getId())
                .email(inv.getEmail())
                .invitedName(inv.getInvitedName())
                .jobTitle(inv.getJobTitle())
                .role(inv.getRole().name())
                .status(inv.getStatus().name())
                .createdAt(inv.getCreatedAt())
                .expiresAt(inv.getExpiresAt())
                .build();
    }

    private static String normalizeEmail(String email) {
        return email == null ? "" : email.trim().toLowerCase();
    }

    private static String generateInviteToken() {
        return UUID.randomUUID().toString().replace("-", "")
                + UUID.randomUUID().toString().replace("-", "").substring(0, 32);
    }
}
