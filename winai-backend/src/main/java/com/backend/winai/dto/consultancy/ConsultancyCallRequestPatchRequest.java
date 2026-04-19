package com.backend.winai.dto.consultancy;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ConsultancyCallRequestPatchRequest {
    private String meetLink;
    /** PENDING, SCHEDULED, DONE, CANCELLED */
    private String status;
}
