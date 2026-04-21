package com.backend.winai.dto.request;

import lombok.Data;

import java.util.Map;

@Data
public class CrmKanbanColumnTitlesRequest {
    /** Chaves = nome do enum LeadStatus (ex.: NEW); valores = rótulo exibido (máx. 40 caracteres no serviço). */
    private Map<String, String> titles;
}
