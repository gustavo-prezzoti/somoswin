package com.backend.winai.dto.consultancy;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/** Textos configuráveis no admin para a tela de consultoria do cliente. */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ConsultancyPageCopyDto {
    private String kicker;
    private String headlinePrefix;
    private String headlineAccent;
    private String nextSectionCaption;
    private String requestCardTitle;
    private String requestCardDescription;
}
