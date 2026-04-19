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
public class AdminGoalCompanyRowResponse {

    private UUID companyId;
    private String companyName;
    private int year;
    private long activeGoalsCount;
}
