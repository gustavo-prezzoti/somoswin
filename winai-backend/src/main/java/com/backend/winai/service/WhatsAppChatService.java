package com.backend.winai.service;

import com.backend.winai.dto.request.SendMediaMessageRequest;
import com.backend.winai.dto.request.SendWhatsAppMessageRequest;
import com.backend.winai.dto.response.WhatsAppConversationResponse;
import com.backend.winai.dto.response.WhatsAppMessageResponse;
import com.backend.winai.entity.Company;
import com.backend.winai.entity.Lead;
import com.backend.winai.entity.WhatsAppConversation;
import com.backend.winai.entity.WhatsAppMessage;
import com.backend.winai.repository.CompanyRepository;
import com.backend.winai.repository.LeadRepository;
import com.backend.winai.repository.WhatsAppConversationRepository;
import com.backend.winai.repository.WhatsAppMessageRepository;
import com.backend.winai.repository.UserWhatsAppConnectionRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.util.Collections;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class WhatsAppChatService {

        private final WhatsAppConversationRepository conversationRepository;
        private final WhatsAppMessageRepository messageRepository;
        private final CompanyRepository companyRepository;
        private final LeadRepository leadRepository;
        private final UazapService uazapService;
        private final SupabaseStorageService supabaseStorageService;
        private final UserWhatsAppConnectionRepository userWhatsAppConnectionRepository;

        /**
         * Busca todas as conversas de uma empresa
         */
        public List<WhatsAppConversationResponse> getConversationsByCompany(UUID companyId, Boolean includeMessages) {
                Company company = companyRepository.findById(companyId)
                                .orElseThrow(() -> new RuntimeException("Company not found"));

                List<WhatsAppConversation> conversations = conversationRepository
                                .findByCompanyOrderByLastMessageTimestampDesc(company);

                return conversations.stream()
                                .map(conv -> mapToConversationResponse(conv, includeMessages))
                                .collect(Collectors.toList());
        }

        /**
         * Busca conversas filtradas pelas conexões do WhatsApp do usuário
         * Retorna apenas conversas das instâncias que o usuário tem acesso
         */
        public List<WhatsAppConversationResponse> getConversationsByUserConnections(UUID userId, UUID companyId,
                        Boolean includeMessages) {
                Company company = companyRepository.findById(companyId)
                                .orElseThrow(() -> new RuntimeException("Company not found"));

                // Busca os nomes das instâncias que a empresa tem acesso
                List<String> companyInstanceNames = userWhatsAppConnectionRepository
                                .findInstanceNamesByCompanyId(companyId);

                // Se o usuário não tem nenhuma conexão, retorna lista vazia
                if (companyInstanceNames.isEmpty()) {
                        return List.of();
                }

                // Busca todas as conversas da empresa (já ordenadas)
                List<WhatsAppConversation> allConversations = conversationRepository
                                .findByCompanyOrderByLastMessageTimestampDesc(company);

                // Filtra apenas as conversas das instâncias que o usuário tem acesso
                return allConversations.stream()
                                .filter(conv -> companyInstanceNames.contains(conv.getUazapInstance()))
                                .map(conv -> mapToConversationResponse(conv, includeMessages))
                                .collect(Collectors.toList());
        }

        /**
         * Busca uma conversa específica por ID
         */
        public WhatsAppConversationResponse getConversationById(UUID conversationId, Boolean includeMessages) {
                WhatsAppConversation conversation = conversationRepository.findById(conversationId)
                                .orElseThrow(() -> new RuntimeException("Conversation not found"));

                return mapToConversationResponse(conversation, includeMessages);
        }

        /**
         * Busca mensagens de uma conversa
         */
        /**
         * Busca mensagens de uma conversa com paginação
         */
        public List<WhatsAppMessageResponse> getMessagesByConversation(UUID conversationId, Integer page,
                        Integer limit) {
                WhatsAppConversation conversation = conversationRepository.findById(conversationId)
                                .orElseThrow(() -> new RuntimeException("Conversation not found"));

                if (limit == null || limit <= 0)
                        limit = 20;
                if (page == null || page < 0)
                        page = 0;

                Pageable pageable = PageRequest.of(page, limit);
                List<WhatsAppMessage> messages = messageRepository.findLatestByConversation(conversation, pageable);

                // Mensagens vêm do banco ordenadas por Timestamp DESC (mais recentes primeiro)
                // Precisamos inverter para ASC (cronológica) para o frontend exibir
                // corretamente de cima para baixo
                Collections.reverse(messages);

                return messages.stream()
                                .map(this::mapToMessageResponse)
                                .collect(Collectors.toList());
        }

        /**
         * Busca mensagens por lead
         */
        public List<WhatsAppMessageResponse> getMessagesByLead(UUID leadId) {
                List<WhatsAppMessage> messages = messageRepository.findByLeadId(leadId);
                return messages.stream()
                                .map(this::mapToMessageResponse)
                                .collect(Collectors.toList());
        }

        /**
         * Envia mensagem de texto
         */
        @Transactional
        public WhatsAppMessageResponse sendTextMessage(SendWhatsAppMessageRequest request, UUID companyId) {
                Company company = companyRepository.findById(companyId)
                                .orElseThrow(() -> new RuntimeException("Company not found"));

                WhatsAppMessage message = uazapService.sendTextMessage(request, company);

                // Associar lead se fornecido
                if (request.getLeadId() != null) {
                        Lead lead = leadRepository.findById(request.getLeadId())
                                        .orElseThrow(() -> new RuntimeException("Lead not found"));
                        message.setLead(lead);
                        messageRepository.save(message);
                }

                return mapToMessageResponse(message);
        }

        /**
         * Envia mensagem de mídia (com upload para Supabase)
         */
        @Transactional
        public WhatsAppMessageResponse sendMediaMessage(
                        String phoneNumber,
                        UUID leadId,
                        String caption,
                        String mediaType,
                        MultipartFile file,
                        UUID companyId,
                        Boolean ptt) {

                Company company = companyRepository.findById(companyId)
                                .orElseThrow(() -> new RuntimeException("Company not found"));

                try {
                        // 0. Buscar instância existente para este número
                        String uazapInstance = null;
                        List<WhatsAppConversation> existingConversations = conversationRepository
                                        .findByCompanyOrderByLastMessageTimestampDesc(company);

                        // Procurar por conversa com o mesmo telefone
                        for (WhatsAppConversation conv : existingConversations) {
                                if (conv.getPhoneNumber() != null && conv.getPhoneNumber().contains(phoneNumber)
                                                || (phoneNumber != null
                                                                && phoneNumber.contains(conv.getPhoneNumber()))) {
                                        if (conv.getUazapInstance() != null && !conv.getUazapInstance().isEmpty()) {
                                                uazapInstance = conv.getUazapInstance();
                                                log.debug("Usando instância existente para enviar mídia: {}",
                                                                conv.getUazapInstance());
                                                break;
                                        }
                                }
                        }

                        // Se ainda não temos instância, usar a primeira disponível da empresa
                        if (uazapInstance == null) {
                                for (WhatsAppConversation conv : existingConversations) {
                                        if (conv.getUazapInstance() != null && !conv.getUazapInstance().isEmpty()) {
                                                uazapInstance = conv.getUazapInstance();
                                                log.debug("Usando primeira instância disponível para mídia: {}",
                                                                conv.getUazapInstance());
                                                break;
                                        }
                                }
                        }

                        // 1. Upload do arquivo para o Supabase Storage (Histórico)
                        String bucket = "whatsapp-media";
                        String folder = companyId.toString() + "/" + phoneNumber;
                        String fileName = System.currentTimeMillis() + "_" + file.getOriginalFilename();
                        String filePath = folder + "/" + fileName;

                        String mediaUrl = supabaseStorageService.uploadFile(bucket, filePath, file);
                        log.info("Arquivo enviado para Supabase: {}", mediaUrl);

                        // 2. Preparar requisição para enviar via UaZap
                        SendMediaMessageRequest request = SendMediaMessageRequest.builder()
                                        .phoneNumber(phoneNumber)
                                        .leadId(leadId)
                                        .caption(caption)
                                        .mediaUrl(mediaUrl)
                                        .mediaType(mediaType)
                                        .fileName(file.getOriginalFilename())
                                        .mimeType(file.getContentType())
                                        .ptt(ptt)
                                        .uazapInstance(uazapInstance)
                                        .build();

                        // 3. Enviar mensagem via UaZap (com arquivo físico) by passing file bytes
                        byte[] fileBytes = file.getBytes();
                        WhatsAppMessage message = uazapService.sendMediaMessage(request, company, fileBytes);

                        // 4. Associar lead se fornecido
                        if (leadId != null) {
                                Lead lead = leadRepository.findById(leadId)
                                                .orElseThrow(() -> new RuntimeException("Lead not found"));
                                message.setLead(lead);
                                messageRepository.save(message);
                        }

                        return mapToMessageResponse(message);

                } catch (Exception e) {
                        log.error("Erro ao enviar mensagem de mídia", e);
                        throw new RuntimeException("Erro ao enviar mensagem de mídia: " + e.getMessage(), e);
                }
        }

        /**
         * Envia mensagem de mídia a partir de URL externa (sem upload)
         */
        @Transactional
        public WhatsAppMessageResponse sendMediaMessageFromUrl(SendMediaMessageRequest request, UUID companyId) {
                Company company = companyRepository.findById(companyId)
                                .orElseThrow(() -> new RuntimeException("Company not found"));

                WhatsAppMessage message = uazapService.sendMediaMessage(request, company);

                // Associar lead se fornecido
                if (request.getLeadId() != null) {
                        Lead lead = leadRepository.findById(request.getLeadId())
                                        .orElseThrow(() -> new RuntimeException("Lead not found"));
                        message.setLead(lead);
                        messageRepository.save(message);
                }

                return mapToMessageResponse(message);
        }

        /**
         * Marca mensagens como lidas
         */
        @Transactional
        public void markConversationAsRead(UUID conversationId) {
                WhatsAppConversation conversation = conversationRepository.findById(conversationId)
                                .orElseThrow(() -> new RuntimeException("Conversation not found"));

                conversation.setUnreadCount(0);
                conversationRepository.save(conversation);
        }

        /**
         * Arquiva/desarquiva uma conversa
         */
        @Transactional
        public void toggleArchiveConversation(UUID conversationId) {
                WhatsAppConversation conversation = conversationRepository.findById(conversationId)
                                .orElseThrow(() -> new RuntimeException("Conversation not found"));

                conversation.setIsArchived(!conversation.getIsArchived());
                conversationRepository.save(conversation);
        }

        /**
         * Bloqueia/desbloqueia uma conversa
         */
        @Transactional
        public void toggleBlockConversation(UUID conversationId) {
                WhatsAppConversation conversation = conversationRepository.findById(conversationId)
                                .orElseThrow(() -> new RuntimeException("Conversation not found"));

                conversation.setIsBlocked(!conversation.getIsBlocked());
                conversationRepository.save(conversation);
        }

        /**
         * Alterna o modo de suporte (IA/HUMAN) de uma conversa
         */
        @Transactional
        public WhatsAppConversationResponse toggleSupportMode(UUID conversationId, String mode) {
                WhatsAppConversation conversation = conversationRepository.findById(conversationId)
                                .orElseThrow(() -> new RuntimeException("Conversation not found"));

                // Validar modo
                if (!mode.equals("IA") && !mode.equals("HUMAN")) {
                        throw new IllegalArgumentException("Modo inválido. Use 'IA' ou 'HUMAN'");
                }

                conversation.setSupportMode(mode);
                conversationRepository.save(conversation);

                return mapToConversationResponse(conversation, false);
        }

        // ========== Métodos auxiliares de mapeamento ==========

        private WhatsAppConversationResponse mapToConversationResponse(WhatsAppConversation conversation,
                        Boolean includeMessages) {
                WhatsAppConversationResponse response = WhatsAppConversationResponse.builder()
                                .id(conversation.getId())
                                .companyId(conversation.getCompany().getId())
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
                                .uazapInstance(conversation.getUazapInstance())
                                .supportMode(conversation.getSupportMode())
                                .createdAt(conversation.getCreatedAt())
                                .updatedAt(conversation.getUpdatedAt())
                                .build();

                if (includeMessages != null && includeMessages) {
                        Pageable pageable = PageRequest.of(0, 50); // Últimas 50 mensagens
                        List<WhatsAppMessage> messages = messageRepository.findLatestByConversation(conversation,
                                        pageable);
                        response.setRecentMessages(
                                        messages.stream()
                                                        .map(this::mapToMessageResponse)
                                                        .collect(Collectors.toList()));
                }

                return response;
        }

        private WhatsAppMessageResponse mapToMessageResponse(WhatsAppMessage message) {
                return WhatsAppMessageResponse.builder()
                                .id(message.getId())
                                .messageId(message.getMessageId())
                                .content(message.getContent())
                                .fromMe(message.getFromMe())
                                .messageType(message.getMessageType())
                                .mediaType(message.getMediaType())
                                .mediaUrl(message.getMediaUrl())
                                .messageTimestamp(message.getMessageTimestamp())
                                .status(message.getStatus())
                                .isGroup(message.getIsGroup())
                                .quotedMessageId(message.getQuotedMessageId())
                                .transcription(message.getTranscription())
                                .createdAt(message.getCreatedAt())
                                .conversationId(message.getConversation().getId())
                                .leadId(message.getLead() != null ? message.getLead().getId() : null)
                                .phoneNumber(message.getConversation().getPhoneNumber())
                                .contactName(message.getConversation().getContactName())
                                .build();
        }
}
