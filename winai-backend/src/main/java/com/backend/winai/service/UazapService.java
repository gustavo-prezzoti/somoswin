package com.backend.winai.service;

import com.backend.winai.dto.request.SendWhatsAppMessageRequest;
import com.backend.winai.entity.Company;
import com.backend.winai.entity.WhatsAppConversation;
import com.backend.winai.entity.WhatsAppMessage;
import com.backend.winai.repository.WhatsAppConversationRepository;
import com.backend.winai.repository.WhatsAppMessageRepository;
import com.backend.winai.repository.UserWhatsAppConnectionRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.client.RestTemplate;

import com.backend.winai.dto.uazap.UazapInstanceDTO;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Collections;
import java.util.UUID;
import org.springframework.core.ParameterizedTypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.core.type.TypeReference;
import java.util.ArrayList;

@Service
@RequiredArgsConstructor
@Slf4j
public class UazapService {

    private final WhatsAppConversationRepository conversationRepository;
    private final WhatsAppMessageRepository messageRepository;
    private final UserWhatsAppConnectionRepository userWhatsAppConnectionRepository;
    private final RestTemplate restTemplate; // Injetado com timeout configurado

    @Value("${uazap.default-base-url}")
    private String defaultBaseUrl;

    @Value("${uazap.default-token:}")
    private String defaultToken;

    @Value("${uazap.default-instance:}")
    private String defaultInstance;

    @Value("${uazap.admin-token:}")
    private String adminToken;

    /**
     * Envia uma mensagem de texto via Uazap
     */
    @Transactional
    public WhatsAppMessage sendTextMessage(SendWhatsAppMessageRequest request, Company company) {
        log.info("=== [SEND TEXT MESSAGE] Iniciando envio ===");
        log.info("  PhoneNumber: {}", request.getPhoneNumber());
        log.info("  Company: {} (ID: {})", company != null ? company.getName() : "NULL",
                company != null ? company.getId() : "NULL");
        log.info("  Request uazapInstance: {}", request.getUazapInstance());
        log.info("  Request uazapBaseUrl: {}", request.getUazapBaseUrl());
        log.info("  Request uazapToken: {}", request.getUazapToken() != null ? "[PRESENTE]" : "[AUSENTE]");

        // STEP 1: Determinar credenciais - PRIORIDADE ABSOLUTA para o request
        String baseUrl = null;
        String token = null;
        String instance = null;

        // PRIMEIRO: Tentar usar credenciais do request DTO (passadas explicitamente)
        if (request.getUazapBaseUrl() != null && !request.getUazapBaseUrl().isEmpty()) {
            baseUrl = request.getUazapBaseUrl();
            log.info("  [STEP1] baseUrl definido pelo REQUEST DTO: {}", baseUrl);
        }
        if (request.getUazapToken() != null && !request.getUazapToken().isEmpty()) {
            token = request.getUazapToken();
            log.info("  [STEP1] token definido pelo REQUEST DTO: [PRESENTE]");
        }
        if (request.getUazapInstance() != null && !request.getUazapInstance().isEmpty()) {
            instance = request.getUazapInstance();
            log.info("  [STEP1] instance definido pelo REQUEST DTO: {}", instance);
        }

        // SEGUNDO: Se faltam credenciais, buscar da conexão da empresa
        if (baseUrl == null || token == null) {
            log.info("  [STEP2] Credenciais incompletas no request, buscando da conexão da empresa...");
            if (company != null) {
                List<com.backend.winai.entity.UserWhatsAppConnection> connections = userWhatsAppConnectionRepository
                        .findByCompanyId(company.getId());
                log.info("  [STEP2] Encontradas {} conexões para empresa {}", connections.size(), company.getId());

                com.backend.winai.entity.UserWhatsAppConnection selectedConn = null;

                // Se temos instanceName, buscar exatamente ela
                if (instance != null && !instance.isEmpty()) {
                    final String instanceToFind = instance;
                    selectedConn = connections.stream()
                            .filter(c -> instanceToFind.equals(c.getInstanceName()))
                            .findFirst()
                            .orElse(null);
                    log.info("  [STEP2] Busca por instanceName '{}': {}", instance,
                            selectedConn != null ? "ENCONTRADA" : "NÃO ENCONTRADA");
                }

                // Se não encontrou por instanceName, pegar a primeira ativa
                if (selectedConn == null) {
                    selectedConn = connections.stream()
                            .filter(c -> Boolean.TRUE.equals(c.getIsActive()))
                            .findFirst()
                            .orElse(null);
                    log.info("  [STEP2] Busca por primeira ativa: {}",
                            selectedConn != null ? "ENCONTRADA (" + selectedConn.getInstanceName() + ")"
                                    : "NÃO ENCONTRADA");
                }

                if (selectedConn != null) {
                    if (baseUrl == null && selectedConn.getInstanceBaseUrl() != null) {
                        baseUrl = selectedConn.getInstanceBaseUrl();
                        log.info("  [STEP2] baseUrl definido pela CONEXÃO: {}", baseUrl);
                    }
                    if (token == null && selectedConn.getInstanceToken() != null) {
                        token = selectedConn.getInstanceToken();
                        log.info("  [STEP2] token definido pela CONEXÃO: [PRESENTE]");
                    }
                    if (instance == null && selectedConn.getInstanceName() != null) {
                        instance = selectedConn.getInstanceName();
                        log.info("  [STEP2] instance definido pela CONEXÃO: {}", instance);
                    }

                    // STEP 2.5: Se a conexão foi encontrada MAS as credenciais estão NULL,
                    // buscar da API UaZap e atualizar a conexão no banco
                    if ((baseUrl == null || token == null) && selectedConn.getInstanceName() != null) {
                        log.info("  [STEP2.5] Credenciais NULL na conexão, buscando da API UaZap...");
                        try {
                            List<UazapInstanceDTO> instances = fetchInstances();
                            final String connInstanceName = selectedConn.getInstanceName();
                            UazapInstanceDTO matchingInstance = instances.stream()
                                    .filter(i -> connInstanceName.equals(i.getInstanceName()))
                                    .findFirst()
                                    .orElse(null);

                            if (matchingInstance != null) {
                                log.info("  [STEP2.5] Instância {} encontrada na API UaZap", connInstanceName);

                                // Usar baseUrl padrão (a mesma do servidor UaZap)
                                if (baseUrl == null) {
                                    baseUrl = defaultBaseUrl;
                                    log.info("  [STEP2.5] baseUrl definido pelo DEFAULT (mesma da API): {}", baseUrl);
                                    selectedConn.setInstanceBaseUrl(baseUrl);
                                }

                                // Usar token da instância
                                if (token == null && matchingInstance.getToken() != null) {
                                    token = matchingInstance.getToken();
                                    log.info("  [STEP2.5] token definido pela API UaZap: [PRESENTE]");
                                    selectedConn.setInstanceToken(token);
                                }

                                // Persistir a atualização para futuras chamadas
                                userWhatsAppConnectionRepository.save(selectedConn);
                                log.info("  [STEP2.5] Conexão atualizada no banco de dados com credenciais da API");
                            } else {
                                log.warn("  [STEP2.5] Instância {} NÃO encontrada na API UaZap", connInstanceName);
                            }
                        } catch (Exception e) {
                            log.error("  [STEP2.5] Erro ao buscar credenciais da API UaZap: {}", e.getMessage());
                        }
                    }
                } else {
                    log.warn("  [STEP2] NENHUMA conexão encontrada para a empresa!");
                }
            } else {
                log.warn("  [STEP2] Company é NULL, não é possível buscar conexão!");
            }
        }

        // TERCEIRO: Se ainda faltam credenciais, logar erro mas usar defaults (para não
        // quebrar)
        if (baseUrl == null || baseUrl.isEmpty()) {
            log.error("  [STEP3] baseUrl AINDA VAZIO! Usando default: {}", defaultBaseUrl);
            baseUrl = defaultBaseUrl;
        }
        if (token == null || token.isEmpty()) {
            log.error("  [STEP3] token AINDA VAZIO! Usando default: [PRESENTE]");
            token = defaultToken;
        }

        log.info("=== [CREDENCIAIS FINAIS] baseUrl={}, token=[{}], instance={} ===",
                baseUrl, token != null ? "PRESENTE" : "AUSENTE", instance);

        // Build config for findOrCreateConversation
        Map<String, String> config = new HashMap<>();
        config.put("baseUrl", baseUrl);
        config.put("token", token);
        config.put("instance", instance != null ? instance : "");

        // Buscar ou criar conversa
        WhatsAppConversation conversation = findOrCreateConversation(
                request.getPhoneNumber(),
                company,
                config);

        String url = baseUrl.replaceAll("/$", "") + "/send/text";
        log.info("  [SEND] URL final: {}", url);

        // Headers
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        headers.set("Accept", "application/json");
        // Usar adminToken para autenticação administrativa
        headers.set("admintoken", adminToken);
        headers.set("apikey", adminToken);
        headers.set("token", token);

        // Body
        Map<String, String> body = new HashMap<>();
        body.put("number", request.getPhoneNumber());
        body.put("text", request.getMessage());

        HttpEntity<Map<String, String>> requestEntity = new HttpEntity<>(body, headers);

        try {
            // Enviar mensagem via Uazap API
            @SuppressWarnings("unchecked")
            ResponseEntity<Map<String, Object>> response = restTemplate.exchange(
                    url,
                    HttpMethod.POST,
                    requestEntity,
                    (Class<Map<String, Object>>) (Class<?>) Map.class);

            if (response.getStatusCode().is2xxSuccessful()) {
                Map<String, Object> responseBody = response.getBody();
                String messageId = extractMessageId(responseBody);

                // Salvar mensagem no banco
                WhatsAppMessage message = WhatsAppMessage.builder()
                        .conversation(conversation)
                        .content(request.getMessage())
                        .fromMe(true)
                        .messageType("text")
                        .messageTimestamp(System.currentTimeMillis())
                        .status("sent")
                        .messageId(messageId)
                        .build();

                if (request.getLeadId() != null) {
                    // Associar lead se fornecido
                    // message.setLead(...); // Será feito no service que chama este método
                }

                message = messageRepository.save(message);

                // Atualizar última mensagem da conversa
                conversation.setLastMessageText(request.getMessage());
                conversation.setLastMessageTimestamp(System.currentTimeMillis());
                conversationRepository.save(conversation);

                log.info("Mensagem enviada com sucesso via Uazap. MessageId: {}, Phone: {}", messageId,
                        request.getPhoneNumber());
                return message;
            } else {
                log.error("Erro ao enviar mensagem via Uazap. Status: {}, Body: {}", response.getStatusCode(),
                        response.getBody());
                throw new RuntimeException("Erro ao enviar mensagem via Uazap");
            }
        } catch (Exception e) {
            log.error("Erro ao enviar mensagem via Uazap", e);
            throw new RuntimeException("Erro ao enviar mensagem via Uazap: " + e.getMessage(), e);
        }
    }

    /**
     * Busca ou cria uma conversa
     */
    private WhatsAppConversation findOrCreateConversation(
            String phoneNumber,
            Company company,
            Map<String, String> uazapConfig) {
        String instanceName = uazapConfig.get("instance");

        if (instanceName != null && !instanceName.isEmpty()) {
            return conversationRepository
                    .findByPhoneNumberAndCompanyAndUazapInstance(phoneNumber, company, instanceName)
                    .orElseGet(() -> {
                        WhatsAppConversation newConversation = WhatsAppConversation.builder()
                                .company(company)
                                .phoneNumber(phoneNumber)
                                .uazapBaseUrl(uazapConfig.get("baseUrl"))
                                .uazapToken(uazapConfig.get("token"))
                                .uazapInstance(instanceName)
                                .unreadCount(0)
                                .isArchived(false)
                                .isBlocked(false)
                                .build();
                        return conversationRepository.save(newConversation);
                    });
        }

        // Fallback para busca sem instância (apenas quando instância não está
        // configurada)
        return conversationRepository.findByPhoneNumberAndCompany(phoneNumber, company)
                .orElseGet(() -> {
                    WhatsAppConversation newConversation = WhatsAppConversation.builder()
                            .company(company)
                            .phoneNumber(phoneNumber)
                            .uazapBaseUrl(uazapConfig.get("baseUrl"))
                            .uazapToken(uazapConfig.get("token"))
                            .uazapInstance(uazapConfig.get("instance"))
                            .unreadCount(0)
                            .isArchived(false)
                            .isBlocked(false)
                            .build();
                    return conversationRepository.save(newConversation);
                });
    }

    /**
     * Envia uma mensagem de texto simples via Uazap (usado por AI Agent)
     */
    public void sendTextMessage(String phoneNumber, String message, String baseUrl, String token) {
        String url = baseUrl.replaceAll("/$", "") + "/send/text";

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        headers.set("Accept", "application/json");
        headers.set("admintoken", adminToken);
        headers.set("apikey", adminToken);
        headers.set("token", token);

        Map<String, String> body = new HashMap<>();
        body.put("number", phoneNumber);
        body.put("text", message);

        HttpEntity<Map<String, String>> requestEntity = new HttpEntity<>(body, headers);

        int maxRetries = 3;
        int delayMs = 4000; // 4 segundos entre tentativas

        for (int attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                @SuppressWarnings("unchecked")
                ResponseEntity<Map<String, Object>> response = restTemplate.exchange(
                        url,
                        HttpMethod.POST,
                        requestEntity,
                        (Class<Map<String, Object>>) (Class<?>) Map.class);

                if (response.getStatusCode().is2xxSuccessful()) {
                    log.info("Mensagem da IA enviada com sucesso para: {} (Tentativa {})", phoneNumber, attempt);
                    return; // Sucesso!
                } else {
                    log.error("Falha ao enviar mensagem de IA. Status: {}. Tentativa {}/{}",
                            response.getStatusCode(), attempt, maxRetries);
                }
            } catch (Exception e) {
                String errorMsg = e.getMessage() != null ? e.getMessage() : "";
                log.warn("Tentativa {}/{} falhou para {}: {}", attempt, maxRetries, phoneNumber, errorMsg);

                // Se for erro de desconexão ou servidor indisponível, vale a pena tentar de
                // novo
                if (attempt < maxRetries && (errorMsg.contains("disconnected") || errorMsg.contains("503")
                        || errorMsg.contains("500"))) {
                    try {
                        log.info("Aguardando {}ms para re-tentativa devido a desconexão temporária...", delayMs);
                        Thread.sleep(delayMs);
                    } catch (InterruptedException ie) {
                        Thread.currentThread().interrupt();
                        break;
                    }
                } else {
                    // Se for outro erro ou já esgotou as tentativas, joga a exceção
                    if (attempt == maxRetries) {
                        log.error("Esgotadas as tentativas de envio para {}", phoneNumber);
                        throw new RuntimeException(
                                "Erro ao enviar mensagem de IA após " + maxRetries + " tentativas: " + e.getMessage(),
                                e);
                    }
                }
            }
        }
    }

    /**
     * Define o status de presença (typing, recorded, available, unavailable)
     */
    public void setPresence(String phoneNumber, String presence, String baseUrl, String token, String instanceName) {
        if (baseUrl == null || token == null || phoneNumber == null) {
            return;
        }

        try {
            // Ajuste para endpoint correto da Evolution API / Uazap
            // Versões recentes: /chat/sendPresence/{instance} ou /chat/sendPresence

            String url;
            if (instanceName != null && !instanceName.isEmpty()) {
                // Se tem instanceName, usa o padrão mais robusto da Evolution
                url = baseUrl.replaceAll("/$", "") + "/chat/sendPresence/" + instanceName;
            } else {
                // Fallback legado
                url = baseUrl.replaceAll("/$", "") + "/chat/sendPresence";
            }

            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            headers.set("token", token);
            headers.set("apikey", adminToken);

            Map<String, Object> body = new HashMap<>();
            body.put("number", phoneNumber);
            body.put("presence", presence); // "composing" para digitando
            // Adicionar delay opcional se for composing, ajuda a manter o status
            if ("composing".equals(presence)) {
                body.put("delay", 10000); // 10s
            }

            HttpEntity<Map<String, Object>> requestEntity = new HttpEntity<>(body, headers);

            restTemplate.exchange(url, HttpMethod.POST, requestEntity, Map.class);
            log.debug("Presença '{}' enviada para {} (URL: {})", presence, phoneNumber, url);
        } catch (Exception e) {
            // Fallback silencioso para endpoint antigo se o novo falhar (404)
            try {
                if (e.getMessage() != null && e.getMessage().contains("404")) {
                    String fallbackUrl = baseUrl.replaceAll("/$", "") + "/chat/presence";
                    if (instanceName != null && !instanceName.isEmpty()) {
                        fallbackUrl += "/" + instanceName;
                    }

                    HttpHeaders headers = new HttpHeaders();
                    headers.setContentType(MediaType.APPLICATION_JSON);
                    headers.set("token", token);
                    headers.set("apikey", adminToken);

                    Map<String, Object> body = new HashMap<>();
                    body.put("number", phoneNumber);
                    body.put("presence", presence);

                    HttpEntity<Map<String, Object>> requestEntity = new HttpEntity<>(body, headers);
                    restTemplate.exchange(fallbackUrl, HttpMethod.POST, requestEntity, Map.class);
                    log.debug("Fallback de presença executado com sucesso para {}", phoneNumber);
                    return;
                }
            } catch (Exception ex2) {
                // Ignorar erro do fallback
            }

            log.warn("Erro ao definir presença para {}: {}", phoneNumber, e.getMessage());
        }
    }

    /**
     * Fallback for older calls without instanceName (deprecated)
     */
    public void setPresence(String phoneNumber, String presence, String baseUrl, String token) {
        setPresence(phoneNumber, presence, baseUrl, token, null);
    }

    /**
     * Extrai o ID da mensagem da resposta do Uazap
     */
    private String extractMessageId(Map<String, Object> responseBody) {
        if (responseBody == null) {
            return UUID.randomUUID().toString();
        }

        // Tentar diferentes campos possíveis
        if (responseBody.containsKey("id")) {
            return responseBody.get("id").toString();
        }
        if (responseBody.containsKey("messageId")) {
            return responseBody.get("messageId").toString();
        }
        if (responseBody.containsKey("message_id")) {
            return responseBody.get("message_id").toString();
        }

        return UUID.randomUUID().toString();
    }

    /**
     * Obtém configuração do Uazap (pode ser por company ou usar defaults)
     */
    private Map<String, String> getUazapConfig(Company company) {
        return getUazapConfig(company, null);
    }

    private Map<String, String> getUazapConfig(Company company, String instanceName) {
        Map<String, String> config = new HashMap<>();
        config.put("baseUrl", defaultBaseUrl);
        config.put("token", defaultToken);
        config.put("instance", defaultInstance);

        if (company != null) {
            // Tentar encontrar conexão da empresa
            List<com.backend.winai.entity.UserWhatsAppConnection> connections = userWhatsAppConnectionRepository
                    .findByCompanyId(company.getId());

            com.backend.winai.entity.UserWhatsAppConnection selectedConn = null;

            if (instanceName != null && !instanceName.isEmpty()) {
                // Se instância foi pedida, buscar especificamente ela
                selectedConn = connections.stream()
                        .filter(c -> instanceName.equals(c.getInstanceName()))
                        .findFirst()
                        .orElse(null);
            }

            if (selectedConn == null) {
                // Fallback: primeira ativa
                selectedConn = connections.stream()
                        .filter(c -> Boolean.TRUE.equals(c.getIsActive()))
                        .findFirst()
                        .orElse(null);
            }

            if (selectedConn != null) {
                if (selectedConn.getInstanceBaseUrl() != null)
                    config.put("baseUrl", selectedConn.getInstanceBaseUrl());
                if (selectedConn.getInstanceToken() != null)
                    config.put("token", selectedConn.getInstanceToken());
                if (selectedConn.getInstanceName() != null)
                    config.put("instance", selectedConn.getInstanceName());
            }
        }

        return config;
    }

    /**
     * Busca as instâncias disponíveis no UaZap (Evolution API)
     */
    public List<UazapInstanceDTO> fetchInstances() {
        return fetchInstances(defaultBaseUrl);
    }

    /**
     * Busca instâncias de um servidor Uazap específico (para empresas com baseUrl customizado)
     */
    public List<UazapInstanceDTO> fetchInstances(String baseUrl) {
        if (baseUrl == null || baseUrl.trim().isEmpty()) {
            baseUrl = defaultBaseUrl;
        }
        HttpHeaders headers = new HttpHeaders();
        headers.set("admintoken", adminToken);
        headers.set("apikey", adminToken);

        String base = baseUrl.replaceAll("/$", "");

        // 1. Tentar primeiro endpoint alternativo (/instance/all), que é mais comum
        String url1 = base + "/instance/all";
        try {
            return fetchAndParseInstances(url1, headers);
        } catch (Exception e) {
            log.warn("Endpoint {} falhou ou nao existe (normale): {}", url1, e.getMessage());
        }

        // 2. Tentar endpoint padrão Evolution (/instance/fetchInstances)
        String url2 = base + "/instance/fetchInstances";
        try {
            return fetchAndParseInstances(url2, headers);
        } catch (Exception e) {
            log.error("Endpoint {} falhou: {}", url2, e.getMessage());
        }

        // Fallback: Se falhar a listagem global e tivermos uma instância definida
        if (defaultInstance != null && !defaultInstance.isEmpty()) {
            log.info("Tentando fallback para instância única: {}", defaultInstance);
            return fetchSingleInstanceStatus(defaultInstance, headers);
        }

        return new ArrayList<>();
    }

    private List<UazapInstanceDTO> fetchAndParseInstances(String url, HttpHeaders headers) throws Exception {
        log.info("Fetching instances from Uazap: {}", url);
        HttpEntity<String> entity = new HttpEntity<>(headers);

        ResponseEntity<String> response = restTemplate.exchange(
                url,
                HttpMethod.GET,
                entity,
                String.class);

        String json = response.getBody();
        ObjectMapper mapper = new ObjectMapper();
        mapper.configure(com.fasterxml.jackson.databind.DeserializationFeature.FAIL_ON_UNKNOWN_PROPERTIES, false);

        // Tenta deserializar lista direta
        try {
            return mapper.readValue(json, new TypeReference<List<UazapInstanceDTO>>() {
            });
        } catch (Exception e) {
            // Se falhar, tenta verificar se está envelopado
            try {
                Map<String, Object> map = mapper.readValue(json, new TypeReference<Map<String, Object>>() {
                });
                Object listObj = null;
                if (map.containsKey("instances"))
                    listObj = map.get("instances");
                else if (map.containsKey("data"))
                    listObj = map.get("data");
                else if (map.containsKey("results"))
                    listObj = map.get("results");

                if (listObj != null) {
                    String listJson = mapper.writeValueAsString(listObj);
                    return mapper.readValue(listJson, new TypeReference<List<UazapInstanceDTO>>() {
                    });
                }
            } catch (Exception ex) {
                log.debug("Falha parse wrapper: {}", ex.getMessage());
            }
            throw e;
        }
    }

    private List<UazapInstanceDTO> fetchSingleInstanceStatus(String instanceName, HttpHeaders originalHeaders) {
        String url = defaultBaseUrl.replaceAll("/$", "") + "/instance/connectionState/" + instanceName;
        try {
            HttpEntity<String> entity = new HttpEntity<>(originalHeaders);
            ResponseEntity<Map<String, Object>> response = restTemplate.exchange(
                    url,
                    HttpMethod.GET,
                    entity,
                    new ParameterizedTypeReference<Map<String, Object>>() {
                    });

            if (response.getBody() != null) {
                Map<String, Object> body = response.getBody();
                // A resposta geralmente é { "instance": "nome", "state": "open" }
                UazapInstanceDTO dto = new UazapInstanceDTO();
                dto.setInstanceName(instanceName);
                dto.setInstanceId(instanceName); // ID igual ao nome

                // Mapear status
                Object stateObj = body.get("state"); // Evolution v1/v2 pode variar key
                if (stateObj == null)
                    stateObj = body.get("status");

                dto.setStatus(stateObj != null ? stateObj.toString() : "unknown");

                // Token não é retornado aqui, mas podemos deixar null ou preencher se soubermos

                return java.util.Collections.singletonList(dto);
            }
        } catch (Exception ex) {
            log.error("Falha no fallback de instância única: {}", ex.getMessage());
        }
        // Se falhar também, retorna lista vazia para não quebrar o front
        return java.util.Collections.emptyList();
    }

    /**
     * Envia mensagem de mídia (imagem, vídeo, áudio, documento) via Uazap
     */
    @Transactional
    public WhatsAppMessage sendMediaMessage(com.backend.winai.dto.request.SendMediaMessageRequest request,
            Company company, byte[] fileContent) {
        log.info("=== [SEND MEDIA MESSAGE] Iniciando envio ===");
        log.info("  PhoneNumber: {}", request.getPhoneNumber());
        log.info("  Company: {} (ID: {})", company != null ? company.getName() : "NULL",
                company != null ? company.getId() : "NULL");
        log.info("  Request uazapInstance: {}", request.getUazapInstance());
        log.info("  Request uazapBaseUrl: {}", request.getUazapBaseUrl());
        log.info("  Request uazapToken: {}", request.getUazapToken() != null ? "[PRESENTE]" : "[AUSENTE]");
        log.info("  MediaType: {}, FileName: {}", request.getMediaType(), request.getFileName());

        // STEP 1: Determinar credenciais - PRIORIDADE ABSOLUTA para o request
        String baseUrl = null;
        String token = null;
        String instance = null;

        // PRIMEIRO: Tentar usar credenciais do request DTO (passadas explicitamente)
        if (request.getUazapBaseUrl() != null && !request.getUazapBaseUrl().isEmpty()) {
            baseUrl = request.getUazapBaseUrl();
            log.info("  [STEP1] baseUrl definido pelo REQUEST DTO: {}", baseUrl);
        }
        if (request.getUazapToken() != null && !request.getUazapToken().isEmpty()) {
            token = request.getUazapToken();
            log.info("  [STEP1] token definido pelo REQUEST DTO: [PRESENTE]");
        }
        if (request.getUazapInstance() != null && !request.getUazapInstance().isEmpty()) {
            instance = request.getUazapInstance();
            log.info("  [STEP1] instance definido pelo REQUEST DTO: {}", instance);
        }

        // SEGUNDO: Se faltam credenciais, buscar da conexão da empresa
        if (baseUrl == null || token == null) {
            log.info("  [STEP2] Credenciais incompletas no request, buscando da conexão da empresa...");
            if (company != null) {
                List<com.backend.winai.entity.UserWhatsAppConnection> connections = userWhatsAppConnectionRepository
                        .findByCompanyId(company.getId());
                log.info("  [STEP2] Encontradas {} conexões para empresa {}", connections.size(), company.getId());

                com.backend.winai.entity.UserWhatsAppConnection selectedConn = null;

                // Se temos instanceName, buscar exatamente ela
                if (instance != null && !instance.isEmpty()) {
                    final String instanceToFind = instance;
                    selectedConn = connections.stream()
                            .filter(c -> instanceToFind.equals(c.getInstanceName()))
                            .findFirst()
                            .orElse(null);
                    log.info("  [STEP2] Busca por instanceName '{}': {}", instance,
                            selectedConn != null ? "ENCONTRADA" : "NÃO ENCONTRADA");
                }

                // Se não encontrou por instanceName, pegar a primeira ativa
                if (selectedConn == null) {
                    selectedConn = connections.stream()
                            .filter(c -> Boolean.TRUE.equals(c.getIsActive()))
                            .findFirst()
                            .orElse(null);
                    log.info("  [STEP2] Busca por primeira ativa: {}",
                            selectedConn != null ? "ENCONTRADA (" + selectedConn.getInstanceName() + ")"
                                    : "NÃO ENCONTRADA");
                }

                if (selectedConn != null) {
                    if (baseUrl == null && selectedConn.getInstanceBaseUrl() != null) {
                        baseUrl = selectedConn.getInstanceBaseUrl();
                        log.info("  [STEP2] baseUrl definido pela CONEXÃO: {}", baseUrl);
                    }
                    if (token == null && selectedConn.getInstanceToken() != null) {
                        token = selectedConn.getInstanceToken();
                        log.info("  [STEP2] token definido pela CONEXÃO: [PRESENTE]");
                    }
                    if (instance == null && selectedConn.getInstanceName() != null) {
                        instance = selectedConn.getInstanceName();
                        log.info("  [STEP2] instance definido pela CONEXÃO: {}", instance);
                    }

                    // STEP 2.5: Se a conexão foi encontrada MAS as credenciais estão NULL,
                    // buscar da API UaZap e atualizar a conexão no banco
                    if ((baseUrl == null || token == null) && selectedConn.getInstanceName() != null) {
                        log.info("  [STEP2.5] Credenciais NULL na conexão, buscando da API UaZap...");
                        try {
                            List<UazapInstanceDTO> instances = fetchInstances();
                            final String connInstanceName = selectedConn.getInstanceName();
                            UazapInstanceDTO matchingInstance = instances.stream()
                                    .filter(i -> connInstanceName.equals(i.getInstanceName()))
                                    .findFirst()
                                    .orElse(null);

                            if (matchingInstance != null) {
                                log.info("  [STEP2.5] Instância {} encontrada na API UaZap", connInstanceName);

                                // Usar baseUrl padrão (a mesma do servidor UaZap)
                                if (baseUrl == null) {
                                    baseUrl = defaultBaseUrl;
                                    log.info("  [STEP2.5] baseUrl definido pelo DEFAULT (mesma da API): {}", baseUrl);
                                    selectedConn.setInstanceBaseUrl(baseUrl);
                                }

                                // Usar token da instância
                                if (token == null && matchingInstance.getToken() != null) {
                                    token = matchingInstance.getToken();
                                    log.info("  [STEP2.5] token definido pela API UaZap: [PRESENTE]");
                                    selectedConn.setInstanceToken(token);
                                }

                                // Persistir a atualização para futuras chamadas
                                userWhatsAppConnectionRepository.save(selectedConn);
                                log.info("  [STEP2.5] Conexão atualizada no banco de dados com credenciais da API");
                            } else {
                                log.warn("  [STEP2.5] Instância {} NÃO encontrada na API UaZap", connInstanceName);
                            }
                        } catch (Exception e) {
                            log.error("  [STEP2.5] Erro ao buscar credenciais da API UaZap: {}", e.getMessage());
                        }
                    }
                } else {
                    log.warn("  [STEP2] NENHUMA conexão encontrada para a empresa!");
                }
            } else {
                log.warn("  [STEP2] Company é NULL, não é possível buscar conexão!");
            }
        }

        // TERCEIRO: Se ainda faltam credenciais, logar erro mas usar defaults (para não
        // quebrar)
        if (baseUrl == null || baseUrl.isEmpty()) {
            log.error("  [STEP3] baseUrl AINDA VAZIO! Usando default: {}", defaultBaseUrl);
            baseUrl = defaultBaseUrl;
        }
        if (token == null || token.isEmpty()) {
            log.error("  [STEP3] token AINDA VAZIO! Usando default: [PRESENTE]");
            token = defaultToken;
        }

        log.info("=== [CREDENCIAIS FINAIS MEDIA] baseUrl={}, token=[{}], instance={} ===",
                baseUrl, token != null ? "PRESENTE" : "AUSENTE", instance);

        // Build config for findOrCreateConversation
        Map<String, String> config = new HashMap<>();
        config.put("baseUrl", baseUrl);
        config.put("token", token);
        config.put("instance", instance != null ? instance : "");

        // Buscar ou criar conversa
        WhatsAppConversation conversation = findOrCreateConversation(
                request.getPhoneNumber(),
                company,
                config);

        // Endpoint /send/media - igual ao /send/text (sem instância na URL)
        // A instância é identificada pelo token no header
        String url = baseUrl.replaceAll("/$", "") + "/send/media";
        log.info("  [SEND] URL final: {}", url);

        HttpHeaders headers = new HttpHeaders();
        headers.set("Accept", "application/json");
        headers.set("admintoken", adminToken);
        headers.set("apikey", adminToken);
        headers.set("token", token);

        HttpEntity<?> requestEntity;

        // Usar JSON conforme documentação da API UaZap
        headers.setContentType(MediaType.APPLICATION_JSON);

        Map<String, Object> body = new HashMap<>();
        body.put("number", request.getPhoneNumber());
        body.put("type", request.getMediaType()); // API usa 'type', não 'mediaType'

        if (fileContent != null && fileContent.length > 0) {
            // Converter arquivo para base64 - API aceita base64 diretamente no campo 'file'
            String base64Media = java.util.Base64.getEncoder().encodeToString(fileContent);
            body.put("file", base64Media);

            // Mimetype opcional (API detecta automaticamente)
            if (request.getMimeType() != null && !request.getMimeType().isEmpty()) {
                body.put("mimetype", request.getMimeType());
            }

            log.info("Enviando mídia em base64 - tamanho original: {} bytes, base64: {} chars",
                    fileContent.length, base64Media.length());
        } else if (request.getMediaUrl() != null && !request.getMediaUrl().isEmpty()) {
            // Enviar URL da mídia diretamente no campo 'file'
            body.put("file", request.getMediaUrl());
        }

        // Caption usa campo 'text' conforme documentação
        if (request.getCaption() != null && !request.getCaption().isEmpty()) {
            body.put("text", request.getCaption());
        }

        // Nome do documento (docName para documents)
        if (request.getFileName() != null && !request.getFileName().isEmpty()
                && "document".equalsIgnoreCase(request.getMediaType())) {
            body.put("docName", request.getFileName());
        }

        log.info("Enviando mídia JSON para UaZap - number: {}, type: {}, hasFile: {}",
                request.getPhoneNumber(), request.getMediaType(), body.containsKey("file"));

        requestEntity = new HttpEntity<>(body, headers);

        try {
            @SuppressWarnings("unchecked")
            ResponseEntity<Map<String, Object>> response = restTemplate.exchange(
                    url,
                    HttpMethod.POST,
                    requestEntity,
                    (Class<Map<String, Object>>) (Class<?>) Map.class);

            if (response.getStatusCode().is2xxSuccessful()) {
                Map<String, Object> responseBody = response.getBody();
                String messageId = extractMessageId(responseBody);

                // Salvar mensagem no banco
                WhatsAppMessage message = WhatsAppMessage.builder()
                        .conversation(conversation)
                        .content(request.getCaption() != null ? request.getCaption() : "")
                        .fromMe(true)
                        .messageType(request.getMediaType())
                        .mediaType(request.getMimeType())
                        .mediaUrl(request.getMediaUrl())
                        .messageTimestamp(System.currentTimeMillis())
                        .status("sent")
                        .messageId(messageId)
                        .build();

                message = messageRepository.save(message);

                // Atualizar última mensagem
                String lastMessageText = request.getCaption() != null && !request.getCaption().isEmpty()
                        ? request.getCaption()
                        : "📎 " + request.getMediaType();
                conversation.setLastMessageText(lastMessageText);
                conversation.setLastMessageTimestamp(System.currentTimeMillis());
                conversationRepository.save(conversation);

                log.info("Mensagem de mídia enviada com sucesso via Uazap. MessageId: {}", messageId);
                return message;
            } else {
                log.error("Erro ao enviar mensagem de mídia via Uazap. Status: {}", response.getStatusCode());
                throw new RuntimeException("Erro ao enviar mensagem de mídia via Uazap");
            }
        } catch (Exception e) {
            log.error("Erro ao enviar mensagem de mídia via Uazap", e);
            throw new RuntimeException("Erro ao enviar mensagem de mídia via Uazap: " + e.getMessage(), e);
        }
    }

    /**
     * Sobrecarga para manter compatibilidade (envia sem arquivo físico)
     */
    @Transactional
    public WhatsAppMessage sendMediaMessage(com.backend.winai.dto.request.SendMediaMessageRequest request,
            Company company) {
        return sendMediaMessage(request, company, null);
    }

    /**
     * Cria uma nova instância no UaZap
     */
    public Map<String, Object> createInstance(com.backend.winai.dto.request.CreateUazapInstanceRequest request) {
        String url = defaultBaseUrl.replaceAll("/$", "") + "/instance/create";

        log.info("Criando nova instância no UaZap: {}", request.getInstanceName());

        // Headers
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        headers.set("Accept", "application/json");
        headers.set("admintoken", adminToken);
        headers.set("apikey", adminToken);

        // Body - UaZap espera 'name' em vez de 'instanceName'
        Map<String, Object> body = new HashMap<>();
        body.put("name", request.getInstanceName()); // Campo correto: 'name'

        if (request.getToken() != null && !request.getToken().isEmpty()) {
            body.put("token", request.getToken());
        }

        if (request.getWebhookUrl() != null && !request.getWebhookUrl().isEmpty()) {
            body.put("webhook", request.getWebhookUrl());
        }

        if (request.getQrcode() != null) {
            body.put("qrcode", request.getQrcode());
        } else {
            body.put("qrcode", true); // Padrão: gerar QR code
        }

        if (request.getIntegration() != null && !request.getIntegration().isEmpty()) {
            body.put("integration", request.getIntegration());
        } else {
            body.put("integration", "WHATSAPP-BAILEYS"); // Padrão
        }

        HttpEntity<Map<String, Object>> requestEntity = new HttpEntity<>(body, headers);

        try {
            @SuppressWarnings("unchecked")
            ResponseEntity<Map<String, Object>> response = restTemplate.exchange(
                    url,
                    HttpMethod.POST,
                    requestEntity,
                    (Class<Map<String, Object>>) (Class<?>) Map.class);

            if (response.getStatusCode().is2xxSuccessful()) {
                Map<String, Object> responseBody = response.getBody();
                log.info("Instância criada com sucesso: {}", request.getInstanceName());
                return responseBody;
            } else {
                log.error("Erro ao criar instância. Status: {}, Body: {}",
                        response.getStatusCode(), response.getBody());
                throw new RuntimeException("Erro ao criar instância no UaZap");
            }
        } catch (Exception e) {
            log.error("Erro ao criar instância no UaZap", e);
            throw new RuntimeException("Erro ao criar instância no UaZap: " + e.getMessage(), e);
        }
    }

    /**
     * Deleta uma instância no UaZap
     */
    public void deleteInstance(String instanceName) {
        // Buscar o token da instância primeiro
        String instanceToken = fetchInstanceToken(instanceName);
        if (instanceToken == null) {
            throw new RuntimeException("Instância não encontrada ou token indisponível: " + instanceName);
        }

        // Endpoint correto conforme documentação: DELETE /instance
        String url = defaultBaseUrl.replaceAll("/$", "") + "/instance";

        log.info("Deletando instância no UaZap: {}", instanceName);

        // Headers com token da instância
        HttpHeaders headers = new HttpHeaders();
        headers.set("token", instanceToken); // Token da instância específica

        HttpEntity<Void> requestEntity = new HttpEntity<>(headers);

        try {
            ResponseEntity<Void> response = restTemplate.exchange(
                    url,
                    HttpMethod.DELETE,
                    requestEntity,
                    Void.class);

            if (response.getStatusCode().is2xxSuccessful()) {
                log.info("Instância deletada com sucesso: {}", instanceName);
            } else {
                log.error("Erro ao deletar instância. Status: {}", response.getStatusCode());
                throw new RuntimeException("Erro ao deletar instância no UaZap");
            }
        } catch (Exception e) {
            log.error("Erro ao deletar instância no UaZap", e);
            throw new RuntimeException("Erro ao deletar instância no UaZap: " + e.getMessage(), e);
        }
    }

    /**
     * Helper para buscar token da instância pelo nome
     */
    private String fetchInstanceToken(String instanceName) {
        try {
            List<UazapInstanceDTO> instances = fetchInstances();
            if (instances != null) {
                for (UazapInstanceDTO instance : instances) {
                    // Verifica nome ou ID
                    if (instanceName.equals(instance.getInstanceName())
                            || instanceName.equals(instance.getInstanceId())) {
                        return instance.getToken();
                    }
                }
            }
        } catch (Exception e) {
            log.error("Erro ao buscar token para instância {}: {}", instanceName, e.getMessage());
        }
        return null;
    }

    public Map<String, Object> connectInstance(String instanceName) {
        String instanceToken = fetchInstanceToken(instanceName);
        if (instanceToken == null) {
            log.warn("Instância não encontrada para conexão: {}", instanceName);
            Map<String, Object> errorResponse = new HashMap<>();
            errorResponse.put("error", "Instância não encontrada");
            errorResponse.put("status", "error");
            return errorResponse;
        }

        for (int attempt = 1; attempt <= 3; attempt++) {
            try {
                Map<String, Object> result = doConnectInstance(instanceName, instanceToken);
                if (result != null) {
                    return result;
                }
            } catch (org.springframework.web.client.HttpClientErrorException e) {
                int status = e.getStatusCode().value();
                if (status == 408 || status == 409) {
                    if (attempt < 3) {
                        log.info("Retry {} para instância {} (status {})", attempt, instanceName, status);
                        disconnectInstance(instanceName);
                        try {
                            Thread.sleep(2000);
                        } catch (InterruptedException ie) {
                            Thread.currentThread().interrupt();
                            throw new RuntimeException("Interrompido durante retry", ie);
                        }
                    } else {
                        Map<String, Object> progressResponse = new HashMap<>();
                        progressResponse.put("status", "connecting");
                        progressResponse.put("message", "Conexão em progresso. Aguarde o QR code.");
                        progressResponse.put("instanceName", instanceName);
                        return progressResponse;
                    }
                } else {
                    log.error("Erro HTTP ao conectar instância no UaZap: {}", e.getMessage());
                    throw new RuntimeException("Erro ao conectar instância no UaZap: " + e.getMessage(), e);
                }
            } catch (Exception e) {
                if (attempt < 3) {
                    log.warn("Retry {} para instância {}: {}", attempt, instanceName, e.getMessage());
                    disconnectInstance(instanceName);
                    try {
                        Thread.sleep(2000);
                    } catch (InterruptedException ie) {
                        Thread.currentThread().interrupt();
                        throw new RuntimeException("Interrompido durante retry", ie);
                    }
                } else {
                    log.error("Erro ao conectar instância no UaZap", e);
                    throw new RuntimeException("Erro ao conectar instância no UaZap: " + e.getMessage(), e);
                }
            }
        }

        Map<String, Object> progressResponse = new HashMap<>();
        progressResponse.put("status", "connecting");
        progressResponse.put("message", "Conexão em progresso. Aguarde o QR code.");
        progressResponse.put("instanceName", instanceName);
        return progressResponse;
    }

    private Map<String, Object> doConnectInstance(String instanceName, String instanceToken) {
        String url = defaultBaseUrl.replaceAll("/$", "") + "/instance/connect";
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        headers.set("Accept", "application/json");
        headers.set("token", instanceToken);
        HttpEntity<Map<String, Object>> requestEntity = new HttpEntity<>(Collections.emptyMap(), headers);

        @SuppressWarnings("unchecked")
        ResponseEntity<Map<String, Object>> response = restTemplate.exchange(
                url,
                HttpMethod.POST,
                requestEntity,
                (Class<Map<String, Object>>) (Class<?>) Map.class);

        if (response.getStatusCode().is2xxSuccessful()) {
            return response.getBody();
        }
        throw new RuntimeException("Erro ao conectar instância no UaZap");
    }

    /**
     * Desconecta uma instância do WhatsApp
     */
    public void disconnectInstance(String instanceName) {
        String instanceToken = fetchInstanceToken(instanceName);
        if (instanceToken == null) {
            log.warn("Instância não encontrada para desconexão: {}", instanceName);
            return;
        }

        String url = defaultBaseUrl.replaceAll("/$", "") + "/instance/disconnect";

        log.info("Desconectando instância do WhatsApp: {}", instanceName);

        // Headers
        HttpHeaders headers = new HttpHeaders();
        headers.set("token", instanceToken); // Token da instância

        HttpEntity<Void> requestEntity = new HttpEntity<>(headers);

        try {
            ResponseEntity<Void> response = restTemplate.exchange(
                    url,
                    HttpMethod.POST,
                    requestEntity,
                    Void.class);

            if (response.getStatusCode().is2xxSuccessful()) {
                log.info("Instância desconectada com sucesso: {}", instanceName);
            } else {
                log.error("Erro ao desconectar instância. Status: {}", response.getStatusCode());
                throw new RuntimeException("Erro ao desconectar instância no UaZap");
            }
        } catch (Exception e) {
            log.error("Erro ao desconectar instância no UaZap", e);
            throw new RuntimeException("Erro ao desconectar instância no UaZap: " + e.getMessage(), e);
        }
    }

    /**
     * Obtém configuração do Webhook Global
     */
    public com.backend.winai.dto.uazap.GlobalWebhookDTO getGlobalWebhook() {
        String url = defaultBaseUrl.replaceAll("/$", "") + "/globalwebhook";
        log.info("Buscando configuração de webhook global: {}", url);

        HttpHeaders headers = new HttpHeaders();
        headers.set("admintoken", adminToken);

        HttpEntity<Void> requestEntity = new HttpEntity<>(headers);

        try {
            ResponseEntity<com.backend.winai.dto.uazap.GlobalWebhookDTO> response = restTemplate.exchange(
                    url,
                    HttpMethod.GET,
                    requestEntity,
                    com.backend.winai.dto.uazap.GlobalWebhookDTO.class);
            com.backend.winai.dto.uazap.GlobalWebhookDTO body = response.getBody();
            if (body != null) {
                log.info("Webhook global atual: enabled={}, url={}, events={}", body.isEnabled(), body.getUrl(), body.getEvents());
            }
            return body;
        } catch (Exception e) {
            log.warn(
                    "Webhook global não configurado ou não encontrado (isso é normal se ainda não foi configurado): {}",
                    e.getMessage());
            return new com.backend.winai.dto.uazap.GlobalWebhookDTO();
        }
    }

    /**
     * Configura o Webhook Global
     */
    public void setGlobalWebhook(com.backend.winai.dto.uazap.GlobalWebhookDTO request) {
        String url = defaultBaseUrl.replaceAll("/$", "") + "/globalwebhook";
        log.info("Atualizando webhook global: {} | Destino URL: {} | Enabled: {} | Events: {}", url, request.getUrl(), request.isEnabled(), request.getEvents());

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        headers.set("admintoken", adminToken);

        HttpEntity<com.backend.winai.dto.uazap.GlobalWebhookDTO> requestEntity = new HttpEntity<>(request, headers);

        try {
            restTemplate.exchange(url, HttpMethod.POST, requestEntity, Void.class);
            log.info("Webhook global atualizado com sucesso");
        } catch (Exception e) {
            log.error("Erro ao atualizar webhook global", e);
            throw new RuntimeException("Erro ao atualizar webhook global: " + e.getMessage(), e);
        }
    }

    /**
     * Atualiza campos administrativos de uma instância
     */
    public void updateAdminFields(String instanceId, com.backend.winai.dto.request.UpdateAdminFieldsRequest request) {
        String url = defaultBaseUrl.replaceAll("/$", "") + "/instance/updateAdminFields";
        log.info("Atualizando admin fields para instância: {}", instanceId);

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        headers.set("admintoken", adminToken);

        Map<String, String> body = new HashMap<>();
        body.put("id", instanceId);
        if (request.getAdminField01() != null)
            body.put("adminField01", request.getAdminField01());
        if (request.getAdminField02() != null)
            body.put("adminField02", request.getAdminField02());

        HttpEntity<Map<String, String>> requestEntity = new HttpEntity<>(body, headers);

        try {
            restTemplate.exchange(url, HttpMethod.POST, requestEntity, Void.class);
            log.info("Admin fields atualizados com sucesso");
        } catch (Exception e) {
            log.error("Erro ao atualizar admin fields", e);
            throw new RuntimeException("Erro ao atualizar admin fields: " + e.getMessage(), e);
        }
    }

    /**
     * Busca a URL da foto de perfil de um número
     */
    /**
     * Busca a URL da foto de perfil de um número
     */
    public String fetchProfilePictureUrl(String phoneNumber, Company company, String instanceName, String token) {
        Map<String, String> config = getUazapConfig(company);
        String baseUrl = config.get("baseUrl");

        // Se fornecidos, usam os parâmetros específicos (prioridade para o que vem do
        // webhook)
        String useInstance = (instanceName != null && !instanceName.isEmpty()) ? instanceName : config.get("instance");
        String useToken = (token != null && !token.isEmpty()) ? token : config.get("token");

        if (baseUrl == null || useToken == null || useInstance == null) {
            log.warn("Dados insuficientes para buscar foto de perfil: Instance={}, Token={}, BaseUrl={}",
                    useInstance, useToken != null ? "hidden" : "null", baseUrl);
            return null;
        }

        String cleanBaseUrl = baseUrl.replaceAll("/$", "");

        HttpHeaders headers = new HttpHeaders();
        headers.set("apikey", adminToken);
        headers.set("token", useToken);

        // 1. Tentar GET (Evolution v1 / Padrão antigo)
        try {
            String urlGet = cleanBaseUrl + "/chat/fetchProfilePictureUrl/" + useInstance + "?number=" + phoneNumber;

            HttpEntity<Void> requestEntity = new HttpEntity<>(headers);
            ResponseEntity<Map<String, Object>> response = restTemplate.exchange(
                    urlGet,
                    HttpMethod.GET,
                    requestEntity,
                    new ParameterizedTypeReference<Map<String, Object>>() {
                    });

            if (response.getStatusCode().is2xxSuccessful() && response.getBody() != null) {
                Object ppUrl = response.getBody().get("profilePictureUrl");
                if (ppUrl != null)
                    return ppUrl.toString();
            }
        } catch (Exception e) {
            log.debug("Falha ao buscar foto via GET para {}: {}", phoneNumber, e.getMessage());
        }

        // 2. Tentar POST (Evolution v2 / Novo padrão)
        try {
            String urlPost = cleanBaseUrl + "/chat/fetchProfilePictureUrl/" + useInstance;

            Map<String, String> body = new HashMap<>();
            body.put("number", phoneNumber);

            headers.setContentType(MediaType.APPLICATION_JSON);
            HttpEntity<Map<String, String>> requestEntity = new HttpEntity<>(body, headers);

            ResponseEntity<Map<String, Object>> response = restTemplate.exchange(
                    urlPost,
                    HttpMethod.POST,
                    requestEntity,
                    new ParameterizedTypeReference<Map<String, Object>>() {
                    });

            if (response.getStatusCode().is2xxSuccessful() && response.getBody() != null) {
                Object ppUrl = response.getBody().get("profilePictureUrl");
                if (ppUrl != null)
                    return ppUrl.toString();
            }
        } catch (Exception e) {
            log.warn("Falha ao buscar foto via POST para {}: {}", phoneNumber, e.getMessage());
        }

        return null;
    }

    /**
     * Sobrecarga para compatibilidade
     */
    public String fetchProfilePictureUrl(String phoneNumber, Company company) {
        return fetchProfilePictureUrl(phoneNumber, company, null, null);
    }

    /**
     * Configura o webhook de uma instância específica no UaZap.
     */
    public void configureInstanceWebhook(String instanceToken, String webhookUrl, List<String> events) {
        String url = defaultBaseUrl.replaceAll("/$", "") + "/webhook";

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        headers.set("token", instanceToken);

        Map<String, Object> body = new HashMap<>();
        body.put("enabled", true);
        body.put("url", webhookUrl);
        body.put("events", events != null ? events : List.of("messages", "messages_update", "presence", "connection"));
        body.put("excludeMessages", List.of("wasSentByApi"));

        HttpEntity<Map<String, Object>> requestEntity = new HttpEntity<>(body, headers);

        try {
            restTemplate.exchange(url, HttpMethod.POST, requestEntity, String.class);
        } catch (Exception e) {
            log.error("[WEBHOOK-CASCADE] Erro ao configurar webhook da instância: {}", e.getMessage());
        }
    }

    /**
     * Configura o webhook global E propaga para todas as instâncias em cascata.
     * Chamado quando o admin salva o webhook global no painel.
     */
    public void setGlobalWebhookCascade(com.backend.winai.dto.uazap.GlobalWebhookDTO request) {
        // 1. Configurar webhook global
        setGlobalWebhook(request);

        // 2. Propagar para todas as instâncias
        log.info("[WEBHOOK-CASCADE] Propagando webhook para todas as instâncias...");
        try {
            List<UazapInstanceDTO> instances = fetchInstances();
            if (instances == null || instances.isEmpty()) {
                log.warn("[WEBHOOK-CASCADE] Nenhuma instância encontrada para propagar webhook");
                return;
            }

            int ok = 0, fail = 0;
            for (UazapInstanceDTO instance : instances) {
                if (instance.getToken() != null && !instance.getToken().isEmpty()) {
                    try {
                        configureInstanceWebhook(instance.getToken(), request.getUrl(), request.getEvents());
                        ok++;
                        log.info("[WEBHOOK-CASCADE] Webhook configurado na instância: {}", instance.getInstanceName());
                    } catch (Exception e) {
                        fail++;
                        log.error("[WEBHOOK-CASCADE] Falha na instância {}: {}", instance.getInstanceName(), e.getMessage());
                    }
                } else {
                    log.warn("[WEBHOOK-CASCADE] Instância {} sem token, pulando", instance.getInstanceName());
                    fail++;
                }
            }
            log.info("[WEBHOOK-CASCADE] Concluído: {}/{} instâncias configuradas com sucesso", ok, instances.size());
        } catch (Exception e) {
            log.error("[WEBHOOK-CASCADE] Erro ao listar instâncias para propagação: {}", e.getMessage());
        }
    }
}
