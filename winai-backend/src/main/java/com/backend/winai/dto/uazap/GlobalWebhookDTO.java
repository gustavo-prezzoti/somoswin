package com.backend.winai.dto.uazap;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class GlobalWebhookDTO {
    private boolean enabled;
    private String url;
    private List<String> events;
    private List<String> excludeMessages;
    private boolean addUrlEvents;
    private boolean addUrlTypesMessages;
}
