package com.backend.winai.dto.request;

import com.backend.winai.entity.LeadStatus;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class LeadRequest {

    @NotBlank(message = "Nome é obrigatório")
    private String name;

    @Email(message = "E-mail inválido")
    private String email;

    private String phone;

    private LeadStatus status;

    private String ownerName;

    private String notes;

    private String source;

    private String trackId;

    private String trackSource;

    private String utmSource;

    private String utmMedium;

    private String utmCampaign;

    private String utmContent;

    private String utmTerm;

    private String gclid;

    private String fbclid;

    private BigDecimal estimatedValue;

    private Integer leadScore;

    /**
     * Nomes das tags do CRM (carteira / segmento). Null em atualização = não alterar vínculos.
     * Lista vazia = remover todas. Cada nome inexistente cria registro em {@code crm_lead_tags} da empresa.
     */
    private List<String> tags;
}
