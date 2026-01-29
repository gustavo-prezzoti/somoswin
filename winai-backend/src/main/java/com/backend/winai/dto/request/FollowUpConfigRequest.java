package com.backend.winai.dto.request;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class FollowUpConfigRequest {

    private UUID companyId;

    private Boolean enabled;

    /**
     * Tempo de inatividade em minutos antes de disparar follow-up.
     */
    private Integer inactivityMinutes;

    /**
     * Se true, follow-ups são enviados periodicamente.
     */
    private Boolean recurring;

    /**
     * Intervalo em minutos entre follow-ups recorrentes.
     */
    private Integer recurrenceMinutes;

    /**
     * Máximo de follow-ups por conversa.
     */
    private Integer maxFollowUps;

    /**
     * Tipo de mensagem: CONTINUATION ou CHECKING_IN
     */
    private String messageType;

    /**
     * Mensagem customizada para follow-up.
     */
    private String customMessage;

    /**
     * Considera última mensagem do lead para inatividade.
     */
    private Boolean triggerOnLeadMessage;

    /**
     * Considera última mensagem da IA para inatividade.
     */
    private Boolean triggerOnAiResponse;

    /**
     * Horário inicial para envio (0-23).
     */
    private Integer startHour;

    /**
     * Horário final para envio (0-23).
     */
    private Integer endHour;

    // ==========================================
    // Configurações de Notificação Handoff Humano
    // ==========================================

    /**
     * Ativa notificação WhatsApp quando lead solicitar atendimento humano.
     */
    private Boolean humanHandoffNotificationEnabled;

    /**
     * Número de telefone para receber notificação de handoff.
     */
    private String humanHandoffPhone;

    /**
     * Mensagem customizada para notificação de handoff enviada ao AGENTE.
     */
    private String humanHandoffMessage;

    /**
     * Mensagem enviada ao LEAD quando solicitada a escala para humano.
     */
    private String humanHandoffClientMessage;
}
