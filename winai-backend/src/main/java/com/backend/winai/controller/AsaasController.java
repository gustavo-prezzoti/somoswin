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
    public ResponseEntity<AsaasSubscriptionResponse> updateSubscription(
            @PathVariable UUID companyId,
            @RequestBody Map<String, String> request) {
        UUID newPlanId = UUID.fromString(request.get("planId"));

        AsaasSubscriptionResponse response = asaasService.updateSubscription(companyId, newPlanId);
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
