package com.backend.winai.dto.response;

import com.fasterxml.jackson.annotation.JsonInclude;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.Map;

/**
 * Resposta padronizada de erro da API.
 * Sempre retorna: message, success=false.
 * Opcional: errors (para validação), code (código de erro).
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@JsonInclude(JsonInclude.Include.NON_NULL)
public class ApiErrorResponse {

    private String message;
    @Builder.Default
    private Boolean success = false;
    private Map<String, String> errors;
    private String code;

    public static ApiErrorResponse of(String message) {
        return ApiErrorResponse.builder()
                .message(message)
                .success(false)
                .build();
    }

    public static ApiErrorResponse of(String message, Map<String, String> errors) {
        return ApiErrorResponse.builder()
                .message(message)
                .success(false)
                .errors(errors)
                .build();
    }
}
