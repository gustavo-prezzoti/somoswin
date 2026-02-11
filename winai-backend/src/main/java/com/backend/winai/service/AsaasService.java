package com.backend.winai.service;

import com.backend.winai.dto.asaas.*;
import com.backend.winai.entity.Company;
import com.backend.winai.entity.Plan;
import com.backend.winai.repository.CompanyRepository;
import com.backend.winai.repository.PlanRepository;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.client.HttpClientErrorException;
import org.springframework.web.client.RestTemplate;

import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

@Service
@Slf4j
public class AsaasService {

    private final RestTemplate restTemplate;
    private final CompanyRepository companyRepository;
    private final PlanRepository planRepository;
    private final ObjectMapper objectMapper;

    @Value("${asaas.api.url:https://sandbox.asaas.com/api/v3}")
    private String asaasApiUrl;

    @Value("${asaas.api.token:}")
    private String asaasApiToken;

    public AsaasService(RestTemplate restTemplate,
                        CompanyRepository companyRepository,
                        PlanRepository planRepository,
                        ObjectMapper objectMapper) {
        this.restTemplate = restTemplate;
        this.companyRepository = companyRepository;
        this.planRepository = planRepository;
        this.objectMapper = objectMapper;
    }

    // ========== CLIENTES ==========

    /**
     * Cria ou recupera um cliente no Asaas para a empresa.
     */
    public String ensureCustomer(Company company) {
        if (company.getAsaasCustomerId() != null && !company.getAsaasCustomerId().isBlank()) {
            log.info("[ASAAS] Empresa {} já possui customer: {}", company.getName(), company.getAsaasCustomerId());
            return company.getAsaasCustomerId();
        }

        AsaasCustomerRequest request = AsaasCustomerRequest.builder()
                .name(company.getContratante() != null ? company.getContratante() : company.getName())
                .cpfCnpj(cleanDocument(company.getDocumento()))
                .email(company.getEmailContratante())
                .phone(company.getWhatsapp())
                .externalReference(company.getId().toString())
                .build();

        try {
            HttpEntity<AsaasCustomerRequest> entity = new HttpEntity<>(request, buildHeaders());
            ResponseEntity<AsaasCustomerResponse> response = restTemplate.exchange(
                    asaasApiUrl + "/customers",
                    HttpMethod.POST,
                    entity,
                    AsaasCustomerResponse.class);

            if (response.getBody() != null) {
                String customerId = response.getBody().getId();
                company.setAsaasCustomerId(customerId);
                companyRepository.save(company);
                log.info("[ASAAS] Cliente criado: {} para empresa {}", customerId, company.getName());
                return customerId;
            }
        } catch (HttpClientErrorException e) {
            log.error("[ASAAS] Erro ao criar cliente para {}: {} - {}", company.getName(), e.getStatusCode(), e.getResponseBodyAsString());
            throw new RuntimeException("Erro ao criar cliente no Asaas: " + e.getResponseBodyAsString());
        }

        throw new RuntimeException("Falha ao criar cliente no Asaas");
    }

    // ========== ASSINATURAS ==========

    /**
     * Cria uma assinatura no Asaas para a empresa com base no plano.
     */
    @Transactional
    public AsaasSubscriptionResponse createSubscription(UUID companyId, UUID planId) {
        Company company = companyRepository.findById(companyId)
                .orElseThrow(() -> new RuntimeException("Empresa não encontrada: " + companyId));

        Plan plan = planRepository.findById(planId)
                .orElseThrow(() -> new RuntimeException("Plano não encontrado: " + planId));

        // Garante que o cliente existe no Asaas
        String customerId = ensureCustomer(company);

        // Calcula próximo vencimento (dia 10 do próximo mês)
        LocalDate nextDueDate = LocalDate.now().plusMonths(1).withDayOfMonth(10);

        AsaasSubscriptionRequest request = AsaasSubscriptionRequest.builder()
                .customer(customerId)
                .billingType("UNDEFINED")
                .value(plan.getPrice().doubleValue())
                .nextDueDate(nextDueDate.format(DateTimeFormatter.ISO_LOCAL_DATE))
                .cycle("MONTHLY")
                .description("Win AI - Plano " + plan.getDisplayName())
                .externalReference(company.getId().toString())
                .build();

        try {
            HttpEntity<AsaasSubscriptionRequest> entity = new HttpEntity<>(request, buildHeaders());
            ResponseEntity<AsaasSubscriptionResponse> response = restTemplate.exchange(
                    asaasApiUrl + "/subscriptions",
                    HttpMethod.POST,
                    entity,
                    AsaasSubscriptionResponse.class);

            if (response.getBody() != null) {
                AsaasSubscriptionResponse sub = response.getBody();

                company.setAsaasSubscriptionId(sub.getId());
                company.setSubscriptionStatus("ACTIVE");
                company.setSubscriptionDueDate(nextDueDate);
                company.setPlanEntity(plan);
                company.setPlan(com.backend.winai.entity.UserPlan.valueOf(plan.getName()));
                // Definir vigência: início = hoje, fim = 1 ano a partir de hoje
                if (company.getSubscriptionStartDate() == null) {
                    company.setSubscriptionStartDate(LocalDate.now());
                }
                company.setSubscriptionEndDate(LocalDate.now().plusYears(1));
                companyRepository.save(company);

                log.info("[ASAAS] Assinatura criada: {} para empresa {} - Plano {}",
                        sub.getId(), company.getName(), plan.getDisplayName());
                return sub;
            }
        } catch (HttpClientErrorException e) {
            log.error("[ASAAS] Erro ao criar assinatura para {}: {} - {}",
                    company.getName(), e.getStatusCode(), e.getResponseBodyAsString());
            throw new RuntimeException("Erro ao criar assinatura no Asaas: " + e.getResponseBodyAsString());
        }

        throw new RuntimeException("Falha ao criar assinatura no Asaas");
    }

    /**
     * Cancela a assinatura no Asaas.
     */
    @Transactional
    public void cancelSubscription(UUID companyId) {
        Company company = companyRepository.findById(companyId)
                .orElseThrow(() -> new RuntimeException("Empresa não encontrada: " + companyId));

        if (company.getAsaasSubscriptionId() == null || company.getAsaasSubscriptionId().isBlank()) {
            log.warn("[ASAAS] Empresa {} não possui assinatura para cancelar", company.getName());
            return;
        }

        try {
            HttpEntity<Void> entity = new HttpEntity<>(buildHeaders());
            restTemplate.exchange(
                    asaasApiUrl + "/subscriptions/" + company.getAsaasSubscriptionId(),
                    HttpMethod.DELETE,
                    entity,
                    String.class);

            company.setSubscriptionStatus("CANCELLED");
            companyRepository.save(company);
            log.info("[ASAAS] Assinatura {} cancelada para empresa {}",
                    company.getAsaasSubscriptionId(), company.getName());
        } catch (HttpClientErrorException e) {
            log.error("[ASAAS] Erro ao cancelar assinatura {}: {} - {}",
                    company.getAsaasSubscriptionId(), e.getStatusCode(), e.getResponseBodyAsString());
            throw new RuntimeException("Erro ao cancelar assinatura: " + e.getResponseBodyAsString());
        }
    }

    /**
     * Atualiza a assinatura para um novo plano (upgrade/downgrade).
     */
    @Transactional
    public AsaasSubscriptionResponse updateSubscription(UUID companyId, UUID newPlanId) {
        Company company = companyRepository.findById(companyId)
                .orElseThrow(() -> new RuntimeException("Empresa não encontrada: " + companyId));

        Plan newPlan = planRepository.findById(newPlanId)
                .orElseThrow(() -> new RuntimeException("Plano não encontrado: " + newPlanId));

        if (company.getAsaasSubscriptionId() == null || company.getAsaasSubscriptionId().isBlank()) {
            log.info("[ASAAS] Empresa {} sem assinatura ativa, criando nova...", company.getName());
            return createSubscription(companyId, newPlanId);
        }

        try {
            Map<String, Object> updateBody = Map.of(
                    "value", newPlan.getPrice().doubleValue(),
                    "description", "Win AI - Plano " + newPlan.getDisplayName()
            );

            HttpEntity<Map<String, Object>> entity = new HttpEntity<>(updateBody, buildHeaders());
            ResponseEntity<AsaasSubscriptionResponse> response = restTemplate.exchange(
                    asaasApiUrl + "/subscriptions/" + company.getAsaasSubscriptionId(),
                    HttpMethod.PUT,
                    entity,
                    AsaasSubscriptionResponse.class);

            if (response.getBody() != null) {
                company.setPlanEntity(newPlan);
                company.setPlan(com.backend.winai.entity.UserPlan.valueOf(newPlan.getName()));
                companyRepository.save(company);

                log.info("[ASAAS] Assinatura {} atualizada para plano {} - Empresa {}",
                        company.getAsaasSubscriptionId(), newPlan.getDisplayName(), company.getName());
                return response.getBody();
            }
        } catch (HttpClientErrorException e) {
            log.error("[ASAAS] Erro ao atualizar assinatura {}: {} - {}",
                    company.getAsaasSubscriptionId(), e.getStatusCode(), e.getResponseBodyAsString());
            throw new RuntimeException("Erro ao atualizar assinatura: " + e.getResponseBodyAsString());
        }

        throw new RuntimeException("Falha ao atualizar assinatura no Asaas");
    }

    /**
     * Busca o link de pagamento da assinatura.
     */
    public String getPaymentLink(UUID companyId) {
        Company company = companyRepository.findById(companyId)
                .orElseThrow(() -> new RuntimeException("Empresa não encontrada: " + companyId));

        if (company.getAsaasSubscriptionId() == null) {
            throw new RuntimeException("Empresa não possui assinatura ativa");
        }

        try {
            HttpEntity<Void> entity = new HttpEntity<>(buildHeaders());
            ResponseEntity<Map> response = restTemplate.exchange(
                    asaasApiUrl + "/subscriptions/" + company.getAsaasSubscriptionId() + "/payments",
                    HttpMethod.GET,
                    entity,
                    Map.class);

            if (response.getBody() != null) {
                var data = response.getBody();
                var payments = (java.util.List<Map<String, Object>>) data.get("data");
                if (payments != null && !payments.isEmpty()) {
                    // Pega o pagamento mais recente pendente
                    for (Map<String, Object> payment : payments) {
                        if ("PENDING".equals(payment.get("status"))) {
                            return (String) payment.get("invoiceUrl");
                        }
                    }
                    // Se não tem pendente, retorna o último
                    return (String) payments.get(0).get("invoiceUrl");
                }
            }
        } catch (HttpClientErrorException e) {
            log.error("[ASAAS] Erro ao buscar link de pagamento: {} - {}", e.getStatusCode(), e.getResponseBodyAsString());
        }

        return null;
    }

    /**
     * Lista histórico de pagamentos da assinatura no Asaas.
     */
    @SuppressWarnings("unchecked")
    public java.util.List<Map<String, Object>> getPaymentHistory(UUID companyId) {
        Company company = companyRepository.findById(companyId)
                .orElseThrow(() -> new RuntimeException("Empresa não encontrada: " + companyId));

        if (company.getAsaasSubscriptionId() == null || company.getAsaasSubscriptionId().isBlank()) {
            return java.util.Collections.emptyList();
        }

        try {
            HttpEntity<Void> entity = new HttpEntity<>(buildHeaders());
            ResponseEntity<Map> response = restTemplate.exchange(
                    asaasApiUrl + "/subscriptions/" + company.getAsaasSubscriptionId() + "/payments",
                    HttpMethod.GET,
                    entity,
                    Map.class);

            if (response.getBody() != null) {
                var data = response.getBody();
                var payments = (java.util.List<Map<String, Object>>) data.get("data");
                if (payments != null) {
                    return payments.stream().map(p -> {
                        Map<String, Object> item = new java.util.LinkedHashMap<>();
                        item.put("id", p.get("id"));
                        item.put("status", p.get("status"));
                        item.put("value", p.get("value"));
                        item.put("netValue", p.get("netValue"));
                        item.put("dueDate", p.get("dueDate"));
                        item.put("paymentDate", p.get("paymentDate"));
                        item.put("confirmedDate", p.get("confirmedDate"));
                        item.put("billingType", p.get("billingType"));
                        item.put("invoiceUrl", p.get("invoiceUrl"));
                        item.put("bankSlipUrl", p.get("bankSlipUrl"));
                        item.put("invoiceNumber", p.get("invoiceNumber"));
                        item.put("description", p.get("description"));
                        return item;
                    }).collect(java.util.stream.Collectors.toList());
                }
            }
        } catch (HttpClientErrorException e) {
            log.error("[ASAAS] Erro ao buscar histórico de pagamentos: {} - {}", e.getStatusCode(), e.getResponseBodyAsString());
        }

        return java.util.Collections.emptyList();
    }

    /**
     * Retorna dados completos da assinatura para o painel do usuário.
     */
    public Map<String, Object> getSubscriptionDetails(UUID companyId) {
        Company company = companyRepository.findById(companyId)
                .orElseThrow(() -> new RuntimeException("Empresa não encontrada: " + companyId));

        Map<String, Object> details = new java.util.LinkedHashMap<>();
        details.put("companyId", company.getId());
        details.put("companyName", company.getName());
        details.put("subscriptionStatus", company.getSubscriptionStatus() != null ? company.getSubscriptionStatus() : "PENDING");
        details.put("subscriptionDueDate", company.getSubscriptionDueDate() != null ? company.getSubscriptionDueDate().toString() : null);
        details.put("asaasSubscriptionId", company.getAsaasSubscriptionId());
        details.put("asaasCustomerId", company.getAsaasCustomerId());
        details.put("subscriptionStartDate", company.getSubscriptionStartDate() != null ? company.getSubscriptionStartDate().toString() : null);
        details.put("subscriptionEndDate", company.getSubscriptionEndDate() != null ? company.getSubscriptionEndDate().toString() : null);

        // Plan info
        if (company.getPlanEntity() != null) {
            Plan plan = company.getPlanEntity();
            Map<String, Object> planInfo = new java.util.LinkedHashMap<>();
            planInfo.put("id", plan.getId());
            planInfo.put("name", plan.getName());
            planInfo.put("displayName", plan.getDisplayName());
            planInfo.put("price", plan.getPrice());
            planInfo.put("leadLimit", plan.getLeadLimit());
            planInfo.put("userLimit", plan.getUserLimit());
            planInfo.put("whatsappLimit", plan.getWhatsappLimit());
            planInfo.put("description", plan.getDescription());
            details.put("plan", planInfo);
        } else {
            details.put("plan", null);
        }

        return details;
    }

    // ========== WEBHOOK ==========

    /**
     * Processa webhook de pagamento do Asaas.
     */
    @Transactional
    public void processWebhook(AsaasWebhookPayload payload) {
        if (payload == null || payload.getPayment() == null) {
            log.warn("[ASAAS WEBHOOK] Payload vazio recebido");
            return;
        }

        String event = payload.getEvent();
        AsaasWebhookPayload.Payment payment = payload.getPayment();

        log.info("[ASAAS WEBHOOK] Evento: {} | Payment: {} | Status: {} | Subscription: {}",
                event, payment.getId(), payment.getStatus(), payment.getSubscription());

        if (payment.getSubscription() == null || payment.getSubscription().isBlank()) {
            log.debug("[ASAAS WEBHOOK] Pagamento sem assinatura, ignorando");
            return;
        }

        Optional<Company> companyOpt = companyRepository.findByAsaasSubscriptionId(payment.getSubscription());

        if (companyOpt.isEmpty()) {
            log.warn("[ASAAS WEBHOOK] Nenhuma empresa encontrada para assinatura: {}", payment.getSubscription());
            return;
        }

        Company company = companyOpt.get();

        switch (event) {
            case "PAYMENT_CONFIRMED":
            case "PAYMENT_RECEIVED":
                company.setSubscriptionStatus("ACTIVE");
                company.setStatus(com.backend.winai.entity.AccountStatus.ACTIVE);
                if (payment.getDueDate() != null) {
                    try {
                        company.setSubscriptionDueDate(LocalDate.parse(payment.getDueDate()));
                    } catch (Exception e) {
                        log.warn("[ASAAS WEBHOOK] Erro ao parsear dueDate: {}", payment.getDueDate());
                    }
                }
                log.info("[ASAAS WEBHOOK] Pagamento confirmado para empresa {}", company.getName());
                break;

            case "PAYMENT_OVERDUE":
                company.setSubscriptionStatus("OVERDUE");
                log.warn("[ASAAS WEBHOOK] Pagamento em atraso para empresa {}", company.getName());
                break;

            case "PAYMENT_DELETED":
            case "PAYMENT_REFUNDED":
                company.setSubscriptionStatus("CANCELLED");
                log.info("[ASAAS WEBHOOK] Pagamento cancelado/estornado para empresa {}", company.getName());
                break;

            case "PAYMENT_CREATED":
                log.info("[ASAAS WEBHOOK] Nova cobrança criada para empresa {}", company.getName());
                break;

            default:
                log.debug("[ASAAS WEBHOOK] Evento não tratado: {}", event);
                return;
        }

        companyRepository.save(company);
    }

    // ========== CONSULTAS ==========

    /**
     * Retorna status da assinatura de uma empresa.
     */
    public Map<String, Object> getSubscriptionStatus(UUID companyId) {
        Company company = companyRepository.findById(companyId)
                .orElseThrow(() -> new RuntimeException("Empresa não encontrada: " + companyId));

        return Map.of(
                "companyId", company.getId(),
                "companyName", company.getName(),
                "asaasCustomerId", company.getAsaasCustomerId() != null ? company.getAsaasCustomerId() : "",
                "asaasSubscriptionId", company.getAsaasSubscriptionId() != null ? company.getAsaasSubscriptionId() : "",
                "subscriptionStatus", company.getSubscriptionStatus() != null ? company.getSubscriptionStatus() : "PENDING",
                "subscriptionDueDate", company.getSubscriptionDueDate() != null ? company.getSubscriptionDueDate().toString() : "",
                "planName", company.getPlanEntity() != null ? company.getPlanEntity().getDisplayName() : company.getPlan().name(),
                "planPrice", company.getPlanEntity() != null ? company.getPlanEntity().getPrice() : 0
        );
    }

    // ========== HELPERS ==========

    private HttpHeaders buildHeaders() {
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        headers.set("access_token", asaasApiToken);
        return headers;
    }

    private String cleanDocument(String documento) {
        if (documento == null) return null;
        return documento.replaceAll("[^0-9]", "");
    }
}
