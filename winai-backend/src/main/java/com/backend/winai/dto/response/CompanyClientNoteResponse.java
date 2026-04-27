package com.backend.winai.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CompanyClientNoteResponse {

    private UUID id;
    private String body;
    private String createdAt;
    private UUID authorUserId;
    private String authorName;
}
