package com.backend.winai.dto.agendamento;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AgendamentoConfigDTO {

    private Boolean enabled;
    private String startTime;  // "HH:mm"
    private String endTime;    // "HH:mm"
    private Integer slotDurationMinutes;
    private Boolean googleConnected;
    private Boolean canEnable; // false if Google not connected
}
