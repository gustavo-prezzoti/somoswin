package com.backend.winai.service;

import com.backend.winai.dto.request.FollowUpConfigRequest;
import com.backend.winai.dto.response.FollowUpConfigResponse;
import com.backend.winai.dto.response.FollowUpStatusResponse;
import com.backend.winai.entity.*;
import com.backend.winai.repository.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalTime;
import java.time.ZonedDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import java.util.stream.Collectors;

/**
 * Serviço responsável pela lógica de follow-up automático.
 * Gerencia configurações por empresa e status por conversa.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class FollowUpService {

    private final FollowUpConfigRepository configRepository;
    private final FollowUpStatusRepository statusRepository;
    private final WhatsAppConversationRepository conversationRepository;
    private final CompanyRepository companyRepository;
    private final AIAgentService aiAgentService;

    // ========== CONFIGURAÇÃO ==========

    /**
     * Busca configuração de follow-up por empresa.
     */
    public Optional<FollowUpConfigResponse> getConfigByCompany(UUID companyId) {
        return configRepository.findByCompanyId(companyId)
                .map(this::toConfigResponse);
    }

    /**
     * Salva ou atualiza configuração de follow-up.
     */
    @Transactional
    public FollowUpConfigResponse saveConfig(FollowUpConfigRequest request) {
        Company company = companyRepository.findById(request.getCompanyId())
                .orElseThrow(() -> new RuntimeException("Empresa não encontrada: " + request.getCompanyId()));

        FollowUpConfig config = configRepository.findByCompanyId(request.getCompanyId())
                .orElse(FollowUpConfig.builder()
                        .company(company)
                        .build());

        // Atualiza campos
        if (request.getEnabled() != null)
            config.setEnabled(request.getEnabled());
        if (request.getInactivityMinutes() != null)
            config.setInactivityMinutes(Math.max(1, request.getInactivityMinutes()));
        if (request.getRecurring() != null)
            config.setRecurring(request.getRecurring());
        if (request.getRecurrenceMinutes() != null)
            config.setRecurrenceMinutes(Math.max(1, request.getRecurrenceMinutes()));
        if (request.getMaxFollowUps() != null)
            config.setMaxFollowUps(request.getMaxFollowUps());
        if (request.getMessageType() != null)
            config.setMessageType(request.getMessageType());
        if (request.getCustomMessage() != null)
            config.setCustomMessage(request.getCustomMessage());
        if (request.getTriggerOnLeadMessage() != null)
            config.setTriggerOnLeadMessage(request.getTriggerOnLeadMessage());
        if (request.getTriggerOnAiResponse() != null)
            config.setTriggerOnAiResponse(request.getTriggerOnAiResponse());
        if (request.getStartHour() != null)
            config.setStartHour(request.getStartHour());
        if (request.getEndHour() != null)
            config.setEndHour(request.getEndHour());

        // Campos de handoff humano
        if (request.getHumanHandoffNotificationEnabled() != null)
            config.setHumanHandoffNotificationEnabled(request.getHumanHandoffNotificationEnabled());
        if (request.getHumanHandoffPhone() != null)
            config.setHumanHandoffPhone(request.getHumanHandoffPhone());
        if (request.getHumanHandoffMessage() != null)
            config.setHumanHandoffMessage(request.getHumanHandoffMessage());

        config = configRepository.save(config);
        log.info("Configuração de follow-up salva para empresa {}: enabled={}", company.getName(), config.getEnabled());

        return toConfigResponse(config);
    }

    // ========== STATUS ==========

    /**
     * Lista status de follow-up de uma empresa.
     */
    public List<FollowUpStatusResponse> getStatusesByCompany(UUID companyId) {
        return statusRepository.findByCompanyId(companyId).stream()
                .map(this::toStatusResponse)
                .collect(Collectors.toList());
    }

    /**
     * Atualiza status quando uma mensagem é recebida na conversa.
     * Chamado pelo WhatsAppWebhookService.
     */
    @Transactional
    public void updateLastMessage(UUID conversationId, String from) {
        WhatsAppConversation conversation = conversationRepository.findById(conversationId)
                .orElse(null);

        if (conversation == null) {
            return;
        }

        // Verifica se empresa tem follow-up ativo
        Optional<FollowUpConfig> configOpt = configRepository.findByCompanyId(
                conversation.getCompany().getId());

        if (configOpt.isEmpty() || !configOpt.get().getEnabled()) {
            return;
        }

        FollowUpConfig config = configOpt.get();
        ZonedDateTime now = ZonedDateTime.now();

        FollowUpStatus status = statusRepository.findByConversationId(conversationId)
                .orElse(FollowUpStatus.builder()
                        .conversation(conversation)
                        .followUpCount(0)
                        .build());

        status.setLastMessageAt(now);
        status.setLastMessageFrom(from);
        status.setEligible(true);

        // Calcula próximo follow-up baseado no trigger configurado
        boolean shouldSchedule = false;
        if ("LEAD".equals(from) && config.getTriggerOnLeadMessage()) {
            shouldSchedule = true;
            // Lead respondeu, reseta contador se não for recorrente
            if (!config.getRecurring()) {
                status.setFollowUpCount(0);
            }
        } else if ("AI".equals(from) && config.getTriggerOnAiResponse()) {
            shouldSchedule = true;
        }

        if (shouldSchedule && status.getFollowUpCount() < config.getMaxFollowUps()) {
            ZonedDateTime nextFollowUp = now.plusMinutes(config.getInactivityMinutes());
            status.setNextFollowUpAt(nextFollowUp);
            log.debug("Follow-up agendado para conversa {} em {}", conversationId, nextFollowUp);
        } else {
            status.setNextFollowUpAt(null);
        }

        statusRepository.save(status);
    }

    /**
     * Pausa follow-up para uma conversa específica.
     */
    @Transactional
    public void pauseFollowUp(UUID conversationId) {
        statusRepository.findByConversationId(conversationId)
                .ifPresent(status -> {
                    status.setPaused(true);
                    status.setNextFollowUpAt(null);
                    statusRepository.save(status);
                    log.info("Follow-up pausado para conversa {}", conversationId);
                });
    }

    /**
     * Resume follow-up para uma conversa.
     */
    @Transactional
    public void resumeFollowUp(UUID conversationId) {
        statusRepository.findByConversationId(conversationId)
                .ifPresent(status -> {
                    status.setPaused(false);
                    // Reagenda baseado na última mensagem
                    WhatsAppConversation conv = status.getConversation();
                    configRepository.findByCompanyId(conv.getCompany().getId())
                            .ifPresent(config -> {
                                if (status.getFollowUpCount() < config.getMaxFollowUps()) {
                                    ZonedDateTime nextFollowUp = ZonedDateTime.now()
                                            .plusMinutes(config.getInactivityMinutes());
                                    status.setNextFollowUpAt(nextFollowUp);
                                }
                            });
                    statusRepository.save(status);
                    log.info("Follow-up resumido para conversa {}", conversationId);
                });
    }

    /**
     * Reseta status de follow-up para uma conversa.
     */
    @Transactional
    public void resetFollowUp(UUID conversationId) {
        statusRepository.findByConversationId(conversationId)
                .ifPresent(status -> {
                    status.setFollowUpCount(0);
                    status.setLastFollowUpAt(null);
                    status.setNextFollowUpAt(null);
                    status.setPaused(false);
                    status.setEligible(true);
                    statusRepository.save(status);
                    log.info("Follow-up resetado para conversa {}", conversationId);
                });
    }

    // ========== PROCESSAMENTO ASSÍNCRONO ==========

    /**
     * Processa follow-ups pendentes de forma assíncrona.
     * Chamado pelo FollowUpScheduler.
     */
    @Async("followUpTaskExecutor")
    public void processPendingFollowUpsAsync() {
        ZonedDateTime now = ZonedDateTime.now();
        // Busca apenas IDs para evitar problemas de concorrência com objetos Managed
        List<UUID> pendingIds = statusRepository.findPendingFollowUps(now)
                .stream().map(FollowUpStatus::getId).collect(Collectors.toList());

        if (pendingIds.isEmpty()) {
            log.debug("Nenhum follow-up pendente para processar");
            return;
        }

        log.info("Processando {} follow-ups pendentes", pendingIds.size());

        for (UUID statusId : pendingIds) {
            try {
                processFollowUpByIdWithLock(statusId);
            } catch (Exception e) {
                log.error("Erro ao processar follow-up {}: {}", statusId, e.getMessage());
            }
        }
    }

    /**
     * Processa follow-up com trava para evitar duplicidade em ambientes
     * concorrentes.
     */
    @Transactional
    public void processFollowUpByIdWithLock(UUID statusId) {
        // Usa SELECT FOR UPDATE para garantir exclusividade imediata
        Optional<FollowUpStatus> statusOpt = statusRepository.findByIdWithLock(statusId);
        if (statusOpt.isEmpty())
            return;

        FollowUpStatus status = statusOpt.get();

        // Verificação DUPLA dentro da trava: se outra thread já limpou o timer, aborta.
        if (status.getNextFollowUpAt() == null || status.getNextFollowUpAt().isAfter(ZonedDateTime.now())) {
            log.debug("Follow-up {} já processado ou adiado por outra thread", statusId);
            return;
        }

        log.info("Processando follow-up bloqueado para conversa {}", status.getConversation().getId());
        processFollowUpForConversation(status);
    }

    /**
     * Processa follow-up para uma conversa específica.
     */
    @Transactional
    public void processFollowUpForConversation(FollowUpStatus status) {
        WhatsAppConversation conversation = status.getConversation();

        Optional<FollowUpConfig> configOpt = configRepository.findByCompanyId(
                conversation.getCompany().getId());

        if (configOpt.isEmpty() || !configOpt.get().getEnabled()) {
            log.debug("Follow-up desabilitado para empresa da conversa {}", conversation.getId());
            status.setNextFollowUpAt(null);
            statusRepository.save(status);
            return;
        }

        FollowUpConfig config = configOpt.get();

        // Verifica janela de horário
        if (!isWithinTimeWindow(config)) {
            log.debug("Fora da janela de horário para follow-up - adiando para próxima janela");
            // Agenda para início da próxima janela
            ZonedDateTime nextWindow = calculateNextTimeWindow(config);
            status.setNextFollowUpAt(nextWindow);
            statusRepository.save(status);
            return;
        }

        // Verifica limite máximo
        if (status.getFollowUpCount() >= config.getMaxFollowUps()) {
            log.debug("Limite de follow-ups atingido para conversa {}", conversation.getId());
            status.setNextFollowUpAt(null);
            status.setEligible(false);
            statusRepository.save(status);
            return;
        }

        // Verifica se conversa está em modo IA
        if (!"IA".equals(conversation.getSupportMode())) {
            log.debug("Conversa {} não está em modo IA - pulando follow-up", conversation.getId());
            status.setNextFollowUpAt(null);
            statusRepository.save(status);
            return;
        }

        // Gera mensagem de follow-up
        String followUpMessage = generateFollowUpMessage(config, conversation);

        // ATÔMICO: Limpa o timer IMEDIATAMENTE antes de enviar para evitar que
        // outra thread/worker processe a mesma conversa simultaneamente.
        status.setNextFollowUpAt(null);
        statusRepository.saveAndFlush(status);

        try {
            // 1. Envia via WhatsApp (UAZAPI)
            boolean sent = aiAgentService.sendAIResponse(conversation, followUpMessage);

            if (sent) {
                // 2. Persiste no banco de dados e notifica via WebSocket para o Frontend
                aiAgentService.persistAndNotify(conversation, followUpMessage);

                ZonedDateTime now = ZonedDateTime.now();
                status.setFollowUpCount(status.getFollowUpCount() + 1);
                status.setLastFollowUpAt(now);

                // Agenda próximo se for recorrente
                if (config.getRecurring() && status.getFollowUpCount() < config.getMaxFollowUps()) {
                    status.setNextFollowUpAt(now.plusMinutes(config.getRecurrenceMinutes()));
                }

                statusRepository.save(status);
                log.info("Follow-up #{} enviado e notificado para conversa {}",
                        status.getFollowUpCount(), conversation.getId());
            }

        } catch (Exception e) {
            log.error("Erro ao enviar follow-up para conversa {}: {}",
                    conversation.getId(), e.getMessage(), e);

            if (status.getLastFollowUpAt() == null
                    || status.getLastFollowUpAt().isBefore(ZonedDateTime.now().minusMinutes(5))) {
                log.info("Agendando UMA única retentativa para conversa {}", conversation.getId());
                status.setNextFollowUpAt(ZonedDateTime.now().plusMinutes(30));
            } else {
                log.warn("Falha persistente no follow-up da conversa {}. Parando tentativas.", conversation.getId());
                status.setNextFollowUpAt(null);
                status.setEligible(false);
            }
            statusRepository.save(status);
        }
    }

    /**
     * Gera mensagem de follow-up baseada na configuração.
     */
    private String generateFollowUpMessage(FollowUpConfig config, WhatsAppConversation conversation) {
        if (config.getCustomMessage() != null && !config.getCustomMessage().isBlank()) {
            return config.getCustomMessage();
        }

        if ("AI".equalsIgnoreCase(config.getMessageType())) {
            try {
                log.info("Gerando follow-up inteligente com IA para conversa {}", conversation.getId());

                List<String> history = aiAgentService.getRecentConversationHistory(conversation.getId(), 5);

                String leadName = conversation.getContactName() != null ? conversation.getContactName() : "cliente";

                String prompt = String.format(
                        "CONTEXTO DE REENGAJAMENTO (FOLLOW-UP):\n" +
                                "O lead %s parou de responder na conversa anterior.\n" +
                                "Analise o histórico abaixo para entender o último ponto de contato.\n" +
                                "Sua missão é criar uma mensagem de retomada que seja:\n" +
                                "1. Curta e informal (linguagem de WhatsApp).\n" +
                                "2. Empática e prestativa.\n" +
                                "3. Cite brevemente algo do histórico se fizer sentido para parecer natural.\n" +
                                "4. Termine com uma pergunta simples para facilitar a resposta.\n" +
                                "\nHISTÓRICO:\n%s\n" +
                                "\nIMPORTANTE: Retorne APENAS o texto da mensagem. Não use aspas ou prefixos.",
                        leadName, String.join("\n", history));

                // Usa o processoMessageWithAI mas com um prompt de sistema temporário ou
                // contexto
                String aiResponse = aiAgentService.processMessageWithAI(conversation, prompt, leadName);

                if (aiResponse != null && !aiResponse.trim().isEmpty()
                        && !"HUMAN_HANDOFF_REQUESTED".equals(aiResponse)) {
                    return aiResponse;
                }

                log.warn("IA não gerou resposta de follow-up válida, usando fallback padrão");
            } catch (Exception e) {
                log.error("Erro ao gerar follow-up com IA: {}", e.getMessage());
            }
        }

        String contactName = conversation.getContactName() != null ? conversation.getContactName() : "cliente";

        return switch (config.getMessageType()) {
            case "CONTINUATION" -> String.format(
                    "Olá %s! 👋 Gostaria de continuar nossa conversa de onde paramos. Posso ajudar com mais alguma coisa?",
                    contactName);
            case "CHECKING_IN" -> String.format(
                    "Oi %s! Tudo bem? Notei que faz um tempo que conversamos. Estou aqui se precisar de algo! 😊",
                    contactName);
            default -> String.format(
                    "Olá %s! Estou passando para ver se posso ajudar com mais alguma coisa. 🙂",
                    contactName);
        };
    }

    /**
     * Verifica se está dentro da janela de horário configurada.
     */
    private boolean isWithinTimeWindow(FollowUpConfig config) {
        int now = LocalTime.now().getHour();
        int start = config.getStartHour();
        int end = config.getEndHour();

        if (start <= end) {
            return now >= start && now <= end;
        } else {
            // Janela atravessa meia-noite
            return now >= start || now <= end;
        }
    }

    /**
     * Calcula próxima abertura da janela de horário.
     */
    private ZonedDateTime calculateNextTimeWindow(FollowUpConfig config) {
        ZonedDateTime now = ZonedDateTime.now();
        LocalTime start = LocalTime.of(config.getStartHour(), 0);

        ZonedDateTime nextWindow = now.with(start);
        if (nextWindow.isBefore(now)) {
            nextWindow = nextWindow.plusDays(1);
        }

        return nextWindow;
    }

    // ========== MAPPERS ==========

    private FollowUpConfigResponse toConfigResponse(FollowUpConfig config) {
        return FollowUpConfigResponse.builder()
                .id(config.getId())
                .companyId(config.getCompany().getId())
                .companyName(config.getCompany().getName())
                .enabled(config.getEnabled())
                .inactivityMinutes(config.getInactivityMinutes())
                .recurring(config.getRecurring())
                .recurrenceMinutes(config.getRecurrenceMinutes())
                .maxFollowUps(config.getMaxFollowUps())
                .messageType(config.getMessageType())
                .customMessage(config.getCustomMessage())
                .triggerOnLeadMessage(config.getTriggerOnLeadMessage())
                .triggerOnAiResponse(config.getTriggerOnAiResponse())
                .startHour(config.getStartHour())
                .endHour(config.getEndHour())
                .humanHandoffNotificationEnabled(config.getHumanHandoffNotificationEnabled())
                .humanHandoffPhone(config.getHumanHandoffPhone())
                .humanHandoffMessage(config.getHumanHandoffMessage())
                .createdAt(config.getCreatedAt())
                .updatedAt(config.getUpdatedAt())
                .build();
    }

    private FollowUpStatusResponse toStatusResponse(FollowUpStatus status) {
        WhatsAppConversation conv = status.getConversation();
        return FollowUpStatusResponse.builder()
                .id(status.getId())
                .conversationId(conv.getId())
                .contactName(conv.getContactName())
                .phoneNumber(conv.getPhoneNumber())
                .lastMessageAt(status.getLastMessageAt())
                .lastMessageFrom(status.getLastMessageFrom())
                .followUpCount(status.getFollowUpCount())
                .lastFollowUpAt(status.getLastFollowUpAt())
                .nextFollowUpAt(status.getNextFollowUpAt())
                .paused(status.getPaused())
                .eligible(status.getEligible())
                .createdAt(status.getCreatedAt())
                .build();
    }
}
