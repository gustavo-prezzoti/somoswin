package com.backend.winai.service;

import com.backend.winai.dto.request.CreateTermsRequest;
import com.backend.winai.dto.response.TermsOfServiceResponse;
import com.backend.winai.dto.response.UserTermsAcceptanceResponse;
import com.backend.winai.entity.TermsOfService;
import com.backend.winai.entity.User;
import com.backend.winai.entity.UserTermsAcceptance;
import com.backend.winai.repository.TermsOfServiceRepository;
import com.backend.winai.repository.UserRepository;
import com.backend.winai.repository.UserTermsAcceptanceRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class TermsOfServiceService {

    private final TermsOfServiceRepository termsRepository;
    private final UserTermsAcceptanceRepository acceptanceRepository;
    private final UserRepository userRepository;

    public Optional<TermsOfServiceResponse> getActiveTerms() {
        return termsRepository.findByActiveTrue()
                .map(this::toResponse);
    }

    /**
     * Retorna os termos com os dados da empresa preenchidos
     */
    @Transactional(readOnly = true)
    public Optional<TermsOfServiceResponse> getPersonalizedTerms(UUID userId, String ipAddress) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("Usuário não encontrado"));

        return termsRepository.findByActiveTrue()
                .map(terms -> {
                    String content = terms.getContent();

                    // Substituir placeholders com dados da empresa
                    if (user.getCompany() != null) {
                        String contratante = user.getCompany().getContratante();
                        String documento = user.getCompany().getDocumento();
                        String emailContratante = user.getCompany().getEmailContratante();
                        com.backend.winai.entity.Plan plan = user.getCompany().getPlanEntity();

                        if (contratante != null && !contratante.isEmpty()) {
                            content = content.replace("[Nome/Razão Social]", contratante);
                        }
                        if (documento != null && !documento.isEmpty()) {
                            content = content.replace("[Documento]", documento);
                        }
                        if (emailContratante != null && !emailContratante.isEmpty()) {
                            content = content.replace("[E-mail]", emailContratante);
                        }

                        // Substituir placeholders do plano
                        if (plan != null) {
                            content = content.replace("Plano Contratado:",
                                    "Plano Contratado: " + plan.getDisplayName());
                            content = content.replace("Mensalidade:", "Mensalidade: R$ " +
                                    String.format("%,.2f", plan.getPrice()).replace(",", "X").replace(".", ",")
                                            .replace("X", "."));
                            content = content.replace("Taxa de Setup:", "Taxa de Setup: R$ " +
                                    String.format("%,.2f", plan.getSetupFee()).replace(",", "X").replace(".", ",")
                                            .replace("X", "."));
                            content = content.replace("Implementação:", "Implementação: 7-10 dias úteis");
                            content = content.replace("Vencimento:", "Vencimento: Todo dia 10");
                        }
                    }

                    // Substituir placeholders de aceite eletrônico
                    java.time.format.DateTimeFormatter formatter = java.time.format.DateTimeFormatter
                            .ofPattern("dd/MM/yyyy 'às' HH:mm:ss");
                    String dataAceite = java.time.ZonedDateTime.now(java.time.ZoneId.of("America/Sao_Paulo"))
                            .format(formatter);

                    content = content.replace("[Gerado automaticamente pela plataforma]", dataAceite);
                    content = content.replace("[Capturado automaticamente pela plataforma]",
                            ipAddress != null ? ipAddress : "N/A");

                    return TermsOfServiceResponse.builder()
                            .id(terms.getId())
                            .version(terms.getVersion())
                            .content(content)
                            .active(terms.getActive())
                            .createdAt(terms.getCreatedAt())
                            .build();
                });
    }

    public List<TermsOfServiceResponse> getAllTerms() {
        return termsRepository.findAll().stream()
                .map(this::toResponse)
                .sorted((a, b) -> b.getCreatedAt().compareTo(a.getCreatedAt()))
                .collect(Collectors.toList());
    }

    @Transactional
    public TermsOfServiceResponse createNewVersion(CreateTermsRequest request) {
        if (termsRepository.findByVersion(request.getVersion()).isPresent()) {
            throw new RuntimeException("Versão " + request.getVersion() + " já existe");
        }

        termsRepository.findByActiveTrue().ifPresent(existing -> {
            existing.setActive(false);
            termsRepository.save(existing);
        });

        TermsOfService newTerms = TermsOfService.builder()
                .version(request.getVersion())
                .content(request.getContent())
                .active(true)
                .build();

        newTerms = termsRepository.save(newTerms);
        log.info("Nova versão dos termos criada: {}", request.getVersion());

        return toResponse(newTerms);
    }

    public boolean hasUserAcceptedCurrentTerms(UUID userId) {
        return acceptanceRepository.hasUserAcceptedActiveTerms(userId);
    }

    @Transactional(readOnly = true)
    public Map<String, Object> getAcceptanceStatus(UUID userId) {
        Map<String, Object> response = new HashMap<>();

        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("Usuário não encontrado"));

        // Verificar se a empresa tem os campos obrigatórios preenchidos
        boolean hasRequiredFields = user.getCompany() != null
                && user.getCompany().hasRequiredContractFields();

        response.put("hasRequiredContractFields", hasRequiredFields);

        // Se não tem os campos obrigatórios, não pode aceitar os termos
        if (!hasRequiredFields) {
            response.put("hasAccepted", false);
            response.put("needsContractInfo", true);
            response.put("message",
                    "Por favor, entre em contato com o administrador para preencher os dados da empresa e configurar o plano contratado.");
            return response;
        }

        boolean hasAccepted = acceptanceRepository.hasUserAcceptedActiveTerms(userId);

        response.put("hasAccepted", hasAccepted);
        response.put("needsContractInfo", false);

        if (!hasAccepted) {
            termsRepository.findByActiveTrue().ifPresent(terms -> {
                response.put("termsId", terms.getId());
                response.put("version", terms.getVersion());
            });
        }

        // Verificar vigência da assinatura (apenas SUPER_ADMIN é isento)
        boolean isSuperAdmin = user.getRole() != null
                && user.getRole().name().equals("SUPER_ADMIN");

        if (!isSuperAdmin && user.getCompany() != null) {
            var company = user.getCompany();
            LocalDate endDate = company.getSubscriptionEndDate();
            boolean expired = endDate != null && endDate.isBefore(LocalDate.now());
            boolean noSubscription = company.getAsaasSubscriptionId() == null
                    || company.getAsaasSubscriptionId().isBlank();

            // Expirado OU sem assinatura ativa (e tem plano configurado)
            boolean blocked = expired || (noSubscription && company.getPlanEntity() != null
                    && !"ACTIVE".equals(company.getSubscriptionStatus()));

            response.put("subscriptionExpired", blocked);

            if (blocked) {
                response.put("subscriptionPlanName",
                        company.getPlanEntity() != null ? company.getPlanEntity().getDisplayName() : "Sem plano");
                response.put("subscriptionEndDate",
                        endDate != null ? endDate.toString() : null);
            }
        } else {
            response.put("subscriptionExpired", false);
        }

        return response;
    }

    @Transactional
    public void acceptTerms(UUID userId, String ipAddress, String userAgent) {
        TermsOfService activeTerms = termsRepository.findByActiveTrue()
                .orElseThrow(() -> new RuntimeException("Nenhum termo de serviço ativo encontrado"));

        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("Usuário não encontrado"));

        if (acceptanceRepository.findByUserIdAndTermsOfServiceId(userId, activeTerms.getId()).isPresent()) {
            log.info("Usuário {} já aceitou os termos versão {}", userId, activeTerms.getVersion());
            return;
        }

        UserTermsAcceptance acceptance = UserTermsAcceptance.builder()
                .user(user)
                .termsOfService(activeTerms)
                .ipAddress(ipAddress)
                .userAgent(userAgent != null && userAgent.length() > 500
                        ? userAgent.substring(0, 500)
                        : userAgent)
                .build();

        acceptanceRepository.save(acceptance);
        log.info("Usuário {} aceitou os termos versão {} - IP: {}",
                user.getEmail(), activeTerms.getVersion(), ipAddress);
    }

    public List<UserTermsAcceptanceResponse> getUsersAcceptanceStatus() {
        List<User> allUsers = userRepository.findAll();
        Optional<TermsOfService> activeTermsOpt = termsRepository.findByActiveTrue();

        if (activeTermsOpt.isEmpty()) {
            return allUsers.stream()
                    .map(u -> UserTermsAcceptanceResponse.builder()
                            .userId(u.getId())
                            .userName(u.getName())
                            .userEmail(u.getEmail())
                            .companyName(u.getCompany() != null ? u.getCompany().getName() : null)
                            .hasAccepted(false)
                            .termsVersion(null)
                            .acceptedAt(null)
                            .build())
                    .collect(Collectors.toList());
        }

        TermsOfService activeTerms = activeTermsOpt.get();
        Map<UUID, UserTermsAcceptance> acceptanceMap = acceptanceRepository
                .findByTermsOfServiceId(activeTerms.getId())
                .stream()
                .collect(Collectors.toMap(a -> a.getUser().getId(), a -> a));

        return allUsers.stream()
                .map(u -> {
                    UserTermsAcceptance acceptance = acceptanceMap.get(u.getId());
                    return UserTermsAcceptanceResponse.builder()
                            .userId(u.getId())
                            .userName(u.getName())
                            .userEmail(u.getEmail())
                            .companyName(u.getCompany() != null ? u.getCompany().getName() : null)
                            .hasAccepted(acceptance != null)
                            .termsVersion(acceptance != null ? activeTerms.getVersion() : null)
                            .acceptedAt(acceptance != null ? acceptance.getAcceptedAt() : null)
                            .build();
                })
                .sorted((a, b) -> {
                    if (a.getHasAccepted() != b.getHasAccepted()) {
                        return a.getHasAccepted() ? 1 : -1;
                    }
                    return a.getUserName().compareToIgnoreCase(b.getUserName());
                })
                .collect(Collectors.toList());
    }

    private TermsOfServiceResponse toResponse(TermsOfService terms) {
        return TermsOfServiceResponse.builder()
                .id(terms.getId())
                .version(terms.getVersion())
                .content(terms.getContent())
                .active(terms.getActive())
                .createdAt(terms.getCreatedAt())
                .build();
    }
}
