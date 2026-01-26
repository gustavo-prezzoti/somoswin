package com.backend.winai.dto.response;

import com.backend.winai.entity.Professional;
import com.backend.winai.entity.Professional.ProfessionalType;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ProfessionalResponse {

    private UUID id;
    private String name;
    private String specialty;
    private BigDecimal rating;
    private BigDecimal price;
    private String imageUrl;
    private String whatsapp;
    private String whatsappLink;
    private ProfessionalType type;
    private Boolean active;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    public static ProfessionalResponse fromEntity(Professional professional) {
        String whatsappNumber = professional.getWhatsapp().replaceAll("[^0-9]", "");
        String whatsappLink = "https://wa.me/" + whatsappNumber;
        
        return ProfessionalResponse.builder()
                .id(professional.getId())
                .name(professional.getName())
                .specialty(professional.getSpecialty())
                .rating(professional.getRating())
                .price(professional.getPrice())
                .imageUrl(professional.getImageUrl())
                .whatsapp(professional.getWhatsapp())
                .whatsappLink(whatsappLink)
                .type(professional.getType())
                .active(professional.getActive())
                .createdAt(professional.getCreatedAt())
                .updatedAt(professional.getUpdatedAt())
                .build();
    }
}
