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
public class CreateInternalStaffResponse {

    private UUID id;
    private String name;
    private String email;
    private String ampliaStaffType;
    /** Somente na criação, se senha foi gerada automaticamente. */
    private String tempPassword;
}
