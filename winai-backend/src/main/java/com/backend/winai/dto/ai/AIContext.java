package com.backend.winai.dto.ai;

import com.backend.winai.entity.Company;
import com.backend.winai.entity.Lead;
import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class AIContext {
    private Company company;
    private Lead lead;
    private String phoneNumber;
    private String conversationId;
}
