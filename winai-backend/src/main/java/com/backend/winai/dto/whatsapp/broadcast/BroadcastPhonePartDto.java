package com.backend.winai.dto.whatsapp.broadcast;

import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class BroadcastPhonePartDto {

    @Size(max = 8)
    private String ddi;

    @Size(max = 8)
    private String ddd;

    @Size(max = 32)
    private String number;
}
