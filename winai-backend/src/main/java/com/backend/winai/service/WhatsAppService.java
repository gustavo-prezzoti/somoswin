package com.backend.winai.service;

import com.backend.winai.dto.request.SendWhatsAppMessageRequest;
import com.backend.winai.dto.response.SDRAgentStatusResponse;
import com.backend.winai.dto.response.WhatsAppConversationResponse;
import com.backend.winai.dto.response.WhatsAppMessageResponse;
import com.backend.winai.entity.Company;
import com.backend.winai.entity.Lead;
import com.backend.winai.entity.User;
import com.backend.winai.entity.WhatsAppConversation;
import com.backend.winai.entity.WhatsAppMessage;
import com.backend.winai.dto.response.WebSocketMessage;
import com.backend.winai.repository.CompanyRepository;
import com.backend.winai.repository.LeadRepository;
import com.backend.winai.repository.WhatsAppConversationRepository;
import com.backend.winai.repository.WhatsAppMessageRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.util.Collections;

import java.time.Instant;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

import java.util.Map;
import org.springframework.web.client.RestTemplate;

@Service
@RequiredArgsConstructor
@Slf4j
public class WhatsAppService {

    private final UazapService uazapService;
    private final WhatsAppConversationRepository conversationRepository;
    private final WhatsAppMessageRepository messageRepository;
    private final LeadRepository leadRepository;
    private final CompanyRepository companyRepository;
    private final SimpMessagingTemplate messagingTemplate;
    private final SupabaseStorageService storageService;
    private final RestTemplate restTemplate = new RestTemplate();

    @Value("${uazap.default-token:}")
    private String defaultToken;

    /**
     * Processa mensagem recebida via Webhook
     */
    @Transactional
    @SuppressWarnings("unchecked")
    public void processWebhookMessage(String instanceName, Map<String, Object> payload) {
        log.info("Processando webhook para instância: {}", instanceName);

        // 1. Identificar Empresa via Instância
        // Tenta encontrar qualquer conversa com esta instância para descobrir a empresa
        WhatsAppConversation conversation = conversationRepository.findFirstByUazapInstance(instanceName)
                .orElse(null);

        String uazapToken = (String) payload.get("token");
        Company company = null;

        if (conversation != null) {
            company = conversation.getCompany();
        } else {
            // Tenta encontrar empresa padrão se não houver conversa prévia
            List<Company> companies = companyRepository.findAll();
            if (!companies.isEmpty()) {
                company = companies.get(0);
                log.info("Associando mensagem à empresa padrão ID: {}", company.getId());
            } else {
                log.warn("Nenhuma conversa e nenhuma empresa encontrada para instância {}.", instanceName);
                return;
            }
        }

        // 2. Extrair dados da mensagem
        Map<String, Object> messageData = (Map<String, Object>) payload.get("message");
        if (messageData == null) {
            log.warn("Payload sem dados de mensagem");
            return;
        }

        String remoteJid = (String) messageData.get("chatid"); // ou key.remoteJid
        if (remoteJid == null)
            remoteJid = (String) messageData.get("sender_pn"); // fallback

        // 3. Obter ou criar Conversa
        if (conversation == null || !conversation.getWaChatId().equals(remoteJid)) {
            // Buscar conversa específica desse chat

            Company finalCompany = company; // para uso no lambda
            String finalRemoteJid = remoteJid;

            conversation = conversationRepository.findByWaChatIdAndCompany(remoteJid, company)
                    .orElseGet(() -> {
                        // Criar nova conversa
                        WhatsAppConversation newConv = new WhatsAppConversation();
                        newConv.setCompany(finalCompany);
                        newConv.setWaChatId(finalRemoteJid);
                        newConv.setPhoneNumber(finalRemoteJid.split("@")[0]);
                        newConv.setUazapInstance(instanceName);
                        newConv.setUazapToken(uazapToken);

                        // Tentar obter nome do contato
                        Map<String, Object> chatData = (Map<String, Object>) payload.get("chat");
                        if (chatData != null) {
                            newConv.setContactName((String) chatData.get("name"));
                        }

                        return conversationRepository.save(newConv);
                    });
        }

        // Atualizar nome se disponível
        Map<String, Object> chatData = (Map<String, Object>) payload
                .get("chat");
        if (chatData != null && chatData.get("name") != null) {
            conversation.setContactName((String) chatData.get("name"));
        }

        // 4. Identificar/Criar Lead (Opcional - por enquanto baseado no telefone)
        if (conversation.getLead() == null) {
            // Tentar encontrar lead pelo telefone
            String phone = conversation.getPhoneNumber();
            Lead lead = leadRepository.findByPhoneAndCompany(phone, company)
                    .orElse(null);

            if (lead == null) {
                // Criar Lead automaticamente?
                // lead = new Lead(); ...
                // leadRepository.save(lead);
            } else {
                conversation.setLead(lead);
            }
        }

        // 5. Verificar se mensagem já existe
        String msgId = (String) messageData.get("id");
        WhatsAppMessage message = messageRepository.findByMessageId(msgId)
                .orElse(new WhatsAppMessage());

        message.setConversation(conversation);
        message.setLead(conversation.getLead());
        message.setMessageId(msgId);
        message.setFromMe((Boolean) messageData.get("fromMe"));
        message.setMessageTimestamp((Long) messageData.get("messageTimestamp"));
        message.setStatus("received");

        String messageType = (String) messageData.get("type"); // conversation, imageMessage, etc
        if (messageType != null && (messageType.equals("conversation") || messageType.equals("extendedTextMessage")))
            messageType = "text";
        message.setMessageType(messageType);

        String textContent = (String) messageData.get("text"); // ou content
        if (textContent == null)
            textContent = (String) messageData.get("content");
        message.setContent(textContent);

        // 6. Processar Mídia (S3)
        // Verificar se é imagem, audio, video, document
        if (isMediaType(messageType) && message.getMediaUrl() == null) {
            String mediaUrl = (String) messageData.get("url"); // Url direta se disponível
            String base64 = (String) messageData.get("base64"); // Base64 se disponível

            try {
                byte[] mediaBytes = null;
                String contentType = getContentTypeFromUrl(mediaUrl, messageType);

                if (mediaUrl != null) {
                    // Download via URL
                    mediaBytes = restTemplate.getForObject(mediaUrl, byte[].class);
                } else if (base64 != null) {
                    // Decodificar Base64
                    // Remover prefixo data:mime/type;base64, se existir - comum em webhooks
                    if (base64.contains(",")) {
                        base64 = base64.split(",")[1];
                    }
                    mediaBytes = java.util.Base64.getDecoder().decode(base64);
                }

                if (mediaBytes != null) {
                    String extension = getExtensionFromType(messageType, contentType);
                    String s3Path = "conversations/" + conversation.getId() + "/" + UUID.randomUUID() + extension;
                    String s3Url = storageService.uploadFileBytes("media", s3Path, mediaBytes, contentType);

                    message.setMediaUrl(s3Url);
                    message.setMediaType(messageType);
                }
            } catch (Exception e) {
                log.error("Erro ao processar mídia da mensagem", e);
                message.setContent(message.getContent() + " [Erro ao processar mídia]");
            }
        }

        // Salvar mensagem
        message = messageRepository.save(message);

        // Atualizar conversa
        conversation.setLastMessageText(message.getContent() != null ? message.getContent() : "[" + messageType + "]");
        conversation.setLastMessageTimestamp(message.getMessageTimestamp());

        // Só incrementa não lidas se não for mensagem enviada por nós
        if (!Boolean.TRUE.equals(message.getFromMe())) {
            conversation.setUnreadCount(conversation.getUnreadCount() + 1);
        }
        conversationRepository.save(conversation);

        // Enviar WebSocket
        sendWebSocketUpdate(company.getId(), message, conversation);
    }

    private boolean isMediaType(String type) {
        return type != null && (type.contains("image") || type.contains("audio") || type.contains("video")
                || type.contains("document") || type.contains("sticker"));
    }

    private String getContentTypeFromUrl(String url, String type) {
        if (type.contains("image"))
            return "image/jpeg";
        if (type.contains("audio"))
            return "audio/mp3";
        if (type.contains("video"))
            return "video/mp4";
        return "application/octet-stream";
    }

    private String getExtensionFromType(String type, String contentType) {
        if (type.contains("image"))
            return ".jpg";
        if (type.contains("audio"))
            return ".mp3";
        if (type.contains("video"))
            return ".mp4";
        return ".dat";
    }

    /**
     * Converte entidade para DTO
     * 
     * @Value("${uazap.default-token:}")
     * private String defaultToken;
     * 
     * /**
     * Envia uma mensagem de texto via WhatsApp
     */
    @Transactional
    public WhatsAppMessageResponse sendMessage(SendWhatsAppMessageRequest request, User user) {
        Company company = user.getCompany();
        if (company == null) {
            throw new RuntimeException("Usuário não possui empresa associada");
        }

        // Associar lead se fornecido
        Lead lead = null;
        if (request.getLeadId() != null) {
            lead = leadRepository.findById(request.getLeadId())
                    .orElseThrow(() -> new RuntimeException("Lead não encontrado"));
        }

        // Enviar mensagem via Uazap
        WhatsAppMessage message = uazapService.sendTextMessage(request, company);

        // Associar lead à mensagem e conversa
        if (lead != null) {
            message.setLead(lead);
            message = messageRepository.save(message);

            WhatsAppConversation conversation = message.getConversation();
            if (conversation.getLead() == null) {
                conversation.setLead(lead);
                conversationRepository.save(conversation);
            }
        }

        // Enviar atualização via WebSocket
        sendWebSocketUpdate(company.getId(), message, message.getConversation());

        return toMessageResponse(message);
    }

    /**
     * Envia uma mensagem de mídia via WhatsApp
     */
    @Transactional
    public WhatsAppMessageResponse sendMediaMessage(com.backend.winai.dto.request.SendMediaMessageRequest request,
            User user) {
        Company company = user.getCompany();
        if (company == null) {
            throw new RuntimeException("Usuário não possui empresa associada");
        }

        // Associar lead se fornecido
        Lead lead = null;
        if (request.getLeadId() != null) {
            lead = leadRepository.findById(request.getLeadId())
                    .orElseThrow(() -> new RuntimeException("Lead não encontrado"));
        }

        // Enviar mensagem via Uazap
        WhatsAppMessage message = uazapService.sendMediaMessage(request, company);

        // Associar lead à mensagem e conversa
        if (lead != null) {
            message.setLead(lead);
            message = messageRepository.save(message);

            WhatsAppConversation conversation = message.getConversation();
            if (conversation.getLead() == null) {
                conversation.setLead(lead);
                conversationRepository.save(conversation);
            }
        }

        // Enviar atualização via WebSocket
        sendWebSocketUpdate(company.getId(), message, message.getConversation());

        return toMessageResponse(message);
    }

    /**
     * Lista todas as conversas do usuário
     */
    @Transactional(readOnly = true)
    public List<WhatsAppConversationResponse> getConversations(User user) {
        Company company = user.getCompany();
        if (company == null) {
            throw new RuntimeException("Usuário não possui empresa associada");
        }

        List<WhatsAppConversation> conversations = conversationRepository
                .findByCompanyAndIsArchivedOrderByLastMessageTimestampDesc(company, false);

        return conversations.stream()
                .map(this::toConversationResponse)
                .collect(Collectors.toList());
    }

    /**
     * Obtém mensagens de uma conversa com paginação
     */
    @Transactional(readOnly = true)
    public List<WhatsAppMessageResponse> getMessages(UUID conversationId, User user, Integer page, Integer limit) {
        Company company = user.getCompany();
        if (company == null) {
            throw new RuntimeException("Usuário não possui empresa associada");
        }

        WhatsAppConversation conversation = conversationRepository.findById(conversationId)
                .orElseThrow(() -> new RuntimeException("Conversa não encontrada"));

        if (!conversation.getCompany().getId().equals(company.getId())) {
            throw new RuntimeException("Conversa não pertence à empresa do usuário");
        }

        if (limit == null || limit <= 0)
            limit = 20;
        if (page == null || page < 0)
            page = 0;

        Pageable pageable = PageRequest.of(page, limit);
        List<WhatsAppMessage> messages = messageRepository.findLatestByConversation(conversation, pageable);

        // Mensagens vêm do banco ordenadas por Timestamp DESC (mais recentes primeiro)
        // Precisamos inverter para ASC (cronológica)
        Collections.reverse(messages);

        return messages.stream()
                .map(this::toMessageResponse)
                .collect(Collectors.toList());
    }

    /**
     * Sobrecarga para compatibilidade (busca todas) - Deprecated
     */
    @Transactional(readOnly = true)
    public List<WhatsAppMessageResponse> getMessages(UUID conversationId, User user) {
        return getMessages(conversationId, user, 0, 1000); // Limite alto padrão
    }

    /**
     * Marca conversa como lida
     */
    @Transactional
    public void markConversationAsRead(UUID conversationId, User user) {
        Company company = user.getCompany();
        if (company == null) {
            throw new RuntimeException("Usuário não possui empresa associada");
        }

        WhatsAppConversation conversation = conversationRepository.findById(conversationId)
                .orElseThrow(() -> new RuntimeException("Conversa não encontrada"));

        if (!conversation.getCompany().getId().equals(company.getId())) {
            throw new RuntimeException("Conversa não pertence à empresa do usuário");
        }

        conversation.setUnreadCount(0);
        conversationRepository.save(conversation);
    }

    /**
     * Arquiva/desarquiva uma conversa
     */
    @Transactional
    public WhatsAppConversationResponse toggleArchive(UUID conversationId, User user, Boolean archive) {
        Company company = user.getCompany();
        if (company == null) {
            throw new RuntimeException("Usuário não possui empresa associada");
        }

        WhatsAppConversation conversation = conversationRepository.findById(conversationId)
                .orElseThrow(() -> new RuntimeException("Conversa não encontrada"));

        if (!conversation.getCompany().getId().equals(company.getId())) {
            throw new RuntimeException("Conversa não pertence à empresa do usuário");
        }

        conversation.setIsArchived(archive != null ? archive : !conversation.getIsArchived());
        conversation = conversationRepository.save(conversation);

        return toConversationResponse(conversation);
    }

    /**
     * Conta conversas não lidas
     */
    @Transactional(readOnly = true)
    public Long getUnreadCount(User user) {
        Company company = user.getCompany();
        if (company == null) {
            return 0L;
        }

        return conversationRepository.countUnreadByCompany(company);
    }

    /**
     * Converte entidade para DTO
     */
    private WhatsAppMessageResponse toMessageResponse(WhatsAppMessage message) {
        return WhatsAppMessageResponse.builder()
                .id(message.getId())
                .conversationId(message.getConversation().getId())
                .leadId(message.getLead() != null ? message.getLead().getId() : null)
                .messageId(message.getMessageId())
                .content(message.getContent())
                .fromMe(message.getFromMe())
                .messageType(message.getMessageType())
                .mediaType(message.getMediaType())
                .mediaUrl(message.getMediaUrl())
                .mediaDuration(message.getMediaDuration())
                .transcription(message.getTranscription())
                .status(message.getStatus())
                .messageTimestamp(message.getMessageTimestamp())
                .createdAt(message.getCreatedAt())
                .build();
    }

    /**
     * Envia atualização via WebSocket
     */
    private void sendWebSocketUpdate(UUID companyId, WhatsAppMessage message, WhatsAppConversation conversation) {
        try {
            WebSocketMessage wsMessage = WebSocketMessage.builder()
                    .type("NEW_MESSAGE")
                    .message(toMessageResponse(message))
                    .conversation(toConversationResponse(conversation))
                    .companyId(companyId)
                    .build();

            messagingTemplate.convertAndSend("/topic/whatsapp/" + companyId, wsMessage);

            WebSocketMessage convUpdate = WebSocketMessage.builder()
                    .type("CONVERSATION_UPDATED")
                    .conversation(toConversationResponse(conversation))
                    .companyId(companyId)
                    .build();

            messagingTemplate.convertAndSend("/topic/whatsapp/conversations/" + companyId, convUpdate);
        } catch (Exception e) {
            log.error("Erro ao enviar mensagem WebSocket", e);
        }
    }

    /**
     * Obtém o status do agente SDR
     */
    @Transactional(readOnly = true)
    public SDRAgentStatusResponse getSDRAgentStatus(User user) {
        if (user == null || user.getCompany() == null) {
            return SDRAgentStatusResponse.builder()
                    .isConnected(false)
                    .status("Desconectado")
                    .lastExecution("Nunca")
                    .contactsToday(0L)
                    .efficiency(0.0)
                    .title("Atendimento SDR")
                    .description("Qualificação automática de leads via WhatsApp e agendamento de reuniões comerciais.")
                    .build();
        }

        // Recarregar a empresa para evitar LazyInitializationException
        final Company company = companyRepository.findById(user.getCompany().getId())
                .orElse(user.getCompany());

        // Obter nome da instância
        String instanceName = conversationRepository.findByCompanyOrderByLastMessageTimestampDesc(company)
                .stream()
                .map(WhatsAppConversation::getUazapInstance)
                .filter(inst -> inst != null && !inst.isEmpty())
                .findFirst()
                .orElse(null);

        if (instanceName == null) {
            instanceName = company.getName().replaceAll("[^a-zA-Z0-9]", "");
        }

        // Verificar status real na API
        boolean isConnected = false;
        String statusText = "Desconectado";

        try {
            List<com.backend.winai.dto.uazap.UazapInstanceDTO> instances = uazapService.fetchInstances();
            log.info("SDR Status Check - Empresa: {}. Procurando por: '{}'. Total instâncias: {}",
                    company.getName(), instanceName, instances.size());

            final String searchName = instanceName.toLowerCase();

            // 1. Tentar match exato primeiro (Mais seguro)
            log.info("Instâncias disponíveis no Uazap: {}",
                    instances.stream()
                            .map(i -> (i.getInstanceName() != null ? i.getInstanceName() : "NULL") + "["
                                    + i.getInstanceId() + "]")
                            .collect(java.util.stream.Collectors.joining(", ")));

            com.backend.winai.dto.uazap.UazapInstanceDTO matchingInstance = instances.stream()
                    .filter(inst -> {
                        String name = inst.getInstanceName() != null ? inst.getInstanceName().toLowerCase() : "";
                        String id = inst.getInstanceId() != null ? inst.getInstanceId().toLowerCase() : "";
                        return name.equals(searchName) || id.equals(searchName);
                    })
                    .findFirst()
                    .orElse(null);

            // 2. Fallback para match parcial se necessário
            if (matchingInstance == null) {
                matchingInstance = instances.stream()
                        .filter(inst -> {
                            String name = inst.getInstanceName() != null ? inst.getInstanceName().toLowerCase() : "";
                            String id = inst.getInstanceId() != null ? inst.getInstanceId().toLowerCase() : "";
                            return name.contains(searchName) || id.contains(searchName);
                        })
                        .findFirst()
                        .orElse(null);
            }

            if (matchingInstance != null) {
                String status = matchingInstance.getStatus() != null ? matchingInstance.getStatus().toLowerCase() : "";
                log.info("Instância encontrada: {} (ID: {}). Status: {}",
                        matchingInstance.getInstanceName(), matchingInstance.getInstanceId(), status);

                // Estados válidos de conexão ativa
                isConnected = "open".equals(status) || "connected".equals(status);

                if (isConnected) {
                    statusText = "Ativo";
                } else {
                    statusText = "Desconectado";
                }
            } else {
                log.warn("Nenhuma instância correspondente encontrada para '{}'", instanceName);
            }
        } catch (Exception e) {
            log.error("Erro ao buscar status real da instância {}: {}", instanceName, e.getMessage());
        }

        if (!isConnected && conversationRepository.findByCompanyOrderByLastMessageTimestampDesc(company).isEmpty()) {
            return SDRAgentStatusResponse.builder()
                    .isConnected(false)
                    .status("Desconectado")
                    .lastExecution("Nunca")
                    .contactsToday(0L)
                    .efficiency(0.0)
                    .title("Atendimento SDR")
                    .description("Qualificação automática de leads via WhatsApp e agendamento de reuniões comerciais.")
                    .build();
        }

        // Calcular início do dia (timestamp em milissegundos)
        LocalDateTime startOfDay = LocalDateTime.now().withHour(0).withMinute(0).withSecond(0).withNano(0);
        long startOfDayTimestamp = startOfDay.atZone(ZoneId.systemDefault()).toInstant().toEpochMilli();

        // Contar mensagens de hoje
        Long messagesToday = messageRepository.countMessagesTodayByCompany(company,
                startOfDayTimestamp);
        if (messagesToday == null) {
            messagesToday = 0L;
        }

        // Obter timestamp da última mensagem
        Long lastMessageTimestamp = messageRepository.findLastMessageTimestampByCompany(company);
        String lastExecution = "Nunca";
        LocalDateTime lastMessageDateTime = null;

        if (lastMessageTimestamp != null && lastMessageTimestamp > 0) {
            lastMessageDateTime = LocalDateTime.ofInstant(Instant.ofEpochMilli(lastMessageTimestamp),
                    ZoneId.systemDefault());
            long minutesAgo = ChronoUnit.MINUTES.between(lastMessageDateTime, LocalDateTime.now());

            if (minutesAgo < 1) {
                lastExecution = "há menos de 1 minuto";
            } else if (minutesAgo < 60) {
                lastExecution = "há " + minutesAgo + " minutos";
            } else {
                long hoursAgo = minutesAgo / 60;
                lastExecution = "há " + hoursAgo + " hora" + (hoursAgo > 1 ? "s" : "");
            }
        }

        // Calcular eficiência real baseada em taxa de resposta (enviadas / recebidas)
        Long sentToday = messageRepository.countMessagesTodayByCompanyAndFromMe(company, true,
                startOfDayTimestamp);
        if (sentToday == null)
            sentToday = 0L;

        double efficiency = 0.0;
        if (messagesToday > 0) {
            long receivedToday = messagesToday - sentToday;
            if (receivedToday > 0) {
                efficiency = ((double) sentToday / receivedToday) * 100.0;
                if (efficiency > 99.9)
                    efficiency = 99.9;
            } else if (sentToday > 0) {
                efficiency = 100.0;
            }
        }

        return SDRAgentStatusResponse.builder().isConnected(isConnected).status(statusText).lastExecution(lastExecution)
                .contactsToday(messagesToday).efficiency(efficiency).lastMessageTimestamp(lastMessageDateTime)
                .title("Atendimento SDR")
                .description("Qualificação automática de leads via WhatsApp e agendamento de reuniões comerciais.")
                .build();
    }

    /**
     * Converte entidade para DTO
     */
    private WhatsAppConversationResponse toConversationResponse(WhatsAppConversation conversation) {
        return WhatsAppConversationResponse.builder()
                .id(conversation.getId())
                .leadId(conversation.getLead() != null ? conversation.getLead().getId() : null)
                .phoneNumber(conversation.getPhoneNumber())
                .waChatId(conversation.getWaChatId())
                .contactName(conversation.getContactName())
                .profilePictureUrl(conversation.getProfilePictureUrl())
                .unreadCount(conversation.getUnreadCount())
                .lastMessageText(conversation.getLastMessageText())
                .lastMessageTimestamp(conversation.getLastMessageTimestamp())
                .isArchived(conversation.getIsArchived())
                .isBlocked(conversation.getIsBlocked())
                .createdAt(conversation.getCreatedAt())
                .updatedAt(conversation.getUpdatedAt())
                .build();
    }

    /**
     * Conecta o Agente SDR (Gera QR Code se necessário)
     */
    public Map<String, Object> connectSDRAgent(User user) {
        Company company = user.getCompany();
        if (company == null)
            throw new RuntimeException("Empresa não encontrada");

        // Buscar a instância configurada no banco (pela primeira conversa associada ou
        // default)
        String instanceName = conversationRepository.findByCompanyOrderByLastMessageTimestampDesc(company)
                .stream()
                .map(WhatsAppConversation::getUazapInstance)
                .filter(inst -> inst != null && !inst.isEmpty())
                .findFirst()
                .orElse(null);

        // Se não houver conversas, tenta usar o default do sistema se houver (quase
        // impossível se o usuário é novo)
        // No futuro, podemos ter uma tabela de instâncias por empresa
        if (instanceName == null) {
            instanceName = company.getName().replaceAll("[^a-zA-Z0-9]", ""); // Normalizar nome para ser usado como
                                                                             // instância
        }

        try {
            Map<String, Object> result = uazapService.connectInstance(instanceName);
            if (result != null && "error".equals(result.get("status"))) {
                log.info("Instância {} retornou erro na conexão, tentando criar...", instanceName);
                createAndConnectInstance(instanceName);
            }
            return result;
        } catch (RuntimeException e) {
            if (e.getMessage() != null && e.getMessage().contains("Instância não encontrada")) {
                log.info("Instância {} não encontrada, criando...", instanceName);
                return createAndConnectInstance(instanceName);
            }
            throw e;
        }
    }

    private Map<String, Object> createAndConnectInstance(String instanceName) {
        // Criar instância
        com.backend.winai.dto.request.CreateUazapInstanceRequest createRequest = com.backend.winai.dto.request.CreateUazapInstanceRequest
                .builder()
                .instanceName(instanceName)
                .qrcode(true)
                .integration("WHATSAPP-BAILEYS")
                .build();

        uazapService.createInstance(createRequest);

        // Tentar conectar novamente
        return uazapService.connectInstance(instanceName);
    }

    /**
     * Desconecta o Agente SDR
     */
    public void disconnectSDRAgent(User user) {
        Company company = user.getCompany();
        if (company == null)
            throw new RuntimeException("Empresa não encontrada");

        String instanceName = conversationRepository.findByCompanyOrderByLastMessageTimestampDesc(company)
                .stream()
                .map(WhatsAppConversation::getUazapInstance)
                .filter(inst -> inst != null && !inst.isEmpty())
                .findFirst()
                .orElse(null);

        if (instanceName != null) {
            uazapService.disconnectInstance(instanceName);
        }
    }
}
