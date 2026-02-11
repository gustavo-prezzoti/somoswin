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
     * Cria uma assinatura recorrente no Asaas para a empresa com base no plano.
     * O Asaas gera cobranças automaticamente a cada ciclo (MONTHLY).
     * A primeira cobrança é gerada imediatamente (nextDueDate = hoje).
     */
    @Transactional
    public AsaasSubscriptionResponse createSubscription(UUID companyId, UUID planId) {
        Company company = companyRepository.findById(companyId)
                .orElseThrow(() -> new RuntimeException("Empresa não encontrada: " + companyId));

        Plan plan = planRepository.findById(planId)
                .orElseThrow(() -> new RuntimeException("Plano não encontrado: " + planId));

        // Garante que o cliente existe no Asaas
        String customerId = ensureCustomer(company);

        // Primeira cobrança: hoje. O Asaas gera as próximas automaticamente (mensal).
        LocalDate firstDueDate = LocalDate.now();

        AsaasSubscriptionRequest request = AsaasSubscriptionRequest.builder()
                .customer(customerId)
                .billingType("UNDEFINED")
                .value(plan.getPrice().doubleValue())
                .nextDueDate(firstDueDate.format(DateTimeFormatter.ISO_LOCAL_DATE))
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
                company.setSubscriptionStatus("PENDING");
                company.setSubscriptionDueDate(firstDueDate);
                company.setPlanEntity(plan);
                company.setPlan(com.backend.winai.entity.UserPlan.valueOf(plan.getName()));
                // Vigência: início = hoje, fim = hoje + 30 dias (será estendido ao confirmar pagamento)
                company.setSubscriptionStartDate(LocalDate.now());
                company.setSubscriptionEndDate(LocalDate.now().plusDays(30));
                companyRepository.save(company);

                log.info("[ASAAS] Assinatura recorrente criada: {} para empresa {} - Plano {} - Vencimento: {}",
                        sub.getId(), company.getName(), plan.getDisplayName(), firstDueDate);
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
     * Cancela a assinatura no Asaas e limpa todos os dados locais.
     */
    @Transactional
    public void cancelSubscription(UUID companyId) {
        Company company = companyRepository.findById(companyId)
                .orElseThrow(() -> new RuntimeException("Empresa não encontrada: " + companyId));

        if (company.getAsaasSubscriptionId() == null || company.getAsaasSubscriptionId().isBlank()) {
            log.warn("[ASAAS] Empresa {} não possui assinatura para cancelar", company.getName());
            return;
        }

        String oldSubscriptionId = company.getAsaasSubscriptionId();

        try {
            HttpEntity<Void> entity = new HttpEntity<>(buildHeaders());
            restTemplate.exchange(
                    asaasApiUrl + "/subscriptions/" + oldSubscriptionId,
                    HttpMethod.DELETE,
                    entity,
                    String.class);
        } catch (HttpClientErrorException e) {
            log.error("[ASAAS] Erro ao cancelar assinatura {}: {} - {}",
                    oldSubscriptionId, e.getStatusCode(), e.getResponseBodyAsString());
            throw new RuntimeException("Erro ao cancelar assinatura: " + e.getResponseBodyAsString());
        }

        // Limpa todos os dados de assinatura
        company.setAsaasSubscriptionId(null);
        company.setSubscriptionStatus("CANCELLED");
        company.setSubscriptionDueDate(null);
        company.setSubscriptionEndDate(null);
        companyRepository.save(company);

        log.info("[ASAAS] Assinatura {} cancelada e dados limpos para empresa {}",
                oldSubscriptionId, company.getName());
    }

    /**
     * Troca de plano: cancela a assinatura antiga no Asaas e cria uma nova
     * com o novo plano, gerando cobrança imediata.
     */
    @Transactional
    public AsaasSubscriptionResponse updateSubscription(UUID companyId, UUID newPlanId) {
        Company company = companyRepository.findById(companyId)
                .orElseThrow(() -> new RuntimeException("Empresa não encontrada: " + companyId));

        Plan newPlan = planRepository.findById(newPlanId)
                .orElseThrow(() -> new RuntimeException("Plano não encontrado: " + newPlanId));

        // Se já tem assinatura ativa, cancela no Asaas primeiro
        if (company.getAsaasSubscriptionId() != null && !company.getAsaasSubscriptionId().isBlank()) {
            String oldSubscriptionId = company.getAsaasSubscriptionId();
            try {
                HttpEntity<Void> entity = new HttpEntity<>(buildHeaders());
                restTemplate.exchange(
                        asaasApiUrl + "/subscriptions/" + oldSubscriptionId,
                        HttpMethod.DELETE,
                        entity,
                        String.class);
                log.info("[ASAAS] Assinatura antiga {} cancelada para troca de plano - Empresa {}",
                        oldSubscriptionId, company.getName());
            } catch (HttpClientErrorException e) {
                log.error("[ASAAS] Erro ao cancelar assinatura antiga {}: {} - {}",
                        oldSubscriptionId, e.getStatusCode(), e.getResponseBodyAsString());
                throw new RuntimeException("Erro ao cancelar assinatura antiga: " + e.getResponseBodyAsString());
            }

            // Limpa dados da assinatura antiga
            company.setAsaasSubscriptionId(null);
            company.setSubscriptionDueDate(null);
            companyRepository.save(company);
        }

        // Cria nova assinatura com o novo plano (gera cobrança imediata)
        log.info("[ASAAS] Criando nova assinatura para empresa {} - Plano {}",
                company.getName(), newPlan.getDisplayName());
        return createSubscription(companyId, newPlanId);
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
     * 
     * Lógica de vigência contínua:
     * - PAYMENT_CONFIRMED/RECEIVED: estende a vigência (dias restantes + 30 dias)
     * - PAYMENT_CREATED: atualiza o próximo vencimento
     * - PAYMENT_OVERDUE: marca como em atraso
     * - PAYMENT_DELETED/REFUNDED: marca como cancelado
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

                // Renovação contínua de vigência:
                // Se ainda tem dias restantes, soma os dias restantes + 30 dias
                // Se já venceu, começa de hoje + 30 dias
                LocalDate today = LocalDate.now();
                LocalDate currentEndDate = company.getSubscriptionEndDate();
                LocalDate newEndDate;

                if (currentEndDate != null && currentEndDate.isAfter(today)) {
                    // Ainda tem dias restantes - soma 30 dias ao endDate atual
                    newEndDate = currentEndDate.plusDays(30);
                    log.info("[ASAAS WEBHOOK] Vigência estendida: {} -> {} (dias restantes + 30)",
                            currentEndDate, newEndDate);
                } else {
                    // Já venceu ou nunca teve - começa de hoje + 30 dias
                    newEndDate = today.plusDays(30);
                    log.info("[ASAAS WEBHOOK] Vigência renovada a partir de hoje: {} -> {}",
                            today, newEndDate);
                }

                company.setSubscriptionEndDate(newEndDate);

                // Se não tinha startDate, define como hoje
                if (company.getSubscriptionStartDate() == null) {
                    company.setSubscriptionStartDate(today);
                }

                // Atualiza próximo vencimento com base no dueDate do pagamento
                if (payment.getDueDate() != null) {
                    try {
                        LocalDate paidDueDate = LocalDate.parse(payment.getDueDate());
                        // Próximo vencimento = dueDate do pagamento atual + 30 dias
                        company.setSubscriptionDueDate(paidDueDate.plusDays(30));
                    } catch (Exception e) {
                        log.warn("[ASAAS WEBHOOK] Erro ao parsear dueDate: {}", payment.getDueDate());
                    }
                }

                log.info("[ASAAS WEBHOOK] Pagamento confirmado para empresa {} | Vigência até: {}",
                        company.getName(), newEndDate);
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
                // Nova cobrança gerada pelo Asaas (recorrência automática)
                // Atualiza o próximo vencimento
                if (payment.getDueDate() != null) {
                    try {
                        company.setSubscriptionDueDate(LocalDate.parse(payment.getDueDate()));
                        log.info("[ASAAS WEBHOOK] Nova cobrança criada para empresa {} | Vencimento: {}",
                                company.getName(), payment.getDueDate());
                    } catch (Exception e) {
                        log.warn("[ASAAS WEBHOOK] Erro ao parsear dueDate: {}", payment.getDueDate());
                    }
                }
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
