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
public class StaffCompanyAssignmentOptionResponse {

    private UUID companyId;
    private String companyName;
}
