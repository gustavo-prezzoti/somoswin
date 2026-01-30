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
    private FollowUpService self;

    @org.springframework.beans.factory.annotation.Autowired
    public void setSelf(@org.springframework.context.annotation.Lazy FollowUpService self) {
        this.self = self;
    }

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
        if (request.getTriggerOnLeadMessage() != null)
            config.setTriggerOnLeadMessage(request.getTriggerOnLeadMessage());
        if (request.getTriggerOnAiResponse() != null)
            config.setTriggerOnAiResponse(request.getTriggerOnAiResponse());
        if (request.getStartHour() != null)
            config.setStartHour(request.getStartHour());
        if (request.getEndHour() != null)
            config.setEndHour(request.getEndHour());

        // Atualiza Steps
        if (request.getSteps() != null) {
            if (config.getSteps() == null) {
                config.setSteps(new java.util.ArrayList<>());
            }
            config.getSteps().clear();
            for (int i = 0; i < request.getSteps().size(); i++) {
                var stepReq = request.getSteps().get(i);
                var step = FollowUpStep.builder()
                        .followUpConfig(config)
                        .stepOrder(i + 1) // 1-based order
                        .delayMinutes(stepReq.getDelayMinutes() != null ? stepReq.getDelayMinutes() : 60)
                        .messageType(stepReq.getMessageType())
                        .customMessage(stepReq.getCustomMessage())
                        .aiPrompt(stepReq.getAiPrompt())
                        .active(stepReq.getActive() != null ? stepReq.getActive() : true)
                        .build();
                config.getSteps().add(step);
            }
        }

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
            // Lead respondeu, reseta contador para começar um novo ciclo de follow-ups
            status.setFollowUpCount(0);
        } else if ("AI".equals(from) && config.getTriggerOnAiResponse()) {
            shouldSchedule = true;
            // IA respondeu, também reseta o contador para reativar o ciclo se estava no
            // limite
            status.setFollowUpCount(0);
        }

        if (shouldSchedule && !config.getSteps().isEmpty()) {
            ZonedDateTime nextFollowUp = now.plusMinutes(config.getInactivityMinutes());
            status.setNextFollowUpAt(nextFollowUp);
            log.debug("Follow-up inicial agendado para conversa {} em {}", conversationId, nextFollowUp);
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
                                if (!config.getSteps().isEmpty()) {
                                    // Se resumir, reinicia timer para inactivityMinutes (reset seguro)
                                    // Ou deveria tentar descobrir em qual step estava?
                                    // Simplificação: agenda próximo check para inactivityMinutes
                                    // Se já enviou alguns, o process vai identificar o próximo step
                                    if (status.getFollowUpCount() < config.getSteps().size()) {
                                        ZonedDateTime nextFollowUp = ZonedDateTime.now()
                                                .plusMinutes(config.getInactivityMinutes());
                                        status.setNextFollowUpAt(nextFollowUp);
                                    }
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
        List<FollowUpStatus> pendingList = statusRepository.findPendingFollowUps(now);

        if (pendingList.isEmpty()) {
            log.debug("Nenhum follow-up pendente para processar");
            return;
        }

        java.util.Map<String, List<FollowUpStatus>> byCompanyAndPhone = pendingList.stream()
                .filter(fs -> fs.getConversation().getPhoneNumber() != null
                        && fs.getConversation().getCompany() != null)
                .collect(Collectors.groupingBy(fs -> fs.getConversation().getCompany().getId().toString() + "_"
                        + fs.getConversation().getPhoneNumber()));

        log.info("[FOLLOW-UP WORKER] Encontrados {} follow-ups pendentes para {} chaves únicas (Empresa_Telefone).",
                pendingList.size(), byCompanyAndPhone.size());

        for (java.util.Map.Entry<String, List<FollowUpStatus>> entry : byCompanyAndPhone.entrySet()) {
            String compositeKey = entry.getKey();
            List<FollowUpStatus> statuses = entry.getValue();
            String phone = compositeKey.split("_")[1];

            // Pega o primeiro (mais antigo/pendente) para processar
            FollowUpStatus target = statuses.get(0);

            // Se houver mais de um para o mesmo telefone, desativa os outros
            if (statuses.size() > 1) {
                for (int i = 1; i < statuses.size(); i++) {
                    UUID redundantId = statuses.get(i).getId();
                    log.info("[FOLLOW-UP WORKER] Desativando follow-up redundante [ID: {}] para o telefone {}",
                            redundantId, phone);
                    try {
                        self.deactivateRedundantFollowUp(redundantId);
                    } catch (Exception e) {
                        log.warn("Erro ao desativar follow-up {}: {}", redundantId, e.getMessage());
                    }
                }
            }

            try {
                // Processa o único eleito com trava
                self.processFollowUpByIdWithLock(target.getId());
            } catch (Exception e) {
                log.error("Erro ao processar follow-up {} para {}: {}", target.getId(), phone, e.getMessage());
            }
        }
    }

    /**
     * Desativa um follow-up redundante para evitar que seja processado novamente.
     */
    @Transactional
    public void deactivateRedundantFollowUp(UUID statusId) {
        statusRepository.findById(statusId).ifPresent(status -> {
            status.setNextFollowUpAt(null);
            status.setEligible(false); // Marca como inativo para não poluir o worker
            statusRepository.save(status);
        });
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

        log.info("Processando follow-up bloqueado [StatusID: {} | ConvID: {} | Fone: {}]",
                statusId, status.getConversation().getId(), status.getConversation().getPhoneNumber());
        processFollowUpForConversation(status);
    }

    @Transactional
    public void processFollowUpForConversation(FollowUpStatus status) {
        // 1. Limpa o timer IMEDIATAMENTE (dentro da transação travada)
        // para garantir que ninguém mais processe isso.
        status.setNextFollowUpAt(null);
        statusRepository.saveAndFlush(status);

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

        // Verifica limite máximo baseado na lista de steps
        int currentStepIndex = status.getFollowUpCount();
        if (currentStepIndex >= config.getSteps().size()) {
            log.debug("Todos os steps executados para conversa {}", conversation.getId());
            status.setNextFollowUpAt(null);
            status.setEligible(false);
            statusRepository.save(status);
            return;
        }

        // Recupera o step atual
        FollowUpStep currentStep = config.getSteps().get(currentStepIndex);

        // Verifica se conversa está em modo IA
        if (!"IA".equals(conversation.getSupportMode())) {
            log.debug("Conversa {} não está em modo IA - pulando follow-up", conversation.getId());
            status.setNextFollowUpAt(null);
            statusRepository.save(status);
            return;
        }

        // Gera mensagem de follow-up usando o step atual
        String followUpMessage = generateFollowUpMessage(currentStep, conversation);

        try {
            // 1. Envia via WhatsApp
            boolean sent = aiAgentService.sendSplitResponse(conversation, followUpMessage);

            if (sent) {
                ZonedDateTime now = ZonedDateTime.now();
                status.setFollowUpCount(status.getFollowUpCount() + 1);
                status.setLastFollowUpAt(now);

                // Agenda próximo step se existir
                int nextStepIndex = status.getFollowUpCount();
                if (nextStepIndex < config.getSteps().size()) {
                    FollowUpStep nextStep = config.getSteps().get(nextStepIndex);
                    // Agendar próximo: now + delay do próximo step
                    // Nota: O delay do step é "tempo a esperar APÓS o evento anterior".
                    // Aqui, o evento anterior é este envio.
                    status.setNextFollowUpAt(now.plusMinutes(nextStep.getDelayMinutes()));
                } else {
                    status.setNextFollowUpAt(null); // Fim do fluxo
                }

                statusRepository.save(status);
                log.info("Follow-up Step #{} enviado para conversa {}", currentStep.getStepOrder(),
                        conversation.getId());
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
     * Gera mensagem de follow-up baseada no STEP atual.
     */
    private String generateFollowUpMessage(FollowUpStep step, WhatsAppConversation conversation) {
        if ("CUSTOM".equalsIgnoreCase(step.getMessageType()) && step.getCustomMessage() != null
                && !step.getCustomMessage().isBlank()) {
            return step.getCustomMessage();
        }

        if ("AI".equalsIgnoreCase(step.getMessageType())) {
            try {
                log.info("Gerando follow-up IA (Step {}) para conversa {}", step.getStepOrder(), conversation.getId());

                List<String> history = aiAgentService.getRecentConversationHistory(conversation.getId(), 5);
                String leadName = conversation.getContactName() != null ? conversation.getContactName() : "cliente";

                String prompt = String.format(
                        "CONTEXTO DE REENGAJAMENTO (FOLLOW-UP - TENTATIVA %d):\n" +
                                "O lead %s parou de responder.\n" +
                                "Histórico recente abaixo.\n" +
                                "Missão: Criar mensagem de retomada curta, empática e informal.\n" +
                                "Histórico:\n%s\n" +
                                "Retorne APENAS a mensagem.",
                        step.getStepOrder(), leadName, String.join("\n", history));

                String aiResponse = aiAgentService.processMessageWithAI(conversation, prompt, leadName);

                if (aiResponse != null && !aiResponse.trim().isEmpty()
                        && !"HUMAN_HANDOFF_REQUESTED".equals(aiResponse)) {
                    return aiResponse;
                }
            } catch (Exception e) {
                log.error("Erro ao gerar follow-up com IA: {}", e.getMessage());
            }
        }

        // Fallback genérico se IA falhar ou se config antiga
        return "Olá! Gostaria de saber se ainda posso ajudar com algo? 😊";
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
                .triggerOnLeadMessage(config.getTriggerOnLeadMessage())
                .triggerOnAiResponse(config.getTriggerOnAiResponse())
                .startHour(config.getStartHour())
                .endHour(config.getEndHour())
                .createdAt(config.getCreatedAt())
                .updatedAt(config.getUpdatedAt())
                .steps(config.getSteps().stream().map(this::toStepResponse).collect(Collectors.toList()))
                .build();
    }

    private com.backend.winai.dto.response.FollowUpStepResponse toStepResponse(FollowUpStep step) {
        return com.backend.winai.dto.response.FollowUpStepResponse.builder()
                .id(step.getId())
                .stepOrder(step.getStepOrder())
                .delayMinutes(step.getDelayMinutes())
                .messageType(step.getMessageType())
                .customMessage(step.getCustomMessage())
                .aiPrompt(step.getAiPrompt())
                .active(step.getActive())
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
