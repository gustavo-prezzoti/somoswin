package com.backend.winai.dto.response;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.Map;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class CrmKanbanColumnTitlesResponse {
    private Map<String, String> titles;
}
