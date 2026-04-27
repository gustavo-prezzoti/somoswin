package com.backend.winai.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class CreateCompanyClientNoteRequest {

    @NotBlank
    @Size(max = 20000)
    private String body;
}
