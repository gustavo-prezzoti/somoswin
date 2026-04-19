package com.backend.winai.controller;

import com.backend.winai.dto.request.AdminMeetingCreateRequest;
import com.backend.winai.dto.request.AdminCreateUserRequest;
import com.backend.winai.dto.request.AdminEscutaStartRequest;
import com.backend.winai.dto.request.AdminLeadStatusPatchRequest;
import com.backend.winai.dto.request.AdminUpdateUserRequest;
import com.backend.winai.dto.request.UpdateInstanceConfigRequest;
import com.backend.winai.dto.request.CreateUserWhatsAppConnectionRequest;
import com.backend.winai.dto.request.CreateTermsRequest;
import com.backend.winai.dto.response.AdminConversationSummaryResponse;
import com.backend.winai.dto.marketing.CampaignsListResponse;
import com.backend.winai.dto.response.AdminEscutaSessionResponse;
import com.backend.winai.dto.response.AdminGoalCompanyRowResponse;
import com.backend.winai.dto.response.AdminGoalsForCompanyResponse;
import com.backend.winai.dto.response.AdminMetaAdsCompanyResponse;
import com.backend.winai.dto.response.AdminDashboardResponse;
import com.backend.winai.dto.response.AdminInstanceResponse;
import com.backend.winai.dto.response.AdminMeetingRowResponse;
import com.backend.winai.dto.response.AdminLeadResponse;
import com.backend.winai.dto.response.AdminUserResponse;
import com.backend.winai.dto.response.MeetingResponse;
import com.backend.winai.dto.response.WhatsAppMessageResponse;
import com.backend.winai.entity.LeadStatus;
import com.backend.winai.entity.MeetingStatus;
import com.backend.winai.dto.response.TermsOfServiceResponse;
import com.backend.winai.dto.response.UserTermsAcceptanceResponse;
import com.backend.winai.service.AdminService;
import com.backend.winai.service.TermsOfServiceService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import jakarta.validation.Valid;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/admin")
@RequiredArgsConstructor
@Tag(name = "Admin", description = "Endpoints de administração do sistema")
@SecurityRequirement(name = "bearerAuth")
@PreAuthorize("hasAnyRole('ADMIN','SUPER_ADMIN')")
public class AdminController {

    private final AdminService adminService;
    private final TermsOfServiceService termsOfServiceService;

    // ========== ESTATÍSTICAS ==========

    @Operation(summary = "Estatísticas do Sistema", description = "Retorna estatísticas gerais do sistema")
    @GetMapping("/stats")
    public ResponseEntity<Map<String, Object>> getSystemStats() {
        return ResponseEntity.ok(adminService.getSystemStats());
    }

    @Operation(summary = "Dashboard admin (Amplia)", description = "KPIs, próximos encontros e alertas recentes")
    @GetMapping("/dashboard")
    public ResponseEntity<AdminDashboardResponse> getAdminDashboard() {
        return ResponseEntity.ok(adminService.getAdminDashboard());
    }

    @Operation(summary = "CRM — listar leads (global)", description = "Leads de todas as empresas, com busca e filtro por status")
    @GetMapping("/crm/leads")
    public ResponseEntity<Page<AdminLeadResponse>> getCrmLeads(
            @Parameter(description = "Página (0-based)") @RequestParam(defaultValue = "0") int page,
            @Parameter(description = "Tamanho") @RequestParam(defaultValue = "50") int size,
            @Parameter(description = "Filtrar por status (enum LeadStatus)") @RequestParam(required = false) String status,
            @Parameter(description = "Busca em nome, email, telefone e empresa") @RequestParam(required = false) String q) {
        return ResponseEntity.ok(adminService.getAdminLeads(page, size, status, q));
    }

    @Operation(summary = "CRM — atualizar status do lead", description = "Atualiza estágio do funil (marca qualificação manual)")
    @PatchMapping("/crm/leads/{leadId}/status")
    public ResponseEntity<AdminLeadResponse> patchCrmLeadStatus(
            @PathVariable UUID leadId,
            @Valid @RequestBody AdminLeadStatusPatchRequest body) {
        LeadStatus st = LeadStatus.valueOf(body.getStatus().trim().toUpperCase());
        return ResponseEntity.ok(adminService.patchAdminLeadStatus(leadId, st));
    }

    @Operation(summary = "Atendimento — conversas WhatsApp (global)", description = "Lista conversas; opcionalmente filtra por empresa")
    @GetMapping("/atendimento/conversations")
    public ResponseEntity<Page<AdminConversationSummaryResponse>> getAtendimentoConversations(
            @Parameter(description = "Página (0-based)") @RequestParam(defaultValue = "0") int page,
            @Parameter(description = "Tamanho") @RequestParam(defaultValue = "30") int size,
            @Parameter(description = "Filtrar por empresa") @RequestParam(required = false) UUID companyId) {
        return ResponseEntity.ok(adminService.getAdminConversations(page, size, companyId));
    }

    @Operation(summary = "Atendimento — mensagens da conversa", description = "Histórico de mensagens (mesma regra do chat)")
    @GetMapping("/atendimento/conversations/{conversationId}/messages")
    public ResponseEntity<List<WhatsAppMessageResponse>> getAtendimentoMessages(
            @PathVariable UUID conversationId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "50") int limit) {
        return ResponseEntity.ok(adminService.getAdminConversationMessages(conversationId, page, limit));
    }

    @Operation(summary = "Escuta Inteligente — listar sessões (global)", description = "Sessões de análise de áudio/transcrição em todas as empresas")
    @GetMapping("/escuta/sessions")
    public ResponseEntity<Page<AdminEscutaSessionResponse>> listEscutaSessions(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "40") int size,
            @RequestParam(required = false) String q) {
        return ResponseEntity.ok(adminService.getAdminEscutaSessions(page, size, q));
    }

    @Operation(summary = "Escuta Inteligente — detalhe da sessão")
    @GetMapping("/escuta/sessions/{sessionId}")
    public ResponseEntity<AdminEscutaSessionResponse> getEscutaSession(@PathVariable UUID sessionId) {
        return ResponseEntity.ok(adminService.getAdminEscutaSession(sessionId));
    }

    @Operation(summary = "Escuta Inteligente — nova sessão", description = "Cria sessão vinculada a lead da empresa indicada")
    @PostMapping("/escuta/sessions")
    public ResponseEntity<AdminEscutaSessionResponse> startEscutaSession(@Valid @RequestBody AdminEscutaStartRequest body) {
        return ResponseEntity.ok(adminService.startAdminEscuta(body));
    }

    @Operation(summary = "Escuta Inteligente — enviar áudio e transcrever")
    @PostMapping(value = "/escuta/sessions/{sessionId}/audio", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<AdminEscutaSessionResponse> uploadEscutaAudio(
            @PathVariable UUID sessionId,
            @RequestParam("file") MultipartFile file) {
        return ResponseEntity.ok(adminService.uploadAdminEscutaAudio(sessionId, file));
    }

    @Operation(summary = "Escuta Inteligente — rodar análise IA (JSON no CRM)")
    @PostMapping("/escuta/sessions/{sessionId}/analyze")
    public ResponseEntity<AdminEscutaSessionResponse> analyzeEscutaSession(@PathVariable UUID sessionId) {
        return ResponseEntity.ok(adminService.analyzeAdminEscuta(sessionId));
    }

    @Operation(summary = "Escuta Inteligente — concluir e enviar resumo ao CRM (notas do lead)")
    @PostMapping("/escuta/sessions/{sessionId}/complete")
    public ResponseEntity<AdminEscutaSessionResponse> completeEscutaSession(@PathVariable UUID sessionId) {
        return ResponseEntity.ok(adminService.completeAdminEscuta(sessionId));
    }

    @Operation(summary = "Escuta Inteligente — excluir sessão")
    @DeleteMapping("/escuta/sessions/{sessionId}")
    public ResponseEntity<Void> deleteEscutaSession(@PathVariable UUID sessionId) {
        adminService.deleteAdminEscuta(sessionId);
        return ResponseEntity.noContent().build();
    }

    @Operation(summary = "Meta Ads — empresas e status de conexão", description = "Lista todas as empresas com dados da conexão Meta (Graph API)")
    @GetMapping("/meta-ads/companies")
    public ResponseEntity<List<AdminMetaAdsCompanyResponse>> listMetaAdsCompanies() {
        return ResponseEntity.ok(adminService.getAdminMetaAdsCompanies());
    }

    @Operation(summary = "Meta Ads — campanhas da empresa", description = "Mesma origem que o app cliente: campanhas sincronizadas no banco")
    @GetMapping("/meta-ads/companies/{companyId}/campaigns")
    public ResponseEntity<CampaignsListResponse> getMetaAdsCampaigns(@PathVariable UUID companyId) {
        return ResponseEntity.ok(adminService.getAdminMetaAdsCampaigns(companyId));
    }

    @Operation(summary = "Meta Ads — disparar sincronização", description = "Chama sync de campanhas/insights para a empresa (background)")
    @PostMapping("/meta-ads/companies/{companyId}/sync")
    public ResponseEntity<Map<String, String>> syncMetaAdsCompany(@PathVariable UUID companyId) {
        adminService.syncAdminMetaAdsForCompany(companyId);
        return ResponseEntity.ok(Map.of("status", "sync_started", "message", "Sincronização iniciada em background"));
    }

    @Operation(summary = "Metas — resumo por empresa (ciclo anual)", description = "Contagem de metas ativas no ano do ciclo")
    @GetMapping("/goals/companies")
    public ResponseEntity<List<AdminGoalCompanyRowResponse>> listGoalCompanies(
            @RequestParam(required = false) Integer year) {
        return ResponseEntity.ok(adminService.getAdminGoalCompanyRows(year));
    }

    @Operation(summary = "Metas — detalhe da empresa", description = "Mesma estrutura do dashboard: tarefas, checkpoints, progresso")
    @GetMapping("/goals/companies/{companyId}")
    public ResponseEntity<AdminGoalsForCompanyResponse> getGoalsForCompany(
            @PathVariable UUID companyId,
            @RequestParam(required = false) Integer year,
            @RequestParam(required = false) Integer planningMonth) {
        return ResponseEntity.ok(adminService.getAdminGoalsForCompany(companyId, year, planningMonth));
    }

    @Operation(summary = "Agenda comercial — listar reuniões", description = "Todas as empresas no período; filtro opcional por empresa e busca")
    @GetMapping("/agenda/meetings")
    public ResponseEntity<List<AdminMeetingRowResponse>> listAgendaMeetings(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate start,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate end,
            @RequestParam(required = false) UUID companyId,
            @RequestParam(required = false) String q) {
        return ResponseEntity.ok(adminService.getAdminAgenda(start, end, companyId, q));
    }

    @Operation(summary = "Agenda comercial — criar reunião", description = "Cria na empresa indicada (integração Google Calendar quando conectada)")
    @PostMapping("/agenda/meetings")
    public ResponseEntity<MeetingResponse> createAgendaMeeting(@Valid @RequestBody AdminMeetingCreateRequest body) {
        return ResponseEntity.ok(adminService.createAdminMeeting(body));
    }

    @Operation(summary = "Agenda comercial — alterar status")
    @PatchMapping("/agenda/meetings/{meetingId}/status")
    public ResponseEntity<MeetingResponse> patchAgendaMeetingStatus(
            @PathVariable UUID meetingId,
            @RequestParam MeetingStatus status) {
        return ResponseEntity.ok(adminService.patchAdminMeetingStatus(meetingId, status));
    }

    @Operation(summary = "Agenda comercial — excluir reunião")
    @DeleteMapping("/agenda/meetings/{meetingId}")
    public ResponseEntity<Void> deleteAgendaMeeting(@PathVariable UUID meetingId) {
        adminService.deleteAdminMeeting(meetingId);
        return ResponseEntity.noContent().build();
    }

    // ========== CRUD DE USUÁRIOS ==========

    @Operation(summary = "Listar Usuários", description = "Lista todos os usuários do sistema")
    @GetMapping("/users")
    public ResponseEntity<List<AdminUserResponse>> getAllUsers() {
        return ResponseEntity.ok(adminService.getAllUsers());
    }

    @Operation(summary = "Buscar Usuário por ID", description = "Retorna os dados de um usuário específico")
    @GetMapping("/users/{userId}")
    public ResponseEntity<AdminUserResponse> getUserById(
            @Parameter(description = "ID do usuário") @PathVariable UUID userId) {
        return ResponseEntity.ok(adminService.getUserById(userId));
    }

    @Operation(summary = "Criar Usuário", description = "Cria um novo usuário no sistema")
    @PostMapping("/users")
    public ResponseEntity<AdminUserResponse> createUser(@RequestBody AdminCreateUserRequest request) {
        return ResponseEntity.ok(adminService.createUser(request));
    }

    @Operation(summary = "Atualizar Usuário", description = "Atualiza dados de um usuário existente")
    @PutMapping("/users/{userId}")
    public ResponseEntity<AdminUserResponse> updateUser(
            @Parameter(description = "ID do usuário") @PathVariable UUID userId,
            @RequestBody AdminUpdateUserRequest request) {
        return ResponseEntity.ok(adminService.updateUser(userId, request));
    }

    @Operation(summary = "Ativar/Desativar Usuário", description = "Alterna o status de ativo/inativo de um usuário")
    @PutMapping("/users/{userId}/toggle-status")
    public ResponseEntity<Void> toggleUserStatus(
            @Parameter(description = "ID do usuário") @PathVariable UUID userId) {
        adminService.toggleUserStatus(userId);
        return ResponseEntity.ok().build();
    }

    @Operation(summary = "Excluir Usuário (Soft Delete)", description = "Desativa um usuário sem excluir do banco")
    @DeleteMapping("/users/{userId}")
    public ResponseEntity<Void> deleteUser(
            @Parameter(description = "ID do usuário") @PathVariable UUID userId) {
        adminService.deleteUser(userId);
        return ResponseEntity.ok().build();
    }

    @Operation(summary = "Excluir Usuário Permanentemente", description = "Remove definitivamente um usuário do banco")
    @DeleteMapping("/users/{userId}/permanent")
    public ResponseEntity<Void> hardDeleteUser(
            @Parameter(description = "ID do usuário") @PathVariable UUID userId) {
        adminService.hardDeleteUser(userId);
        return ResponseEntity.ok().build();
    }

    @Operation(summary = "Resetar Senha do Usuário", description = "Gera uma nova senha aleatória para o usuário e a retorna")
    @PostMapping("/users/{userId}/reset-password")
    public ResponseEntity<AdminUserResponse> resetUserPassword(
            @Parameter(description = "ID do usuário") @PathVariable UUID userId) {
        return ResponseEntity.ok(adminService.resetUserPassword(userId));
    }

    // ========== EMPRESAS ==========

    @Operation(summary = "Listar Empresas", description = "Lista todas as empresas do sistema")
    @GetMapping("/companies")
    public ResponseEntity<List<Map<String, Object>>> getAllCompanies() {
        return ResponseEntity.ok(adminService.getAllCompanies());
    }

    @Operation(summary = "Buscar Empresa por ID", description = "Retorna os dados de uma empresa específica")
    @GetMapping("/companies/{companyId}")
    public ResponseEntity<com.backend.winai.entity.Company> getCompanyById(
            @Parameter(description = "ID da empresa") @PathVariable UUID companyId) {
        return ResponseEntity.ok(adminService.getCompanyById(companyId));
    }

    @Operation(summary = "Criar Empresa", description = "Cria uma nova empresa no sistema")
    @PostMapping("/companies")
    public ResponseEntity<com.backend.winai.entity.Company> createCompany(
            @RequestBody com.backend.winai.dto.request.CreateCompanyRequest request) {
        return ResponseEntity.ok(adminService.createCompanyFromRequest(request));
    }

    @Operation(summary = "Atualizar Empresa", description = "Atualiza dados de uma empresa existente")
    @PutMapping("/companies/{companyId}")
    public ResponseEntity<com.backend.winai.entity.Company> updateCompany(
            @Parameter(description = "ID da empresa") @PathVariable UUID companyId,
            @RequestBody java.util.Map<String, Object> companyDetails) {
        return ResponseEntity.ok(adminService.updateCompanyFromMap(companyId, companyDetails));
    }

    @Operation(summary = "Excluir Empresa", description = "Remove uma empresa do sistema")
    @DeleteMapping("/companies/{companyId}")
    public ResponseEntity<Void> deleteCompany(
            @Parameter(description = "ID da empresa") @PathVariable UUID companyId) {
        adminService.deleteCompany(companyId);
        return ResponseEntity.ok().build();
    }

    // ========== PLANOS ==========

    @Operation(summary = "Listar Planos", description = "Lista todos os planos ativos do sistema")
    @GetMapping("/plans")
    public ResponseEntity<List<com.backend.winai.entity.Plan>> getAllPlans() {
        return ResponseEntity.ok(adminService.getAllPlans());
    }

    // ========== INSTÂNCIAS WHATSAPP ==========

    @Operation(summary = "Listar Instâncias", description = "Lista todas as instâncias WhatsApp com estatísticas")
    @GetMapping("/instances")
    public ResponseEntity<List<AdminInstanceResponse>> getAllInstances() {
        return ResponseEntity.ok(adminService.getAllInstances());
    }

    @Operation(summary = "Atualizar Configurações da Instância", description = "Atualiza webhook, integração e outros campos administrativos")
    @PutMapping("/instances/{instanceName}/config")
    public ResponseEntity<Void> updateInstanceConfig(
            @Parameter(description = "Nome da instância") @PathVariable String instanceName,
            @RequestBody UpdateInstanceConfigRequest request) {
        adminService.updateInstanceConfig(instanceName, request);
        return ResponseEntity.ok().build();
    }

    @Operation(summary = "Criar Instância", description = "Cria uma nova instância WhatsApp")
    @PostMapping("/instances")
    public ResponseEntity<Map<String, Object>> createInstance(
            @RequestBody com.backend.winai.dto.request.CreateUazapInstanceRequest request) {
        return ResponseEntity.ok(adminService.createInstance(request));
    }

    @Operation(summary = "Excluir Instância", description = "Remove uma instância WhatsApp")
    @DeleteMapping("/instances/{instanceName}")
    public ResponseEntity<Void> deleteInstance(
            @Parameter(description = "Nome da instância") @PathVariable String instanceName) {
        adminService.deleteInstance(instanceName);
        return ResponseEntity.ok().build();
    }

    @Operation(summary = "Conectar Instância", description = "Conecta uma instância ao WhatsApp (gera QR code)")
    @PostMapping("/instances/{instanceName}/connect")
    public ResponseEntity<Map<String, Object>> connectInstance(
            @Parameter(description = "Nome da instância") @PathVariable String instanceName) {
        return ResponseEntity.ok(adminService.connectInstance(instanceName));
    }

    @Operation(summary = "Desconectar Instância", description = "Desconecta uma instância do WhatsApp")
    @PostMapping("/instances/{instanceName}/disconnect")
    public ResponseEntity<Void> disconnectInstance(
            @Parameter(description = "Nome da instância") @PathVariable String instanceName) {
        adminService.disconnectInstance(instanceName);
        return ResponseEntity.ok().build();
    }

    @Operation(summary = "Obter Webhook Global", description = "Retorna a configuração do webhook global")
    @GetMapping("/globalwebhook")
    public ResponseEntity<com.backend.winai.dto.uazap.GlobalWebhookDTO> getGlobalWebhook() {
        return ResponseEntity.ok(adminService.getGlobalWebhook());
    }

    @Operation(summary = "Configurar Webhook Global", description = "Atualiza a configuração do webhook global")
    @PostMapping("/globalwebhook")
    public ResponseEntity<Void> setGlobalWebhook(
            @RequestBody com.backend.winai.dto.uazap.GlobalWebhookDTO request) {
        adminService.setGlobalWebhook(request);
        return ResponseEntity.ok().build();
    }

    @Operation(summary = "Atualizar Campos Administrativos", description = "Atualiza adminField01 e adminField02 de uma instância")
    @PostMapping("/instances/{instanceId}/admin-fields")
    public ResponseEntity<Void> updateAdminFields(
            @Parameter(description = "ID da instância") @PathVariable String instanceId,
            @RequestBody com.backend.winai.dto.request.UpdateAdminFieldsRequest request) {
        adminService.updateAdminFields(instanceId, request);
        return ResponseEntity.ok().build();
    }

    // ========== CONEXÕES WHATSAPP (EMPRESAS) ==========

    @Operation(summary = "Listar conexões WhatsApp", description = "Lista todas as conexões WhatsApp de empresas")
    @GetMapping("/user-whatsapp-connections")
    public ResponseEntity<List<Map<String, Object>>> getAllUserWhatsAppConnections() {
        return ResponseEntity.ok(adminService.getAllUserWhatsAppConnections());
    }

    @Operation(summary = "Criar conexão WhatsApp", description = "Associa uma instância WhatsApp a uma empresa")
    @PostMapping("/user-whatsapp-connections")
    public ResponseEntity<Object> createUserWhatsAppConnection(
            @RequestBody CreateUserWhatsAppConnectionRequest request) {
        return ResponseEntity.ok(adminService.createUserWhatsAppConnection(request));
    }

    @Operation(summary = "Alterar status da conexão", description = "Ativa ou desativa uma conexão")
    @PutMapping("/user-whatsapp-connections/{connectionId}")
    public ResponseEntity<Void> toggleUserWhatsAppConnectionStatus(
            @PathVariable UUID connectionId) {
        adminService.toggleUserWhatsAppConnectionStatus(connectionId);
        return ResponseEntity.ok().build();
    }

    @Operation(summary = "Remover conexão", description = "Remove uma conexão")
    @DeleteMapping("/user-whatsapp-connections/{connectionId}")
    public ResponseEntity<Void> deleteUserWhatsAppConnection(
            @PathVariable UUID connectionId) {
        adminService.deleteUserWhatsAppConnection(connectionId);
        return ResponseEntity.ok().build();
    }

    // ========== TERMOS DE SERVIÇO ==========

    @Operation(summary = "Listar Termos", description = "Lista todas as versões dos termos de serviço")
    @GetMapping("/terms")
    public ResponseEntity<List<TermsOfServiceResponse>> getAllTerms() {
        return ResponseEntity.ok(termsOfServiceService.getAllTerms());
    }

    @Operation(summary = "Criar Nova Versão", description = "Cria uma nova versão dos termos de serviço")
    @PostMapping("/terms")
    public ResponseEntity<TermsOfServiceResponse> createTerms(@RequestBody CreateTermsRequest request) {
        return ResponseEntity.ok(termsOfServiceService.createNewVersion(request));
    }

    @Operation(summary = "Status de Aceite", description = "Lista status de aceite dos termos por usuário")
    @GetMapping("/terms/acceptances")
    public ResponseEntity<List<UserTermsAcceptanceResponse>> getTermsAcceptances() {
        return ResponseEntity.ok(termsOfServiceService.getUsersAcceptanceStatus());
    }
}
