package com.backend.winai.dto.consultancy;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/** Painel admin: aparência da tela + perfil do consultor (uma resposta). */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ConsultancyClientAppearanceDto {
    private ConsultantProfileDto consultant;
    private ConsultancyPageCopyDto pageCopy;
}
