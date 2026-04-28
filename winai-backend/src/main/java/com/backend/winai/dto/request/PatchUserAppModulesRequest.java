package com.backend.winai.dto.request;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.Map;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PatchUserAppModulesRequest {

    private Boolean fullAccess;
    /** Chaves = nome de CompanyAppModule (ex.: CRM). */
    private Map<String, Boolean> modules;
}
