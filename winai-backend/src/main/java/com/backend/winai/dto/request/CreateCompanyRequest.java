package com.backend.winai.dto.request;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CreateCompanyRequest {
    private String name;
    private String contratante;
    private String documento;
    private String emailContratante;
    private String plan = "STARTER"; // Default plan
}
