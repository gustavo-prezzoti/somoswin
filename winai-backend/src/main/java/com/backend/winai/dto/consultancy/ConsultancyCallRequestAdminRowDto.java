package com.backend.winai.dto.consultancy;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ConsultancyCallRequestAdminRowDto {
    private UUID id;
    private UUID companyId;
    private String companyName;
    private String requestedByName;
    private String requestedByEmail;
    private String subject;
    private String urgency;
    private String topics;
    private String status;
    private String statusLabel;
    private String meetLink;
    private String createdAtLabel;
}
