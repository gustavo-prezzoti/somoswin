package com.backend.winai.dto.googledrive;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class DriveConnectionStatusDTO {
    private boolean connected;
    private String email;
    private String message;
}
