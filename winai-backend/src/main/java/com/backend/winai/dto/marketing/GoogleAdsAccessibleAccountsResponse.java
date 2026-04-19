package com.backend.winai.dto.marketing;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

/**
 * Resposta de {@code GET /google-ads/accessible-accounts}.
 *
 * <p>Em falhas técnicas da API Google Ads, o usuário recebe apenas
 * {@link Status#MAINTENANCE} e mensagem genérica; detalhes ficam em log no servidor.</p>
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class GoogleAdsAccessibleAccountsResponse {
    /** Códigos para a UI; evite expor motivos técnicos ao usuário final. */
    public enum Status {
        /** Lista obtida com sucesso (pode estar vazia). */
        OK,
        /** OAuth não conectado ou sem refresh token. */
        NOT_CONNECTED,
        /** Qualquer falha técnica (403, token, quota, etc.): mensagem genérica ao usuário. */
        MAINTENANCE
    }

    private List<GoogleAdsAccessibleAccountDTO> accounts;
    private Status status;
    /** Texto seguro para o usuário final (sem stack, URL ou corpo de erro da API). */
    private String message;
}
