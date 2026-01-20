package com.backend.winai.dto;

import lombok.*;

import java.time.ZonedDateTime;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SystemPromptDTO {
    private UUID id;
    private String name;
    private String category;
    private String content;
    private String description;
    private Boolean isActive;
    private Boolean isDefault;
    private ZonedDateTime createdAt;
    private ZonedDateTime updatedAt;
}

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
class CreateSystemPromptRequest {
    private String name;
    private String category;
    private String content;
    private String description;
    private Boolean isDefault;
}

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
class UpdateSystemPromptRequest {
    private String name;
    private String content;
    private String description;
    private Boolean isActive;
    private Boolean isDefault;
}
