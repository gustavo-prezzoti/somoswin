package com.backend.winai.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Resposta do endpoint de status da sessão.
 * Fonte única de verdade no backend para decidir redirecionamento pós-login.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SessionStatusResponse {
    /**
     * Próxima ação obrigatória: MUST_CHANGE_PASSWORD, MUST_ACCEPT_TERMS,
     * NEEDS_CONTRACT_INFO, SUBSCRIPTION_EXPIRED, SUCCESS
     */
    private String nextAction;
}
