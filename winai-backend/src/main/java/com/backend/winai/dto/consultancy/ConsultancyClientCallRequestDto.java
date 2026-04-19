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
public class ConsultancyClientCallRequestDto {
    private UUID id;
    private String subject;
    private String urgency;
    private String status;
    private String statusLabel;
    private String meetLink;
    private String createdAtLabel;
}
