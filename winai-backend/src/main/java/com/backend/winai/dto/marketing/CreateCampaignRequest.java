package com.backend.winai.dto.marketing;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Request para criação de campanha no Meta Ads API.
 * Campos mapeados conforme documentação: https://developers.facebook.com/docs/marketing-api/get-started/basic-ad-creation/
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CreateCampaignRequest {

    /** Nome da campanha */
    private String name;

    /**
     * Objetivo da campanha (Meta API).
     * Valores: LINK_CLICKS, OUTCOME_LEADS, OUTCOME_SALES, OUTCOME_ENGAGEMENT, OUTCOME_AWARENESS
     */
    private String objective;

    /** Orçamento diário em reais (convertido para centavos na API) */
    private Double dailyBudget;

    /** Código do país (ex: BR, US) - usado em targeting.geo_locations.countries */
    private String countryCode;

    /** Idade mínima do público (18-65) */
    private Integer ageMin;

    /** Idade máxima do público (18-65) */
    private Integer ageMax;

    /** Interesses para targeting (opcional, formato flexível) */
    private String interests;

    /** Texto principal do anúncio (message em link_data) */
    private String adMessage;

    /** URL de destino (link em link_data) */
    private String destinationUrl;

    /**
     * URL da imagem do criativo.
     * Deve ser URL pública acessível. Meta fará fetch ou usará adimages com url=.
     */
    private String imageUrl;

    /** Título do link (caption em link_data, opcional) */
    private String headline;
}
