package com.backend.winai.service;

import com.backend.winai.dto.request.AdminCreateUserRequest;
import com.backend.winai.dto.request.AdminUpdateUserRequest;
import com.backend.winai.dto.request.UpdateInstanceConfigRequest;
import com.backend.winai.dto.response.AdminInstanceResponse;
import com.backend.winai.dto.response.AdminUserResponse;
import com.backend.winai.dto.uazap.UazapInstanceDTO;
import com.backend.winai.entity.Company;
import com.backend.winai.entity.User;
import com.backend.winai.entity.UserRole;
import com.backend.winai.repository.CompanyRepository;
import com.backend.winai.repository.UserRepository;
import com.backend.winai.repository.WhatsAppConversationRepository;
import com.backend.winai.repository.WhatsAppMessageRepository;
import com.backend.winai.repository.UserWhatsAppConnectionRepository;
import com.backend.winai.repository.KnowledgeBaseConnectionRepository;
import com.backend.winai.repository.LeadRepository;
import com.backend.winai.repository.KnowledgeBaseRepository;
import com.backend.winai.repository.KnowledgeBaseChunkRepository;
import com.backend.winai.repository.MeetingRepository;
import com.backend.winai.repository.SocialMediaProfileRepository;
import com.backend.winai.repository.SocialGrowthChatRepository;
import com.backend.winai.repository.MetaConnectionRepository;
import com.backend.winai.repository.GoogleDriveConnectionRepository;
import com.backend.winai.repository.GoalRepository;
import com.backend.winai.repository.NotificationRepository;
import com.backend.winai.repository.RefreshTokenRepository;
import com.backend.winai.repository.AIInsightRepository;
import com.backend.winai.repository.DashboardMetricsRepository;
import com.backend.winai.repository.InstagramMetricRepository;
import com.backend.winai.repository.MetaCampaignRepository;
import com.backend.winai.repository.MetaAdSetRepository;
import com.backend.winai.repository.MetaAdRepository;
import com.backend.winai.repository.MetaInsightRepository;
import com.backend.winai.repository.SystemPromptRepository;
import com.backend.winai.entity.UserWhatsAppConnection;
import com.backend.winai.entity.WhatsAppConversation;
import com.backend.winai.entity.KnowledgeBase;
import com.backend.winai.entity.SystemPrompt;
import com.backend.winai.dto.request.CreateUserWhatsAppConnectionRequest;
import com.backend.winai.dto.SystemPromptDTO;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.client.RestTemplate;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class AdminService {

    private final UserRepository userRepository;
    private final CompanyRepository companyRepository;
    private final WhatsAppMessageRepository messageRepository;
    private final WhatsAppConversationRepository conversationRepository;
    private final UserWhatsAppConnectionRepository connectionRepository;
    private final KnowledgeBaseConnectionRepository knowledgeBaseConnectionRepository;
    private final LeadRepository leadRepository;
    private final KnowledgeBaseRepository knowledgeBaseRepository;
    private final KnowledgeBaseChunkRepository knowledgeBaseChunkRepository;
    private final MeetingRepository meetingRepository;
    private final SocialMediaProfileRepository socialMediaProfileRepository;
    private final SocialGrowthChatRepository socialGrowthChatRepository;
    private final MetaConnectionRepository metaConnectionRepository;
    private final GoogleDriveConnectionRepository googleDriveConnectionRepository;
    private final GoalRepository goalRepository;
    private final NotificationRepository notificationRepository;
    private final RefreshTokenRepository refreshTokenRepository;
    private final AIInsightRepository aiInsightRepository;
    private final DashboardMetricsRepository dashboardMetricsRepository;
    private final InstagramMetricRepository instagramMetricRepository;
    private final MetaCampaignRepository metaCampaignRepository;
    private final MetaAdSetRepository metaAdSetRepository;
    private final MetaAdRepository metaAdRepository;
    private final MetaInsightRepository metaInsightRepository;
    private final SystemPromptRepository systemPromptRepository;
    private final UazapService uazapService;
    private final PasswordEncoder passwordEncoder;
    private final RestTemplate restTemplate = new RestTemplate();

    @Value("${uazap.default-base-url}")
    private String defaultBaseUrl;

    @Value("${uazap.admin-token:}")
    private String adminToken;

    // ========== ESTATÍSTICAS ==========

    /**
     * Obtém estatísticas gerais do sistema
     */
    public Map<String, Object> getSystemStats() {
        Map<String, Object> stats = new HashMap<>();

        stats.put("totalUsers", userRepository.count());
        stats.put("totalMessages", messageRepository.count());
        stats.put("totalConversations", conversationRepository.count());

        try {
            List<UazapInstanceDTO> instances = uazapService.fetchInstances();
            stats.put("totalInstances", instances.size());
            stats.put("connectedInstances", instances.stream()
                    .filter(i -> "open".equalsIgnoreCase(i.getStatus()))
                    .count());
        } catch (Exception e) {
            log.error("Erro ao buscar instâncias para stats", e);
            stats.put("totalInstances", 0);
            stats.put("connectedInstances", 0);
        }

        return stats;
    }

    // ========== CRUD DE USUÁRIOS ==========

    /**
     * Lista todos os usuários do sistema
     */
    public List<AdminUserResponse> getAllUsers() {
        List<User> users = userRepository.findAll();

        return users.stream()
                .map(this::mapToAdminUserResponse)
                .collect(Collectors.toList());
    }

    /**
     * Busca um usuário por ID
     */
    public AdminUserResponse getUserById(UUID userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("Usuário não encontrado"));
        return mapToAdminUserResponse(user);
    }

    /**
     * Cria um novo usuário
     */
    @Transactional
    public AdminUserResponse createUser(AdminCreateUserRequest request) {
        // Verificar se email já existe
        if (userRepository.findByEmail(request.getEmail()).isPresent()) {
            throw new RuntimeException("Email já está em uso");
        }

        User user = User.builder()
                .name(request.getName())
                .email(request.getEmail())
                .password(passwordEncoder.encode(request.getPassword()))
                .role(parseRole(request.getRole()))
                .phone(request.getPhone())
                .isActive(true)
                .emailVerified(true) // Admin pode criar verificado
                .build();

        // Associar empresa se fornecida
        if (request.getCompanyId() != null && !request.getCompanyId().isEmpty()) {
            Company company = companyRepository.findById(UUID.fromString(request.getCompanyId()))
                    .orElseThrow(() -> new RuntimeException("Empresa não encontrada"));
            user.setCompany(company);
        }

        User savedUser = userRepository.save(user);
        log.info("Usuário criado pelo admin: {}", savedUser.getEmail());

        return mapToAdminUserResponse(savedUser);
    }

    /**
     * Atualiza um usuário existente
     */
    @Transactional
    public AdminUserResponse updateUser(UUID userId, AdminUpdateUserRequest request) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("Usuário não encontrado"));

        // Verificar se email já existe (se está alterando)
        if (request.getEmail() != null && !request.getEmail().equals(user.getEmail())) {
            if (userRepository.findByEmail(request.getEmail()).isPresent()) {
                throw new RuntimeException("Email já está em uso");
            }
            user.setEmail(request.getEmail());
        }

        if (request.getName() != null) {
            user.setName(request.getName());
        }

        if (request.getPassword() != null && !request.getPassword().isEmpty()) {
            user.setPassword(passwordEncoder.encode(request.getPassword()));
        }

        if (request.getRole() != null) {
            user.setRole(parseRole(request.getRole()));
        }

        if (request.getPhone() != null) {
            user.setPhone(request.getPhone());
        }

        if (request.getIsActive() != null) {
            user.setIsActive(request.getIsActive());
        }

        // Associar/dessociar empresa
        if (request.getCompanyId() != null) {
            if (request.getCompanyId().isEmpty()) {
                user.setCompany(null);
            } else {
                Company company = companyRepository.findById(UUID.fromString(request.getCompanyId()))
                        .orElseThrow(() -> new RuntimeException("Empresa não encontrada"));
                user.setCompany(company);
            }
        }

        User savedUser = userRepository.save(user);
        log.info("Usuário atualizado pelo admin: {}", savedUser.getEmail());

        return mapToAdminUserResponse(savedUser);
    }

    /**
     * Ativa/desativa um usuário
     */
    @Transactional
    public void toggleUserStatus(UUID userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("Usuário não encontrado"));

        user.setIsActive(!user.getIsActive());
        userRepository.save(user);

        log.info("Status do usuário {} alterado para {}", userId, user.getIsActive());
    }

    /**
     * Exclui um usuário (soft delete - desativa)
     */
    @Transactional
    public void deleteUser(UUID userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("Usuário não encontrado"));

        // Soft delete - apenas desativa
        user.setIsActive(false);
        userRepository.save(user);

        log.info("Usuário {} marcado como excluído", userId);
    }

    /**
     * Exclui um usuário permanentemente
     */
    @Transactional
    public void hardDeleteUser(UUID userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("Usuário não encontrado"));

        // Cascade delete dependências do usuário
        refreshTokenRepository.deleteByUser(user);
        notificationRepository.deleteByUser(user);

        // Limpar referências em conexões WhatsApp
        connectionRepository.findByCreatedById(userId).forEach(conn -> {
            conn.setCreatedBy(null);
            connectionRepository.save(conn);
        });

        userRepository.delete(user);
        log.info("Usuário {} excluído permanentemente", userId);
    }

    // ========== EMPRESAS ==========

    /**
     * Lista todas as empresas do sistema
     */
    public List<Map<String, Object>> getAllCompanies() {
        return companyRepository.findAll().stream()
                .map(company -> {
                    Map<String, Object> map = new HashMap<>();
                    map.put("id", company.getId().toString());
                    map.put("name", company.getName());
                    map.put("defaultSupportMode", company.getDefaultSupportMode());
                    map.put("createdAt", company.getCreatedAt() != null ? company.getCreatedAt().toString() : null);
                    return map;
                })
                .collect(Collectors.toList());
    }

    /**
     * Busca uma empresa por ID
     */
    public Company getCompanyById(UUID companyId) {
        return companyRepository.findById(companyId)
                .orElseThrow(() -> new RuntimeException("Empresa não encontrada"));
    }

    /**
     * Cria uma nova empresa
     */
    @Transactional
    public Company createCompany(Company company) {
        // Definir valores padrão se não fornecidos
        if (company.getPlan() == null) {
            company.setPlan(com.backend.winai.entity.UserPlan.STARTER);
        }
        if (company.getStatus() == null) {
            company.setStatus(com.backend.winai.entity.AccountStatus.ACTIVE);
        }

        Company savedCompany = companyRepository.save(company);
        log.info("Empresa criada: {}", savedCompany.getName());
        return savedCompany;
    }

    /**
     * Atualiza uma empresa existente
     */
    @Transactional
    public Company updateCompany(UUID companyId, Company companyDetails) {
        Company company = companyRepository.findById(companyId)
                .orElseThrow(() -> new RuntimeException("Empresa não encontrada"));

        if (companyDetails.getName() != null) {
            company.setName(companyDetails.getName());
        }
        if (companyDetails.getSegment() != null) {
            company.setSegment(companyDetails.getSegment());
        }
        if (companyDetails.getPlan() != null) {
            company.setPlan(companyDetails.getPlan());
        }
        if (companyDetails.getStatus() != null) {
            company.setStatus(companyDetails.getStatus());
        }
        if (companyDetails.getWhatsapp() != null) {
            company.setWhatsapp(companyDetails.getWhatsapp());
        }
        if (companyDetails.getLeadVolume() != null) {
            company.setLeadVolume(companyDetails.getLeadVolume());
        }
        if (companyDetails.getDefaultSupportMode() != null) {
            company.setDefaultSupportMode(companyDetails.getDefaultSupportMode());
        }

        Company savedCompany = companyRepository.save(company);
        log.info("Empresa atualizada: {}", savedCompany.getName());
        return savedCompany;
    }

    /**
     * Exclui uma empresa
     */
    @Transactional
    public void deleteCompany(UUID companyId) {
        Company company = companyRepository.findById(companyId)
                .orElseThrow(() -> new RuntimeException("Empresa não encontrada"));

        log.info("Iniciando exclusão em cascata da empresa: {} ({})", company.getName(), companyId);

        // 1. WhatsApp e Mensagens
        List<WhatsAppConversation> conversations = conversationRepository.findByCompany(company);
        for (WhatsAppConversation conv : conversations) {
            messageRepository.deleteAll(messageRepository.findByConversationOrderByMessageTimestampAsc(conv));
        }
        conversationRepository.deleteAll(conversations);

        // 2. Conexões e IA
        List<UserWhatsAppConnection> connections = connectionRepository.findByCompanyId(companyId);
        for (UserWhatsAppConnection conn : connections) {
            knowledgeBaseConnectionRepository.deleteByConnection(conn);
        }
        connectionRepository.deleteAll(connections);

        List<KnowledgeBase> kbs = knowledgeBaseRepository.findByCompanyIdOrderByUpdatedAtDesc(company.getId());
        for (KnowledgeBase kb : kbs) {
            knowledgeBaseChunkRepository.deleteByKnowledgeBase(kb);
        }
        knowledgeBaseRepository.deleteAll(kbs);

        // 3. Leads e Insights
        leadRepository.deleteAll(leadRepository.findByCompanyOrderByCreatedAtDesc(company));
        aiInsightRepository.deleteByCompany(company);
        dashboardMetricsRepository.deleteByCompany(company);
        instagramMetricRepository.deleteByCompany(company);

        metaInsightRepository.deleteByCompany(company);
        metaAdRepository.deleteByCompany(company);
        metaAdSetRepository.deleteByCompany(company);
        metaCampaignRepository.deleteByCompany(company);

        // 4. Integrações Sociais e Outros
        socialMediaProfileRepository.findByCompany(company).ifPresent(socialMediaProfileRepository::delete);
        socialGrowthChatRepository.deleteByCompany(company);
        metaConnectionRepository.findByCompany(company).ifPresent(metaConnectionRepository::delete);
        googleDriveConnectionRepository.findByCompany(company).ifPresent(googleDriveConnectionRepository::delete);

        meetingRepository.deleteByCompany(company);
        goalRepository.deleteByCompany(company);

        // 5. Usuários (incluindo dependências do usuário)
        List<User> users = userRepository.findByCompanyId(companyId);
        for (User user : users) {
            refreshTokenRepository.deleteByUser(user);
            notificationRepository.deleteByUser(user);
            userRepository.delete(user);
        }

        // 6. Por fim, a empresa
        companyRepository.delete(company);
        log.info("Empresa {} e todos os seus dados foram excluídos com sucesso", companyId);
    }

    // ========== INSTÂNCIAS WHATSAPP ==========

    /**
     * Lista todas as instâncias WhatsApp com estatísticas
     */
    public List<AdminInstanceResponse> getAllInstances() {
        try {
            List<UazapInstanceDTO> instances = uazapService.fetchInstances();

            return instances.stream()
                    .map(this::mapToAdminInstanceResponse)
                    .collect(Collectors.toList());
        } catch (Exception e) {
            log.error("Erro ao buscar instâncias", e);
            return List.of();
        }
    }

    /**
     * Atualiza configurações de uma instância
     */
    public void updateInstanceConfig(String instanceName, UpdateInstanceConfigRequest request) {
        String url = defaultBaseUrl.replaceAll("/$", "") + "/instance/update/" + instanceName;

        log.info("Atualizando configurações da instância: {}", instanceName);

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        headers.set("admintoken", adminToken);
        headers.set("apikey", adminToken);

        Map<String, Object> body = new HashMap<>();
        if (request.getWebhookUrl() != null) {
            body.put("webhook", request.getWebhookUrl());
        }
        if (request.getIntegration() != null) {
            body.put("integration", request.getIntegration());
        }
        if (request.getQrcodeEnabled() != null) {
            body.put("qrcode", request.getQrcodeEnabled());
        }
        if (request.getAdminField01() != null) {
            body.put("adminField01", request.getAdminField01());
        }
        if (request.getAdminField02() != null) {
            body.put("adminField02", request.getAdminField02());
        }

        HttpEntity<Map<String, Object>> requestEntity = new HttpEntity<>(body, headers);

        try {
            restTemplate.exchange(url, HttpMethod.POST, requestEntity, String.class);
            log.info("Configurações atualizadas com sucesso: {}", instanceName);
        } catch (Exception e) {
            log.error("Erro ao atualizar configurações da instância", e);
            throw new RuntimeException("Erro ao atualizar configurações: " + e.getMessage(), e);
        }
    }

    /**
     * Cria uma nova instância WhatsApp
     */
    public Map<String, Object> createInstance(com.backend.winai.dto.request.CreateUazapInstanceRequest request) {
        return uazapService.createInstance(request);
    }

    /**
     * Exclui uma instância WhatsApp
     */
    public void deleteInstance(String instanceName) {
        uazapService.deleteInstance(instanceName);
    }

    /**
     * Conecta uma instância ao WhatsApp
     */
    public Map<String, Object> connectInstance(String instanceName) {
        return uazapService.connectInstance(instanceName);
    }

    /**
     * Desconecta uma instância do WhatsApp
     */
    public void disconnectInstance(String instanceName) {
        uazapService.disconnectInstance(instanceName);
    }

    /**
     * Obtém configuração do Webhook Global
     */
    public com.backend.winai.dto.uazap.GlobalWebhookDTO getGlobalWebhook() {
        return uazapService.getGlobalWebhook();
    }

    /**
     * Configura o Webhook Global
     */
    public void setGlobalWebhook(com.backend.winai.dto.uazap.GlobalWebhookDTO request) {
        uazapService.setGlobalWebhook(request);
    }

    /**
     * Atualiza campos administrativos de uma instância
     */
    public void updateAdminFields(String instanceId, com.backend.winai.dto.request.UpdateAdminFieldsRequest request) {
        uazapService.updateAdminFields(instanceId, request);
    }

    // ========== MÉTODOS AUXILIARES ==========

    private UserRole parseRole(String role) {
        if (role == null || role.isEmpty()) {
            return UserRole.USER;
        }
        try {
            return UserRole.valueOf(role.toUpperCase());
        } catch (Exception e) {
            return UserRole.USER;
        }
    }

    private AdminUserResponse mapToAdminUserResponse(User user) {
        return AdminUserResponse.builder()
                .id(user.getId())
                .name(user.getName())
                .email(user.getEmail())
                .role(user.getRole() != null ? user.getRole().name() : "USER")
                .active(user.getIsActive() != null ? user.getIsActive() : true)
                .avatarUrl(user.getAvatarUrl())
                .createdAt(user.getCreatedAt())
                .lastLogin(user.getLastLogin())
                .companyName(user.getCompany() != null ? user.getCompany().getName() : null)
                .companyId(user.getCompany() != null ? user.getCompany().getId() : null)
                .totalMessages(0L) // TODO: Implementar contagem por usuário
                .totalConversations(0L) // TODO: Implementar contagem por usuário
                .build();
    }

    private AdminInstanceResponse mapToAdminInstanceResponse(UazapInstanceDTO instance) {
        boolean qrcodeEnabled = false;
        if (instance.getQrcode() instanceof Boolean) {
            qrcodeEnabled = (Boolean) instance.getQrcode();
        } else if (instance.getQrcode() instanceof String) {
            qrcodeEnabled = !((String) instance.getQrcode()).isEmpty();
        }

        return AdminInstanceResponse.builder()
                .instanceId(instance.getInstanceId())
                .instanceName(instance.getInstanceName())
                .status(instance.getStatus())
                .token(instance.getToken())
                // Configurações
                .webhookUrl(instance.getWebhook())
                .integration(instance.getIntegration())
                .qrcodeEnabled(qrcodeEnabled)
                // Conexão
                .connected("open".equalsIgnoreCase(instance.getStatus())
                        || "connected".equalsIgnoreCase(instance.getStatus()))
                .phoneNumber(instance.getPhoneNumber())
                .profileName(instance.getProfileName())
                .profilePicUrl(instance.getProfilePicUrl())
                // Estatísticas (ainda pendentes de implementação real)
                .totalMessages(0L)
                .totalConversations(0L)
                .build();
    }
    // ========== CONEXÕES WHATSAPP (EMPRESAS) ==========

    /**
     * Lista todas as conexões WhatsApp de empresas
     */
    public List<Map<String, Object>> getAllUserWhatsAppConnections() {
        return connectionRepository.findAll().stream()
                .map(conn -> {
                    Map<String, Object> map = new HashMap<>();
                    map.put("id", conn.getId());
                    map.put("companyId", conn.getCompany().getId());
                    map.put("companyName", conn.getCompany().getName());
                    map.put("instanceName", conn.getInstanceName());
                    map.put("isActive", conn.getIsActive());
                    map.put("createdAt", conn.getCreatedAt());
                    map.put("updatedAt", conn.getUpdatedAt());
                    if (conn.getCreatedBy() != null) {
                        map.put("createdByUserId", conn.getCreatedBy().getId());
                        map.put("createdByUserName", conn.getCreatedBy().getName());
                    }

                    // Verificar se já tem agente vinculado
                    knowledgeBaseConnectionRepository.findByConnection(conn).ifPresent(kbConn -> {
                        map.put("agentId", kbConn.getKnowledgeBase().getId());
                        map.put("agentName", kbConn.getKnowledgeBase().getName());
                    });

                    return map;
                })
                .collect(Collectors.toList());
    }

    /**
     * Cria uma nova conexão WhatsApp para uma empresa
     */
    @Transactional
    public UserWhatsAppConnection createUserWhatsAppConnection(CreateUserWhatsAppConnectionRequest request) {
        Company company = companyRepository.findById(request.getCompanyId())
                .orElseThrow(() -> new RuntimeException("Empresa não encontrada"));

        // Verificar se já existe conexão para essa empresa e instância
        if (connectionRepository.findByCompanyIdAndInstanceName(request.getCompanyId(), request.getInstanceName())
                .isPresent()) {
            throw new RuntimeException("Esta empresa já possui uma conexão com esta instância");
        }

        UserWhatsAppConnection connection = new UserWhatsAppConnection();
        connection.setCompany(company);
        connection.setInstanceName(request.getInstanceName());
        connection.setInstanceToken(request.getInstanceToken());
        connection.setInstanceBaseUrl(request.getInstanceBaseUrl());
        connection.setDescription(request.getDescription());
        connection.setIsActive(request.getIsActive() != null ? request.getIsActive() : true);

        if (request.getCreatedByUserId() != null) {
            userRepository.findById(request.getCreatedByUserId()).ifPresent(connection::setCreatedBy);
        }

        return connectionRepository.save(connection);
    }

    /**
     * Alterna o status de uma conexão
     */
    @Transactional
    public void toggleUserWhatsAppConnectionStatus(UUID connectionId) {
        UserWhatsAppConnection connection = connectionRepository.findById(connectionId)
                .orElseThrow(() -> new RuntimeException("Conexão não encontrada"));

        connection.setIsActive(!connection.getIsActive());
        connectionRepository.save(connection);
    }

    /**
     * Remove uma conexão
     */
    @Transactional
    public void deleteUserWhatsAppConnection(UUID connectionId) {
        if (!connectionRepository.existsById(connectionId)) {
            throw new RuntimeException("Conexão não encontrada");
        }
        connectionRepository.deleteById(connectionId);
    }

    // ========== SYSTEM PROMPTS ==========

    /**
     * Lista todos os prompts do sistema
     */
    public List<SystemPromptDTO> getAllSystemPrompts() {
        return systemPromptRepository.findAllByOrderByCategoryAscNameAsc().stream()
                .map(this::mapToSystemPromptDTO)
                .collect(Collectors.toList());
    }

    /**
     * Busca prompts por categoria
     */
    public List<SystemPromptDTO> getSystemPromptsByCategory(String category) {
        return systemPromptRepository.findByCategory(category).stream()
                .map(this::mapToSystemPromptDTO)
                .collect(Collectors.toList());
    }

    /**
     * Busca um prompt por ID
     */
    public SystemPromptDTO getSystemPromptById(UUID id) {
        SystemPrompt prompt = systemPromptRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Prompt não encontrado"));
        return mapToSystemPromptDTO(prompt);
    }

    /**
     * Cria um novo prompt
     */
    @Transactional
    public SystemPromptDTO createSystemPrompt(String name, String category, String content, String description,
            Boolean isDefault) {
        String categoryUpper = category.toUpperCase();

        // Se já existe um prompt para essa categoria, vamos atualizar
        SystemPrompt prompt = systemPromptRepository.findByCategory(categoryUpper)
                .orElse(new SystemPrompt());

        prompt.setName(name);
        prompt.setCategory(categoryUpper);
        prompt.setContent(content);
        prompt.setDescription(description);
        prompt.setIsActive(true);
        prompt.setIsDefault(true); // Se só tem um, ele é o padrão

        prompt = systemPromptRepository.save(prompt);
        log.info("Saved/Updated system prompt for category: {}", categoryUpper);
        return mapToSystemPromptDTO(prompt);
    }

    /**
     * Atualiza um prompt existente
     */
    @Transactional
    public SystemPromptDTO updateSystemPrompt(UUID id, String name, String content, String description,
            Boolean isActive, Boolean isDefault) {
        SystemPrompt prompt = systemPromptRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Prompt não encontrado"));

        if (name != null)
            prompt.setName(name);
        if (content != null)
            prompt.setContent(content);
        if (description != null)
            prompt.setDescription(description);
        if (isActive != null)
            prompt.setIsActive(isActive);

        // Sempre padrão se só tem um
        prompt.setIsDefault(true);

        prompt = systemPromptRepository.save(prompt);
        log.info("Updated system prompt: {}", id);
        return mapToSystemPromptDTO(prompt);
    }

    /**
     * Remove um prompt
     */
    @Transactional
    public void deleteSystemPrompt(UUID id) {
        if (!systemPromptRepository.existsById(id)) {
            throw new RuntimeException("Prompt não encontrado");
        }
        systemPromptRepository.deleteById(id);
        log.info("Deleted system prompt: {}", id);
    }

    /**
     * Busca o prompt padrão ativo de uma categoria
     */
    public String getActivePromptContent(String category) {
        return systemPromptRepository.findByCategoryAndIsActiveTrueAndIsDefaultTrue(category)
                .map(SystemPrompt::getContent)
                .orElse(null);
    }

    private SystemPromptDTO mapToSystemPromptDTO(SystemPrompt prompt) {
        return SystemPromptDTO.builder()
                .id(prompt.getId())
                .name(prompt.getName())
                .category(prompt.getCategory())
                .content(prompt.getContent())
                .description(prompt.getDescription())
                .isActive(prompt.getIsActive())
                .isDefault(prompt.getIsDefault())
                .createdAt(prompt.getCreatedAt())
                .updatedAt(prompt.getUpdatedAt())
                .build();
    }
}
