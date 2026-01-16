package com.backend.winai.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SDRAgentStatusResponse {
    private Boolean isConnected;
    private String status; // "Ativo" ou "Desconectado"
    private String lastExecution; // Ex: "há 4 minutos" ou "Nunca"
    private Long contactsToday; // Número de contatos hoje
    private Double efficiency; // Eficiência em porcentagem (ex: 94.8)
    private LocalDateTime lastMessageTimestamp;
    private String title;
    private String description;
}
