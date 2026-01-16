package com.backend.winai.dto.social;

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
public class SocialChatResponse {
    private UUID id;
    private String title;
    private String lastMessage;
    private ZonedDateTime createdAt;
}
