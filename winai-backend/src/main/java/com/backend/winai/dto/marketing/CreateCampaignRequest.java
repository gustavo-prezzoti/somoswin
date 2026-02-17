package com.backend.winai.dto.marketing;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Request para criação de campanha Meta Ads para WhatsApp.
 * Fluxo: Campanha (Engajamento) -> Conjunto (WhatsApp, orçamento, público) -> Anúncio (novo ou post existente).
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CreateCampaignRequest {

    /** Nome da campanha */
    private String name;

    /** Objetivo fixo: OUTCOME_ENGAGEMENT (Engajamento) para WhatsApp */
    private String objective;

    /** Orçamento diário em reais */
    private Double dailyBudget;

    /** Data de início (YYYY-MM-DD) - opcional */
    private String startDate;

    /** Data de fim (YYYY-MM-DD) - opcional */
    private String endDate;

    /** Código do país (ex: BR) */
    private String countryCode;

    /** Idade mínima (18-65) */
    private Integer ageMin;

    /** Idade máxima (18-65) */
    private Integer ageMax;

    /** Gênero: ""=todos, "1"=homens, "2"=mulheres */
    private String genders;

    /** Interesses (JSON array) */
    private String interests;

    /** Número WhatsApp (dígitos). Opcional se página tiver WhatsApp vinculado. */
    private String whatsappPhone;

    /** true = usar post existente da página; false = criar novo anúncio */
    private Boolean useExistingPost;

    /** ID do post existente (page_id_post_id) - quando useExistingPost=true */
    private String existingPostId;

    /** Texto principal (message) - quando useExistingPost=false */
    private String adMessage;

    /** Título (headline, máx 40 chars) - quando useExistingPost=false */
    private String headline;

    /** Descrição (link description, máx 30 chars) - quando useExistingPost=false */
    private String adDescription;

    /** URL da imagem - quando useExistingPost=false */
    private String imageUrl;

    /** Nome do conjunto de anúncios */
    private String adSetName;

    /** Nome do anúncio */
    private String adName;
}
