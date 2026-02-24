package com.backend.winai.dto.marketing;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/** Um anúncio dentro do fluxo de criação: post existente ou criativo novo. */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AdItemRequest {

    /** true = usar post existente; false = criar novo anúncio */
    private Boolean useExistingPost;

    /** ID do post (page_id_post_id) quando useExistingPost=true */
    private String existingPostId;

    /** Texto principal quando useExistingPost=false */
    private String adMessage;

    /** Título (headline) quando useExistingPost=false */
    private String headline;

    /** Descrição (link description) quando useExistingPost=false */
    private String adDescription;

    /** URL da imagem quando useExistingPost=false */
    private String imageUrl;

    /** Nome do anúncio (opcional). Se vazio, usa nome da campanha + índice. */
    private String adName;
}
