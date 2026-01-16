package com.backend.winai.dto.social;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.util.List;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SocialChatDetailResponse {
    private UUID id;
    private String title;
    private List<ChatMessageDTO> messages;
}
