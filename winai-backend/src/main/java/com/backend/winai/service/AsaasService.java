package com.backend.winai.service;

import com.backend.winai.dto.asaas.*;
import com.backend.winai.util.ErrorHelper;
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

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.time.temporal.ChronoUnit;
import jakarta.annotation.PostConstruct;

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

    @Value("${asaas.api.url:https://api.asaas.com/v3}")
    private String asaasApiUrl;

    @Value("${asaas.api.token:}")
    private String asaasApiToken;

    @PostConstruct
    public void init() {
        if (asaasApiToken == null || asaasApiToken.isBlank()) {
            log.debug("[ASAAS] API token não configurado - integração de pagamentos desabilitada neste container");
        } else if (!asaasApiToken.startsWith("$")) {
            log.warn("[ASAAS] Token pode estar incorreto - tokens de produção começam com $. Verifique ASAAS_API_TOKEN no .env (use $$ para escapar no Docker)");
        } else {
            log.info("[ASAAS] Integração configurada - API: {}", asaasApiUrl);
        }
    }

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
     * Verifica se o customer existe na conta atual do Asaas (evita usar customer de outra conta).
     */
    private boolean customerExistsInCurrentAccount(String customerId) {
        try {
            HttpEntity<Void> entity = new HttpEntity<>(buildHeaders());
            restTemplate.exchange(
                    asaasApiUrl + "/customers/" + customerId,
                    HttpMethod.GET,
                    entity,
                    Map.class);
            return true;
        } catch (HttpClientErrorException e) {
            int status = e.getStatusCode().value();
            if (status == 404 || status == 403) {
                return false;
            }
            throw e;
        }
    }

    /**
     * Cria ou recupera um cliente no Asaas para a empresa.
     * Se o customer armazenado foi criado em outra conta Asaas, limpa e cria novo na conta atual.
     */
    public String ensureCustomer(Company company) {
        if (company.getAsaasCustomerId() != null && !company.getAsaasCustomerId().isBlank()) {
            if (customerExistsInCurrentAccount(company.getAsaasCustomerId())) {
                log.info("[ASAAS] Empresa {} já possui customer: {}", company.getName(), company.getAsaasCustomerId());
                return company.getAsaasCustomerId();
            }
            log.warn("[ASAAS] Customer {} não existe na conta atual (criado em outra conta). Criando novo para empresa {}",
                    company.getAsaasCustomerId(), company.getName());
            company.setAsaasCustomerId(null);
            company.setAsaasSubscriptionId(null);
            companyRepository.save(company);
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
            throw new RuntimeException(ErrorHelper.normalizeMessage(e.getResponseBodyAsString()));
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
                .billingType("PIX")
                .value(plan.getPrice().doubleValue())
                .nextDueDate(firstDueDate.format(DateTimeFormatter.ISO_LOCAL_DATE))
                .cycle("MONTHLY")
                .description("Amplia - Plano " + plan.getDisplayName())
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
                try {
                    company.setPlan(com.backend.winai.entity.UserPlan.valueOf(plan.getName()));
                } catch (IllegalArgumentException e) {
                    log.warn("[ASAAS] Plano '{}' não encontrado no enum UserPlan, mantendo plano atual", plan.getName());
                }
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
            throw new RuntimeException(ErrorHelper.normalizeMessage(e.getResponseBodyAsString()));
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
            throw new RuntimeException(ErrorHelper.normalizeMessage(e.getResponseBodyAsString()));
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
     * Calcula o crédito pro-rata baseado nos dias restantes de vigência.
     * Ex: plano atual R$497, faltam 15 de 30 dias = crédito de R$248,50
     */
    public BigDecimal calculateProRataCredit(Company company) {
        if (company.getSubscriptionEndDate() == null || company.getPlanEntity() == null) {
            return BigDecimal.ZERO;
        }

        LocalDate today = LocalDate.now();
        LocalDate endDate = company.getSubscriptionEndDate();

        if (!endDate.isAfter(today)) {
            return BigDecimal.ZERO; // Vigência já expirou
        }

        long remainingDays = ChronoUnit.DAYS.between(today, endDate);
        BigDecimal dailyRate = company.getPlanEntity().getPrice()
                .divide(BigDecimal.valueOf(30), 4, RoundingMode.HALF_UP);
        BigDecimal credit = dailyRate.multiply(BigDecimal.valueOf(remainingDays))
                .setScale(2, RoundingMode.HALF_UP);

        log.info("[ASAAS] Pro-rata: {} dias restantes x R${}/dia = crédito R${}",
                remainingDays, dailyRate, credit);
        return credit;
    }

    /**
     * Preview da troca de plano: retorna o cálculo do desconto pro-rata.
     */
    public Map<String, Object> previewPlanChange(UUID companyId, UUID newPlanId) {
        Company company = companyRepository.findById(companyId)
                .orElseThrow(() -> new RuntimeException("Empresa não encontrada: " + companyId));
        Plan newPlan = planRepository.findById(newPlanId)
                .orElseThrow(() -> new RuntimeException("Plano não encontrado: " + newPlanId));

        BigDecimal credit = calculateProRataCredit(company);
        BigDecimal newPlanPrice = newPlan.getPrice();
        BigDecimal firstPaymentValue = newPlanPrice.subtract(credit)
                .max(new BigDecimal("5.00"))
                .setScale(2, RoundingMode.HALF_UP);

        long remainingDays = 0;
        if (company.getSubscriptionEndDate() != null && company.getSubscriptionEndDate().isAfter(LocalDate.now())) {
            remainingDays = ChronoUnit.DAYS.between(LocalDate.now(), company.getSubscriptionEndDate());
        }

        Map<String, Object> preview = new java.util.LinkedHashMap<>();
        preview.put("currentPlanName", company.getPlanEntity() != null ? company.getPlanEntity().getDisplayName() : null);
        preview.put("currentPlanPrice", company.getPlanEntity() != null ? company.getPlanEntity().getPrice() : 0);
        preview.put("newPlanName", newPlan.getDisplayName());
        preview.put("newPlanPrice", newPlanPrice);
        preview.put("remainingDays", remainingDays);
        preview.put("proRataCredit", credit);
        preview.put("firstPaymentValue", firstPaymentValue);
        preview.put("nextPaymentsValue", newPlanPrice);
        return preview;
    }

    /**
     * Troca de plano: cria uma cobrança avulsa no Asaas com desconto pro-rata.
     * NÃO cancela a assinatura antiga nem cria nova imediatamente.
     * A troca efetiva só acontece quando o pagamento for confirmado via webhook.
     */
    @Transactional
    @SuppressWarnings("unchecked")
    public Map<String, Object> updateSubscription(UUID companyId, UUID newPlanId) {
        Company company = companyRepository.findById(companyId)
                .orElseThrow(() -> new RuntimeException("Empresa não encontrada: " + companyId));

        Plan newPlan = planRepository.findById(newPlanId)
                .orElseThrow(() -> new RuntimeException("Plano não encontrado: " + newPlanId));

        // Garante que o cliente existe no Asaas
        String customerId = ensureCustomer(company);

        // Calcula crédito pro-rata
        BigDecimal credit = calculateProRataCredit(company);
        BigDecimal planPrice = newPlan.getPrice() != null ? newPlan.getPrice() : BigDecimal.ZERO;

        if (planPrice.compareTo(BigDecimal.ZERO) <= 0) {
            throw new RuntimeException("O plano selecionado não possui preço configurado.");
        }

        BigDecimal chargeValue = planPrice.subtract(credit)
                .max(new BigDecimal("5.00"))
                .setScale(2, RoundingMode.HALF_UP);

        log.info("[ASAAS] Troca de plano - Preço: R${}, Crédito: R${}, Valor cobrança: R${}",
                planPrice, credit, chargeValue);

        // Cria cobrança avulsa no Asaas (não é assinatura, é um payment único)
        Map<String, Object> paymentBody = new java.util.LinkedHashMap<>();
        paymentBody.put("customer", customerId);
        paymentBody.put("billingType", "PIX");
        paymentBody.put("value", chargeValue.doubleValue());
        paymentBody.put("dueDate", LocalDate.now().format(DateTimeFormatter.ISO_LOCAL_DATE));
        paymentBody.put("description", String.format(
                "Amplia - Upgrade para Plano %s%s",
                newPlan.getDisplayName(),
                credit.compareTo(BigDecimal.ZERO) > 0
                        ? String.format(" (crédito pro-rata R$ %s)", credit.setScale(2, RoundingMode.HALF_UP))
                        : ""));
        paymentBody.put("externalReference", "PLAN_CHANGE:" + company.getId() + ":" + newPlanId);

        try {
            HttpEntity<Map<String, Object>> entity = new HttpEntity<>(paymentBody, buildHeaders());
            ResponseEntity<Map> response = restTemplate.exchange(
                    asaasApiUrl + "/payments",
                    HttpMethod.POST,
                    entity,
                    Map.class);

            if (response.getBody() != null) {
                String paymentId = (String) response.getBody().get("id");
                String invoiceUrl = (String) response.getBody().get("invoiceUrl");

                // Salva o plano pendente e o ID do pagamento na empresa
                company.setPendingPlan(newPlan);
                company.setPendingPlanPaymentId(paymentId);
                companyRepository.save(company);

                log.info("[ASAAS] Cobrança avulsa criada para troca de plano: {} | Valor: R${} | Empresa: {} | Plano: {}",
                        paymentId, chargeValue, company.getName(), newPlan.getDisplayName());

                Map<String, Object> result = new java.util.LinkedHashMap<>();
                result.put("success", true);
                result.put("paymentId", paymentId);
                result.put("invoiceUrl", invoiceUrl);
                result.put("chargeValue", chargeValue);
                result.put("proRataCredit", credit);
                result.put("message", "Cobrança gerada. Efetue o pagamento para ativar o novo plano.");
                return result;
            }
        } catch (HttpClientErrorException e) {
            String body = e.getResponseBodyAsString();
            if (e.getStatusCode().value() == 401) {
                log.error("[ASAAS] 401 UNAUTHORIZED - Token length: {} | Response: {} | Verifique: 1) .env com ASAAS_API_TOKEN=$$aact_prod_... 2) docker compose up -d --force-recreate backend 3) Chave válida em Integrações > Chave de API no Asaas",
                        asaasApiToken != null ? asaasApiToken.length() : 0, body);
            } else {
                log.error("[ASAAS] Erro ao criar cobrança avulsa para troca de plano: {} - {}", e.getStatusCode(), body);
            }
            throw new RuntimeException(ErrorHelper.normalizeMessage(body));
        }

        throw new RuntimeException("Falha ao criar cobrança para troca de plano");
    }

    /**
     * Troca de plano direta (admin) - sem pagamento.
     * Seta o plano pendente, salva e executa a troca imediatamente.
     */
    @Transactional
    public void adminChangePlan(UUID companyId, UUID newPlanId) {
        Company company = companyRepository.findById(companyId)
                .orElseThrow(() -> new RuntimeException("Empresa não encontrada: " + companyId));
        Plan newPlan = planRepository.findById(newPlanId)
                .orElseThrow(() -> new RuntimeException("Plano não encontrado: " + newPlanId));

        company.setPendingPlan(newPlan);
        companyRepository.save(company);
        executePlanChange(company);
    }

    /**
     * Processa a troca efetiva de plano após confirmação de pagamento.
     * Cancela a assinatura antiga e cria uma nova com o novo plano.
     */
    @Transactional
    public void executePlanChange(Company company) {
        Plan newPlan = company.getPendingPlan();
        if (newPlan == null) {
            log.warn("[ASAAS] Empresa {} não tem plano pendente para trocar", company.getName());
            return;
        }

        UUID companyId = company.getId();
        UUID newPlanId = newPlan.getId();

        log.info("[ASAAS] Executando troca de plano para empresa {} -> Plano {}",
                company.getName(), newPlan.getDisplayName());

        // Cancela assinatura antiga no Asaas
        if (company.getAsaasSubscriptionId() != null && !company.getAsaasSubscriptionId().isBlank()) {
            String oldSubscriptionId = company.getAsaasSubscriptionId();
            try {
                HttpEntity<Void> entity = new HttpEntity<>(buildHeaders());
                restTemplate.exchange(
                        asaasApiUrl + "/subscriptions/" + oldSubscriptionId,
                        HttpMethod.DELETE,
                        entity,
                        String.class);
                log.info("[ASAAS] Assinatura antiga {} cancelada - Empresa {}",
                        oldSubscriptionId, company.getName());
            } catch (HttpClientErrorException e) {
                log.error("[ASAAS] Erro ao cancelar assinatura antiga {}: {}",
                        oldSubscriptionId, e.getResponseBodyAsString());
            }

            company.setAsaasSubscriptionId(null);
            company.setSubscriptionDueDate(null);
            companyRepository.save(company);
        }

        // Cria nova assinatura recorrente com o novo plano
        try {
            createSubscription(companyId, newPlanId);

            // Limpa dados pendentes
            Company updated = companyRepository.findById(companyId).orElse(company);
            updated.setPendingPlan(null);
            updated.setPendingPlanPaymentId(null);
            companyRepository.save(updated);

            log.info("[ASAAS] Troca de plano concluída para empresa {} - Novo plano: {}",
                    company.getName(), newPlan.getDisplayName());
        } catch (Exception e) {
            log.error("[ASAAS] Erro ao criar nova assinatura para empresa {} - Plano {}: {}",
                    company.getName(), newPlan.getDisplayName(), e.getMessage());
            // Limpa pendência mesmo com erro para não ficar em estado inconsistente
            Company updated = companyRepository.findById(companyId).orElse(company);
            updated.setPendingPlan(null);
            updated.setPendingPlanPaymentId(null);
            updated.setSubscriptionStatus("ERROR");
            companyRepository.save(updated);
            throw e;
        }
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
     * Lista histórico de pagamentos no Asaas (assinatura + cobranças avulsas de troca de plano).
     * Retorna resultado paginado com totalCount, page, limit e data.
     */
    @SuppressWarnings("unchecked")
    public Map<String, Object> getPaymentHistory(UUID companyId, int page, int limit) {
        Company company = companyRepository.findById(companyId)
                .orElseThrow(() -> new RuntimeException("Empresa não encontrada: " + companyId));

        // Usa Map com id como chave para deduplicar pagamentos que aparecem em ambas as consultas
        java.util.LinkedHashMap<String, Map<String, Object>> paymentMap = new java.util.LinkedHashMap<>();

        // 1) Cobranças do customer (inclui TUDO: assinatura + avulsas), ordenado por mais recente
        if (company.getAsaasCustomerId() != null && !company.getAsaasCustomerId().isBlank()) {
            try {
                HttpEntity<Void> entity = new HttpEntity<>(buildHeaders());
                ResponseEntity<Map> response = restTemplate.exchange(
                        asaasApiUrl + "/payments?customer=" + company.getAsaasCustomerId()
                                + "&limit=50&order=desc&orderBy=dateCreated",
                        HttpMethod.GET, entity, Map.class);

                if (response.getBody() != null) {
                    var payments = (java.util.List<Map<String, Object>>) response.getBody().get("data");
                    if (payments != null) {
                        for (Map<String, Object> p : payments) {
                            String id = (String) p.get("id");
                            String extRef = (String) p.get("externalReference");
                            String type = (extRef != null && extRef.startsWith("PLAN_CHANGE:")) ? "PLAN_CHANGE" : "SUBSCRIPTION";
                            paymentMap.put(id, mapPayment(p, type));
                        }
                    }
                }
            } catch (HttpClientErrorException e) {
                log.error("[ASAAS] Erro ao buscar pagamentos do customer: {} - {}",
                        e.getStatusCode(), e.getResponseBodyAsString());
            }
        }

        // A API já retorna ordenado por dateCreated desc, então a ordem do LinkedHashMap está correta
        java.util.List<Map<String, Object>> allPayments = new java.util.ArrayList<>(paymentMap.values());

        // Paginação
        int totalCount = allPayments.size();
        int offset = page * limit;
        java.util.List<Map<String, Object>> pageData = allPayments.stream()
                .skip(offset)
                .limit(limit)
                .collect(java.util.stream.Collectors.toList());

        Map<String, Object> result = new java.util.LinkedHashMap<>();
        result.put("data", pageData);
        result.put("totalCount", totalCount);
        result.put("page", page);
        result.put("limit", limit);
        result.put("totalPages", (int) Math.ceil((double) totalCount / limit));
        return result;
    }

    private Map<String, Object> mapPayment(Map<String, Object> p, String type) {
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
        item.put("dateCreated", p.get("dateCreated"));
        item.put("type", type);
        return item;
    }

    /**
     * Retorna dados completos da assinatura para o painel do usuário.
     */
    @Transactional(readOnly = true)
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

        // Pending plan change info
        if (company.getPendingPlan() != null) {
            Plan pending = company.getPendingPlan();
            Map<String, Object> pendingInfo = new java.util.LinkedHashMap<>();
            pendingInfo.put("id", pending.getId());
            pendingInfo.put("name", pending.getName());
            pendingInfo.put("displayName", pending.getDisplayName());
            pendingInfo.put("price", pending.getPrice());
            pendingInfo.put("paymentId", company.getPendingPlanPaymentId());
            details.put("pendingPlan", pendingInfo);
        } else {
            details.put("pendingPlan", null);
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

        // 1) Verifica se é um pagamento de troca de plano (cobrança avulsa)
        Optional<Company> planChangeCompany = companyRepository.findByPendingPlanPaymentId(payment.getId());
        if (planChangeCompany.isPresent()) {
            processPlanChangeWebhook(event, planChangeCompany.get(), payment);
            return;
        }

        // 1b) Fallback: verifica pelo externalReference (caso pendingPlanPaymentId tenha sido sobrescrito)
        String extRef = payment.getExternalReference();
        if (extRef != null && extRef.startsWith("PLAN_CHANGE:")) {
            try {
                String[] parts = extRef.split(":");
                UUID companyId = UUID.fromString(parts[1]);
                Optional<Company> fallbackCompany = companyRepository.findById(companyId);
                if (fallbackCompany.isPresent()) {
                    log.info("[ASAAS WEBHOOK] Troca de plano detectada via externalReference: {} | Payment: {}",
                            extRef, payment.getId());
                    processPlanChangeWebhook(event, fallbackCompany.get(), payment);
                    return;
                }
            } catch (Exception e) {
                log.warn("[ASAAS WEBHOOK] Erro ao parsear externalReference: {}", extRef, e);
            }
        }

        // 2) Fluxo normal: pagamento de assinatura recorrente
        if (payment.getSubscription() == null || payment.getSubscription().isBlank()) {
            log.debug("[ASAAS WEBHOOK] Pagamento sem assinatura e sem troca de plano, ignorando: {}", payment.getId());
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
            case "PAYMENT_RECEIVED_IN_CASH":
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

    /**
     * Processa webhook de pagamento de troca de plano (cobrança avulsa).
     * Quando o pagamento é confirmado, executa a troca efetiva de plano.
     */
    private void processPlanChangeWebhook(String event, Company company, AsaasWebhookPayload.Payment payment) {
        log.info("[ASAAS WEBHOOK] Pagamento de troca de plano | Evento: {} | Empresa: {} | Payment: {}",
                event, company.getName(), payment.getId());

        switch (event) {
            case "PAYMENT_CONFIRMED":
            case "PAYMENT_RECEIVED":
            case "PAYMENT_RECEIVED_IN_CASH":
                // Extrai o planId do externalReference para garantir que o plano correto é usado
                // (o pendingPlan pode ter sido sobrescrito por outra troca)
                String extRef = payment.getExternalReference();
                if (extRef != null && extRef.startsWith("PLAN_CHANGE:")) {
                    try {
                        String[] parts = extRef.split(":");
                        UUID targetPlanId = UUID.fromString(parts[2]);
                        Plan targetPlan = planRepository.findById(targetPlanId).orElse(null);
                        if (targetPlan != null) {
                            company.setPendingPlan(targetPlan);
                            company.setPendingPlanPaymentId(payment.getId());
                            companyRepository.save(company);
                        }
                    } catch (Exception e) {
                        log.warn("[ASAAS WEBHOOK] Erro ao extrair planId do externalReference: {}", extRef, e);
                    }
                }

                log.info("[ASAAS WEBHOOK] Pagamento de troca de plano CONFIRMADO para empresa {} - Executando troca...",
                        company.getName());
                executePlanChange(company);
                break;

            case "PAYMENT_OVERDUE":
                log.warn("[ASAAS WEBHOOK] Pagamento de troca de plano em ATRASO para empresa {}", company.getName());
                break;

            case "PAYMENT_DELETED":
            case "PAYMENT_REFUNDED":
                // Pagamento cancelado/estornado - limpa dados pendentes
                company.setPendingPlan(null);
                company.setPendingPlanPaymentId(null);
                companyRepository.save(company);
                log.info("[ASAAS WEBHOOK] Pagamento de troca de plano CANCELADO para empresa {} - Pendência removida",
                        company.getName());
                break;

            default:
                log.debug("[ASAAS WEBHOOK] Evento de troca de plano não tratado: {}", event);
                break;
        }
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

    /**
     * Retorna a empresa pelo ID (usado pelo controller admin).
     */
    public Company getCompanyById(UUID companyId) {
        return companyRepository.findById(companyId)
                .orElseThrow(() -> new RuntimeException("Empresa não encontrada: " + companyId));
    }

    // ========== HELPERS ==========

    private HttpHeaders buildHeaders() {
        if (asaasApiToken == null || asaasApiToken.isBlank()) {
            throw new IllegalStateException("ASAAS_API_TOKEN não configurado. Verifique o .env na raiz do projeto (use $$ para escapar o $ no token) e reinicie: docker compose up -d --force-recreate backend");
        }
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        headers.set("access_token", asaasApiToken);
        headers.set("User-Agent", "Amplia/1.0");
        return headers;
    }

    private String cleanDocument(String documento) {
        if (documento == null) return null;
        return documento.replaceAll("[^0-9]", "");
    }
}
