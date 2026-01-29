package com.backend.winai.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.ZonedDateTime;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class FollowUpStatusResponse {

    private UUID id;
    private UUID conversationId;
    private String contactName;
    private String phoneNumber;
    private ZonedDateTime lastMessageAt;
    private String lastMessageFrom;
    private Integer followUpCount;
    private ZonedDateTime lastFollowUpAt;
    private ZonedDateTime nextFollowUpAt;
    private Boolean paused;
    private Boolean eligible;
    private ZonedDateTime createdAt;
}
