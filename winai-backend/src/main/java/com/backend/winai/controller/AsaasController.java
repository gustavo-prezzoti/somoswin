package com.backend.winai.controller;

import com.backend.winai.dto.asaas.AsaasSubscriptionResponse;
import com.backend.winai.dto.asaas.AsaasWebhookPayload;
import com.backend.winai.entity.User;
import com.backend.winai.service.AsaasService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import com.backend.winai.entity.Plan;
import com.backend.winai.repository.PlanRepository;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/asaas")
@RequiredArgsConstructor
@Slf4j
@Tag(name = "Asaas", description = "Integração com gateway de pagamento Asaas")
public class AsaasController {

    private final AsaasService asaasService;
    private final PlanRepository planRepository;

    // ========== ADMIN ENDPOINTS (autenticados) ==========

    @Operation(summary = "Criar assinatura", description = "Cria uma assinatura no Asaas para a empresa com o plano informado")
    @PostMapping("/subscriptions")
    public ResponseEntity<AsaasSubscriptionResponse> createSubscription(
            @RequestBody Map<String, String> request) {
        UUID companyId = UUID.fromString(request.get("companyId"));
        UUID planId = UUID.fromString(request.get("planId"));

        AsaasSubscriptionResponse response = asaasService.createSubscription(companyId, planId);
        return ResponseEntity.ok(response);
    }

    @Operation(summary = "Atualizar assinatura", description = "Atualiza a assinatura para um novo plano (upgrade/downgrade)")
    @PutMapping("/subscriptions/{companyId}")
    public ResponseEntity<Map<String, Object>> updateSubscription(
            @PathVariable UUID companyId,
            @RequestBody Map<String, String> request) {
        UUID newPlanId = UUID.fromString(request.get("planId"));

        Map<String, Object> response = asaasService.updateSubscription(companyId, newPlanId);
        return ResponseEntity.ok(response);
    }

    @Operation(summary = "Cancelar assinatura", description = "Cancela a assinatura da empresa no Asaas")
    @DeleteMapping("/subscriptions/{companyId}")
    public ResponseEntity<Void> cancelSubscription(@PathVariable UUID companyId) {
        asaasService.cancelSubscription(companyId);
        return ResponseEntity.ok().build();
    }

    @Operation(summary = "Status da assinatura", description = "Retorna o status da assinatura de uma empresa")
    @GetMapping("/subscriptions/{companyId}/status")
    public ResponseEntity<Map<String, Object>> getSubscriptionStatus(@PathVariable UUID companyId) {
        return ResponseEntity.ok(asaasService.getSubscriptionStatus(companyId));
    }

    @Operation(summary = "Histórico de pagamentos", description = "Lista pagamentos da assinatura de uma empresa")
    @GetMapping("/subscriptions/{companyId}/payments")
    public ResponseEntity<List<Map<String, Object>>> getPaymentHistory(@PathVariable UUID companyId) {
        return ResponseEntity.ok(asaasService.getPaymentHistory(companyId));
    }

    @Operation(summary = "Link de pagamento", description = "Retorna o link de pagamento da assinatura")
    @GetMapping("/subscriptions/{companyId}/payment-link")
    public ResponseEntity<Map<String, String>> getPaymentLink(@PathVariable UUID companyId) {
        String link = asaasService.getPaymentLink(companyId);
        if (link != null) {
            return ResponseEntity.ok(Map.of("paymentLink", link));
        }
        return ResponseEntity.ok(Map.of("paymentLink", ""));
    }

    // ========== ENDPOINTS DO USUÁRIO LOGADO ==========

    @Operation(summary = "Minha assinatura", description = "Retorna detalhes da assinatura da empresa do usuário logado")
    @GetMapping("/my-subscription")
    public ResponseEntity<Map<String, Object>> getMySubscription(@AuthenticationPrincipal User user) {
        if (user.getCompany() == null) {
            return ResponseEntity.ok(Map.of("subscriptionStatus", "NO_COMPANY"));
        }
        return ResponseEntity.ok(asaasService.getSubscriptionDetails(user.getCompany().getId()));
    }

    @Operation(summary = "Meu histórico de pagamentos", description = "Lista pagamentos da assinatura da empresa do usuário logado")
    @GetMapping("/my-subscription/payments")
    public ResponseEntity<List<Map<String, Object>>> getMyPayments(@AuthenticationPrincipal User user) {
        if (user.getCompany() == null) {
            return ResponseEntity.ok(List.of());
        }
        return ResponseEntity.ok(asaasService.getPaymentHistory(user.getCompany().getId()));
    }

    @Operation(summary = "Meu link de pagamento", description = "Retorna o link de pagamento/fatura da assinatura do usuário logado")
    @GetMapping("/my-subscription/invoice")
    public ResponseEntity<Map<String, String>> getMyInvoice(@AuthenticationPrincipal User user) {
        if (user.getCompany() == null) {
            return ResponseEntity.ok(Map.of("invoiceUrl", ""));
        }
        String link = asaasService.getPaymentLink(user.getCompany().getId());
        return ResponseEntity.ok(Map.of("invoiceUrl", link != null ? link : ""));
    }

    @Operation(summary = "Listar planos", description = "Retorna todos os planos disponíveis para o usuário")
    @GetMapping("/plans")
    public ResponseEntity<List<Map<String, Object>>> getAvailablePlans() {
        List<Plan> plans = planRepository.findAll();
        List<Map<String, Object>> result = plans.stream()
                .filter(Plan::getActive)
                .map(plan -> {
                    Map<String, Object> map = new java.util.LinkedHashMap<>();
                    map.put("id", plan.getId());
                    map.put("name", plan.getName());
                    map.put("displayName", plan.getDisplayName());
                    map.put("price", plan.getPrice());
                    map.put("setupFee", plan.getSetupFee());
                    map.put("leadLimit", plan.getLeadLimit());
                    map.put("userLimit", plan.getUserLimit());
                    map.put("whatsappLimit", plan.getWhatsappLimit());
                    map.put("description", plan.getDescription());
                    return map;
                })
                .collect(java.util.stream.Collectors.toList());
        return ResponseEntity.ok(result);
    }

    @Operation(summary = "Preview troca de plano", description = "Calcula o desconto pro-rata para troca de plano")
    @PostMapping("/my-subscription/preview-change")
    public ResponseEntity<Map<String, Object>> previewPlanChange(
            @AuthenticationPrincipal User user,
            @RequestBody Map<String, String> request) {
        if (user.getCompany() == null) {
            return ResponseEntity.badRequest().body(Map.of("error", "Usuário sem empresa associada"));
        }
        String planIdStr = request.get("planId");
        if (planIdStr == null || planIdStr.isBlank()) {
            return ResponseEntity.badRequest().body(Map.of("error", "planId é obrigatório"));
        }
        return ResponseEntity.ok(asaasService.previewPlanChange(
                user.getCompany().getId(), UUID.fromString(planIdStr)));
    }

    @Operation(summary = "Trocar de plano", description = "Permite ao usuário logado trocar de plano (cancela assinatura antiga e cria nova com desconto pro-rata)")
    @PostMapping("/my-subscription/change-plan")
    public ResponseEntity<Map<String, Object>> changePlan(
            @AuthenticationPrincipal User user,
            @RequestBody Map<String, String> request) {
        if (user.getCompany() == null) {
            return ResponseEntity.badRequest().body(Map.of("error", "Usuário sem empresa associada"));
        }

        String planIdStr = request.get("planId");
        if (planIdStr == null || planIdStr.isBlank()) {
            return ResponseEntity.badRequest().body(Map.of("error", "planId é obrigatório"));
        }

        UUID companyId = user.getCompany().getId();
        UUID planId = UUID.fromString(planIdStr);

        try {
            Map<String, Object> result = asaasService.updateSubscription(companyId, planId);
            return ResponseEntity.ok(result);
        } catch (Exception e) {
            log.error("[ASAAS] Erro ao trocar plano para empresa {}: {}", companyId, e.getMessage());
            return ResponseEntity.internalServerError().body(Map.of(
                    "error", "Erro ao trocar de plano: " + e.getMessage()
            ));
        }
    }

    // ========== WEBHOOK (público, sem autenticação) ==========

    @Operation(summary = "Webhook Asaas", description = "Recebe notificações de pagamento do Asaas")
    @PostMapping("/webhook")
    public ResponseEntity<String> handleWebhook(@RequestBody AsaasWebhookPayload payload) {
        log.info("[ASAAS WEBHOOK] Recebido evento: {}", payload.getEvent());
        try {
            asaasService.processWebhook(payload);
            return ResponseEntity.ok("OK");
        } catch (Exception e) {
            log.error("[ASAAS WEBHOOK] Erro ao processar webhook: {}", e.getMessage(), e);
            return ResponseEntity.ok("OK");
        }
    }
}
