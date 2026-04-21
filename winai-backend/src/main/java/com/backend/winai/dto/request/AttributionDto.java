package com.backend.winai.dto.request;

import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Atribuição de marketing (UTM + click ids) enviada no registro ou APIs.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AttributionDto {

    @Size(max = 255)
    private String utmSource;

    @Size(max = 255)
    private String utmMedium;

    @Size(max = 255)
    private String utmCampaign;

    @Size(max = 255)
    private String utmContent;

    @Size(max = 255)
    private String utmTerm;

    @Size(max = 1024)
    private String gclid;

    @Size(max = 2048)
    private String fbclid;

    @Size(max = 1024)
    private String msclkid;

    /** ISO-8601 opcional (quando a captura ocorreu no cliente). */
    @Size(max = 64)
    private String capturedAt;
}
