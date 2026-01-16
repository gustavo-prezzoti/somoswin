package com.backend.winai.dto.googledrive;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class DriveOAuthCallbackRequest {
    private String code;
    private String state;
}
