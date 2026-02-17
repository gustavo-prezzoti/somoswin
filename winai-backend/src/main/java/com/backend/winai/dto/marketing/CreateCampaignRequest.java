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
     * Valores: OUTCOME_TRAFFIC, OUTCOME_LEADS, OUTCOME_SALES, OUTCOME_ENGAGEMENT, OUTCOME_AWARENESS, OUTCOME_APP_PROMOTION
     */
    private String objective;

    /**
     * Tipo de orçamento: DAILY (diário) ou LIFETIME (total).
     */
    private String budgetType;

    /** Orçamento diário em reais (quando budgetType=DAILY) */
    private Double dailyBudget;

    /** Orçamento total em reais (quando budgetType=LIFETIME) */
    private Double lifetimeBudget;

    /** Data de início (ISO 8601, ex: 2025-02-17) - opcional para ad set */
    private String startDate;

    /** Data de fim (ISO 8601) - opcional, usado com lifetime budget */
    private String endDate;

    /** Código do país (ex: BR, US) */
    private String countryCode;

    /** Idade mínima do público (18-65) */
    private Integer ageMin;

    /** Idade máxima do público (18-65) */
    private Integer ageMax;

    /**
     * Gênero do público: null/"" = todos, "1" = homens, "2" = mulheres, "1,2" = ambos explícito.
     */
    private String genders;

    /** Interesses para targeting (opcional, formato JSON array) */
    private String interests;

    /**
     * Destino de conversão: WEBSITE (link) ou MESSAGES (WhatsApp).
     * MESSAGES usa WhatsApp automaticamente quando a página tem WhatsApp vinculado.
     */
    private String conversionDestination;

    /**
     * Número WhatsApp para destino MESSAGES (ex: 5511999999999).
     * Opcional se a página Meta tiver WhatsApp vinculado.
     */
    private String whatsappPhone;

    /** Texto principal do anúncio (message) */
    private String adMessage;

    /** URL de destino (link) - usado quando conversionDestination=WEBSITE */
    private String destinationUrl;

    /** URL da imagem do criativo */
    private String imageUrl;

    /** Título do link (headline/caption) */
    private String headline;

    /**
     * Tipo de CTA do anúncio: LEARN_MORE, SEND_MESSAGE, WHATSAPP_MESSAGE, SHOP_NOW, etc.
     */
    private String ctaType;

    /** Nome do conjunto de anúncios (ad set) */
    private String adSetName;

    /** Nome do anúncio */
    private String adName;
}
