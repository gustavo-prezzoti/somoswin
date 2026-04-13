package com.backend.winai.dto.consultancy;

import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CreateConsultancyCallRequestDto {

    @NotBlank
    private String subject;

    @Builder.Default
    private String urgency = "normal";

    @NotBlank
    private String topics;
}
