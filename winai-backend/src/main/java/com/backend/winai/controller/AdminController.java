package com.backend.winai.controller;

import com.backend.winai.dto.request.CreateAmpliaStaffRoleRequest;
import com.backend.winai.dto.request.CreateInternalStaffRequest;
import com.backend.winai.dto.request.PatchAmpliaStaffRoleRequest;
import com.backend.winai.dto.request.PatchInternalStaffRequest;
import com.backend.winai.dto.request.AdminMeetingCreateRequest;
import com.backend.winai.dto.request.AdminCreateUserRequest;
import com.backend.winai.dto.request.AdminEscutaStartRequest;
import com.backend.winai.dto.request.AdminLeadStatusPatchRequest;
import com.backend.winai.dto.request.AdminUpdateUserRequest;
import com.backend.winai.dto.request.PatchUserAppModulesRequest;
import com.backend.winai.dto.request.UpdateInstanceConfigRequest;
import com.backend.winai.dto.request.ClonePlanRequest;
import com.backend.winai.dto.request.CreatePlanRequest;
import com.backend.winai.dto.request.UpdatePlanRequest;
import com.backend.winai.dto.request.CreateUserWhatsAppConnectionRequest;
import com.backend.winai.dto.request.UpdateAgentDocumentRequest;
import com.backend.winai.dto.request.CreateTermsRequest;
import com.backend.winai.dto.response.AdminClientSummaryResponse;
import com.backend.winai.dto.response.AdminConversationSummaryResponse;
import com.backend.winai.dto.response.CompanyClientNoteResponse;
import com.backend.winai.dto.request.CreateCompanyClientNoteRequest;
import com.backend.winai.dto.marketing.CampaignsListResponse;
import com.backend.winai.dto.marketing.CreateCampaignRequest;
import com.backend.winai.dto.marketing.paidtraffic.UtmPerformanceResponse;
import com.backend.winai.dto.response.AdminEscutaSessionResponse;
import com.backend.winai.dto.response.AdminGoalCompanyRowResponse;
import com.backend.winai.dto.response.AdminGoalsForCompanyResponse;
import com.backend.winai.dto.response.AdminMetaAdsCompanyResponse;
import com.backend.winai.dto.response.AdminDashboardResponse;
import com.backend.winai.dto.response.AdminFinanceOverviewResponse;
import com.backend.winai.dto.response.AdminNotificationRowResponse;
import com.backend.winai.dto.response.AdminPerformanceSnapshotResponse;
import com.backend.winai.dto.response.CompanyAgentDocumentResponse;
import com.backend.winai.dto.response.AdminPlanManageResponse;
import com.backend.winai.dto.response.AdminInstanceResponse;
import com.backend.winai.dto.response.AdminLeadResponse;
import com.backend.winai.dto.response.AmpliaStaffRoleResponse;
import com.backend.winai.dto.response.AdminUserResponse;
import com.backend.winai.dto.response.CreateInternalStaffResponse;
import com.backend.winai.dto.response.InternalStaffMemberDashboardResponse;
import com.backend.winai.dto.response.InternalStaffMemberResponse;
import com.backend.winai.dto.response.MeetingResponse;
import com.backend.winai.dto.response.WhatsAppMessageResponse;
import com.backend.winai.entity.LeadStatus;
import com.backend.winai.entity.MeetingStatus;
import com.backend.winai.dto.response.TermsOfServiceResponse;
import com.backend.winai.dto.response.UserTermsAcceptanceResponse;
import com.backend.winai.service.CompanyAgentDocumentService;
import com.backend.winai.service.CompanyClientNoteService;
import com.backend.winai.service.AdminService;
import com.backend.winai.service.AmpliaStaffRoleService;
import com.backend.winai.service.InternalStaffService;
import com.backend.winai.service.TermsOfServiceService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import com.backend.winai.entity.User;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.web.bind.annotation.*;

import jakarta.validation.Valid;
import java.io.IOException;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/admin")
@RequiredArgsConstructor
@Tag(name = "Admin", description = "Endpoints de administração do sistema")
@SecurityRequirement(name = "bearerAuth")
public class AdminController {

    private final AdminService adminService;
    private final CompanyClientNoteService companyClientNoteService;
    private final CompanyAgentDocumentService companyAgentDocumentService;
    private final TermsOfServiceService termsOfServiceService;
    private final InternalStaffService internalStaffService;
    private final AmpliaStaffRoleService ampliaStaffRoleService;

    // ========== ESTATÍSTICAS ==========

    @PreAuthorize("@adminSecurity.hasPermission(authentication, 'dashboard', 'list')")
    @Operation(summary = "Estatísticas do Sistema", description = "Retorna estatísticas gerais do sistema")
    @GetMapping("/stats")
    public ResponseEntity<Map<String, Object>> getSystemStats() {
        return ResponseEntity.ok(adminService.getSystemStats());
    }

    @PreAuthorize("@adminSecurity.hasPermission(authentication, 'dashboard', 'read')")
    @Operation(summary = "Dashboard admin (Amplia)", description = "KPIs, próximos encontros e alertas recentes. Opcional: staffUserId = colaborador interno (visão SUPER_ADMIN).")
    @GetMapping("/dashboard")
    public ResponseEntity<AdminDashboardResponse> getAdminDashboard(
            @RequestParam(required = false) UUID staffUserId) {
        return ResponseEntity.ok(adminService.getAdminDashboard(staffUserId));
    }

    @PreAuthorize("@adminSecurity.hasPermission(authentication, 'financas', 'list')")
    @Operation(summary = "Finanças — visão consolidada", description = "MRR, inadimplência e linhas por empresa a partir de planos e assinaturas (cadastro). Opcional: mês para filtrar vencimentos; staffUserId = carteira do colaborador.")
    @GetMapping("/finance/overview")
    public ResponseEntity<AdminFinanceOverviewResponse> getAdminFinanceOverview(
            @RequestParam int year,
            @RequestParam(required = false) Integer month,
            @RequestParam(required = false) UUID staffUserId) {
        return ResponseEntity.ok(adminService.getAdminFinanceOverview(year, month, staffUserId));
    }

    @PreAuthorize("@adminSecurity.hasPermission(authentication, 'alertas', 'list')")
    @Operation(summary = "Alertas — notificações (paginado)", description = "Todas as notificações do sistema; filtros opcionais por empresa, lidas/não lidas e usuário (colaborador interno).")
    @GetMapping("/alerts/notifications")
    public ResponseEntity<Page<AdminNotificationRowResponse>> listAdminNotifications(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "30") int size,
            @RequestParam(required = false) UUID companyId,
            @RequestParam(required = false) Boolean read,
            @RequestParam(required = false) UUID staffUserId) {
        return ResponseEntity.ok(adminService.getAdminNotifications(page, size, companyId, read, staffUserId));
    }

    @PreAuthorize("@adminSecurity.hasPermission(authentication, 'alertas', 'update')")
    @Operation(summary = "Alertas — marcar como lida")
    @PatchMapping("/alerts/notifications/{id}/read")
    public ResponseEntity<Void> markAdminNotificationRead(@PathVariable UUID id) {
        adminService.markAdminNotificationRead(id);
        return ResponseEntity.noContent().build();
    }

    @PreAuthorize("@adminSecurity.hasPermission(authentication, 'performance', 'list')")
    @Operation(summary = "Performance — snapshot agregado", description = "CRM, metas, reuniões, Meta Ads (somas) e top empresas por investimento. Opcional: staffUserId = colaborador interno (leads/reuniões atribuídas).")
    @GetMapping("/performance/snapshot")
    public ResponseEntity<AdminPerformanceSnapshotResponse> getPerformanceSnapshot(
            @RequestParam(required = false) UUID staffUserId) {
        return ResponseEntity.ok(adminService.getAdminPerformanceSnapshot(staffUserId));
    }

    @PreAuthorize("hasAnyRole('ADMIN','SUPER_ADMIN')")
    @Operation(summary = "Papéis internos Amplia — listar (gestão completa)", description = "Somente administradores plenos.")
    @GetMapping("/internal-staff-roles")
    public ResponseEntity<List<AmpliaStaffRoleResponse>> listAmpliaStaffRoles() {
        return ResponseEntity.ok(ampliaStaffRoleService.listForAdmin());
    }

    @PreAuthorize("hasAnyRole('ADMIN','SUPER_ADMIN')")
    @Operation(summary = "Papéis internos Amplia — criar")
    @PostMapping("/internal-staff-roles")
    public ResponseEntity<AmpliaStaffRoleResponse> createAmpliaStaffRole(
            @Valid @RequestBody CreateAmpliaStaffRoleRequest request) {
        return ResponseEntity.ok(ampliaStaffRoleService.create(request));
    }

    @PreAuthorize("hasAnyRole('ADMIN','SUPER_ADMIN')")
    @Operation(summary = "Papéis internos Amplia — atualizar")
    @PatchMapping("/internal-staff-roles/{id}")
    public ResponseEntity<AmpliaStaffRoleResponse> patchAmpliaStaffRole(
            @PathVariable UUID id, @Valid @RequestBody PatchAmpliaStaffRoleRequest request) {
        return ResponseEntity.ok(ampliaStaffRoleService.update(id, request));
    }

    @PreAuthorize("hasAnyRole('ADMIN','SUPER_ADMIN')")
    @Operation(summary = "Papéis internos Amplia — excluir", description = "Recusado se houver colaborador vinculado ou papel legado seed.")
    @DeleteMapping("/internal-staff-roles/{id}")
    public ResponseEntity<Void> deleteAmpliaStaffRole(@PathVariable UUID id) {
        ampliaStaffRoleService.delete(id);
        return ResponseEntity.noContent().build();
    }

    @PreAuthorize("@adminSecurity.hasPermission(authentication, 'gestao_equipe', 'list')")
    @Operation(summary = "Papéis ativos — opções para atribuir colaborador", description = "Lista papéis ativos para select no cadastro de interno.")
    @GetMapping("/internal-staff-roles/select-options")
    public ResponseEntity<List<AmpliaStaffRoleResponse>> listAmpliaStaffRoleOptions() {
        return ResponseEntity.ok(ampliaStaffRoleService.listActiveForStaffForms());
    }

    @PreAuthorize("@adminSecurity.hasPermission(authentication, 'gestao_equipe', 'list')")
    @Operation(summary = "Equipe interna Amplia — listar")
    @GetMapping("/internal-staff")
    public ResponseEntity<List<InternalStaffMemberResponse>> listInternalStaff() {
        return ResponseEntity.ok(internalStaffService.listInternalStaff());
    }

    @PreAuthorize("@adminSecurity.hasPermission(authentication, 'gestao_equipe', 'create')")
    @Operation(summary = "Equipe interna Amplia — criar")
    @PostMapping("/internal-staff")
    public ResponseEntity<CreateInternalStaffResponse> createInternalStaff(
            @Valid @RequestBody CreateInternalStaffRequest request) {
        return ResponseEntity.ok(internalStaffService.create(request));
    }

    @PreAuthorize("@adminSecurity.hasPermission(authentication, 'gestao_equipe', 'update')")
    @Operation(summary = "Equipe interna Amplia — atualizar")
    @PatchMapping("/internal-staff/{id}")
    public ResponseEntity<InternalStaffMemberResponse> patchInternalStaff(
            @PathVariable UUID id,
            @RequestBody PatchInternalStaffRequest request) {
        return ResponseEntity.ok(internalStaffService.patch(id, request));
    }

    @PreAuthorize("@adminSecurity.hasPermission(authentication, 'gestao_equipe', 'read')")
    @Operation(summary = "Equipe interna Amplia — dashboard individual (gráficos)")
    @GetMapping("/internal-staff/{id}/dashboard")
    public ResponseEntity<InternalStaffMemberDashboardResponse> getInternalStaffDashboard(@PathVariable UUID id) {
        return ResponseEntity.ok(internalStaffService.getMemberDashboard(id));
    }

    @PreAuthorize("@adminSecurity.hasPermission(authentication, 'clientes', 'list')")
    @Operation(summary = "CRM — listar leads (global)", description = "Leads de todas as empresas, com busca e filtro por status. Opcional: staffUserId = só leads com responsável = colaborador interno.")
    @GetMapping("/crm/leads")
    public ResponseEntity<Page<AdminLeadResponse>> getCrmLeads(
            @Parameter(description = "Página (0-based)") @RequestParam(defaultValue = "0") int page,
            @Parameter(description = "Tamanho") @RequestParam(defaultValue = "50") int size,
            @Parameter(description = "Filtrar por status (enum LeadStatus)") @RequestParam(required = false) String status,
            @Parameter(description = "Busca em nome, email, telefone e empresa") @RequestParam(required = false) String q,
            @Parameter(description = "Colaborador interno (responsável pelo lead)") @RequestParam(required = false) UUID staffUserId) {
        return ResponseEntity.ok(adminService.getAdminLeads(page, size, status, q, staffUserId));
    }

    @PreAuthorize("@adminSecurity.hasPermission(authentication, 'clientes', 'update')")
    @Operation(summary = "CRM — atualizar status do lead", description = "Atualiza estágio do funil (marca qualificação manual)")
    @PatchMapping("/crm/leads/{leadId}/status")
    public ResponseEntity<AdminLeadResponse> patchCrmLeadStatus(
            @PathVariable UUID leadId,
            @Valid @RequestBody AdminLeadStatusPatchRequest body) {
        LeadStatus st = LeadStatus.valueOf(body.getStatus().trim().toUpperCase());
        return ResponseEntity.ok(adminService.patchAdminLeadStatus(leadId, st));
    }

    @PreAuthorize("@adminSecurity.hasPermission(authentication, 'clientes', 'list')")
    @Operation(summary = "Clientes — resumo (tabela admin)", description = "Uma linha por empresa: nicho, assinatura, último acesso, checkpoint e vendedor (CRM). Opcional: staffUserId = escopo do colaborador.")
    @GetMapping("/clients/summary")
    public ResponseEntity<List<AdminClientSummaryResponse>> getAdminClientsSummary(
            @RequestParam(required = false) UUID staffUserId) {
        return ResponseEntity.ok(adminService.getAdminClientsSummary(staffUserId));
    }

    @PreAuthorize("@adminSecurity.hasPermission(authentication, 'clientes', 'read')")
    @Operation(summary = "Clientes — notas persistidas por empresa")
    @GetMapping("/companies/{companyId}/client-notes")
    public ResponseEntity<List<CompanyClientNoteResponse>> listCompanyClientNotes(@PathVariable UUID companyId) {
        return ResponseEntity.ok(companyClientNoteService.listByCompany(companyId));
    }

    @PreAuthorize("@adminSecurity.hasPermission(authentication, 'clientes', 'create')")
    @Operation(summary = "Clientes — nova nota")
    @PostMapping("/companies/{companyId}/client-notes")
    public ResponseEntity<CompanyClientNoteResponse> createCompanyClientNote(
            @PathVariable UUID companyId,
            @Valid @RequestBody CreateCompanyClientNoteRequest body,
            @AuthenticationPrincipal User user) {
        return ResponseEntity.ok(companyClientNoteService.create(companyId, body, user));
    }

    @PreAuthorize("@adminSecurity.hasPermission(authentication, 'conexoes', 'list')")
    @Operation(summary = "Atendimento — conversas WhatsApp (global)", description = "Lista conversas; opcionalmente filtra por empresa")
    @GetMapping("/atendimento/conversations")
    public ResponseEntity<Page<AdminConversationSummaryResponse>> getAtendimentoConversations(
            @Parameter(description = "Página (0-based)") @RequestParam(defaultValue = "0") int page,
            @Parameter(description = "Tamanho") @RequestParam(defaultValue = "30") int size,
            @Parameter(description = "Filtrar por empresa") @RequestParam(required = false) UUID companyId) {
        return ResponseEntity.ok(adminService.getAdminConversations(page, size, companyId));
    }

    @PreAuthorize("@adminSecurity.hasPermission(authentication, 'conexoes', 'read')")
    @Operation(summary = "Atendimento — mensagens da conversa", description = "Histórico de mensagens (mesma regra do chat)")
    @GetMapping("/atendimento/conversations/{conversationId}/messages")
    public ResponseEntity<List<WhatsAppMessageResponse>> getAtendimentoMessages(
            @PathVariable UUID conversationId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "50") int limit) {
        return ResponseEntity.ok(adminService.getAdminConversationMessages(conversationId, page, limit));
    }

    @PreAuthorize("@adminSecurity.hasPermission(authentication, 'conexoes', 'update')")
    @Operation(summary = "Atendimento — marcar conversa como lida", description = "Zera o contador de não lidas (painel admin global)")
    @PutMapping("/atendimento/conversations/{conversationId}/read")
    public ResponseEntity<Void> markAtendimentoConversationRead(@PathVariable UUID conversationId) {
        adminService.markAdminAtendimentoConversationRead(conversationId);
        return ResponseEntity.ok().build();
    }

    @PreAuthorize("@adminSecurity.hasPermission(authentication, 'clientes', 'list')")
    @Operation(summary = "Escuta Inteligente — listar sessões (global)", description = "Sessões de análise de áudio/transcrição em todas as empresas")
    @GetMapping("/escuta/sessions")
    public ResponseEntity<Page<AdminEscutaSessionResponse>> listEscutaSessions(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "40") int size,
            @RequestParam(required = false) String q) {
        return ResponseEntity.ok(adminService.getAdminEscutaSessions(page, size, q));
    }

    @PreAuthorize("@adminSecurity.hasPermission(authentication, 'clientes', 'read')")
    @Operation(summary = "Escuta Inteligente — detalhe da sessão")
    @GetMapping("/escuta/sessions/{sessionId}")
    public ResponseEntity<AdminEscutaSessionResponse> getEscutaSession(@PathVariable UUID sessionId) {
        return ResponseEntity.ok(adminService.getAdminEscutaSession(sessionId));
    }

    @PreAuthorize("@adminSecurity.hasPermission(authentication, 'clientes', 'create')")
    @Operation(summary = "Escuta Inteligente — nova sessão", description = "Cria sessão vinculada a lead da empresa indicada")
    @PostMapping("/escuta/sessions")
    public ResponseEntity<AdminEscutaSessionResponse> startEscutaSession(@Valid @RequestBody AdminEscutaStartRequest body) {
        return ResponseEntity.ok(adminService.startAdminEscuta(body));
    }

    @PreAuthorize("@adminSecurity.hasPermission(authentication, 'clientes', 'update')")
    @Operation(summary = "Escuta Inteligente — enviar áudio e transcrever")
    @PostMapping(value = "/escuta/sessions/{sessionId}/audio", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<AdminEscutaSessionResponse> uploadEscutaAudio(
            @PathVariable UUID sessionId,
            @RequestParam("file") MultipartFile file) {
        return ResponseEntity.ok(adminService.uploadAdminEscutaAudio(sessionId, file));
    }

    @PreAuthorize("@adminSecurity.hasPermission(authentication, 'clientes', 'update')")
    @Operation(summary = "Escuta Inteligente — rodar análise IA (JSON no CRM)")
    @PostMapping("/escuta/sessions/{sessionId}/analyze")
    public ResponseEntity<AdminEscutaSessionResponse> analyzeEscutaSession(@PathVariable UUID sessionId) {
        return ResponseEntity.ok(adminService.analyzeAdminEscuta(sessionId));
    }

    @PreAuthorize("@adminSecurity.hasPermission(authentication, 'clientes', 'update')")
    @Operation(summary = "Escuta Inteligente — concluir e enviar resumo ao CRM (notas do lead)")
    @PostMapping("/escuta/sessions/{sessionId}/complete")
    public ResponseEntity<AdminEscutaSessionResponse> completeEscutaSession(@PathVariable UUID sessionId) {
        return ResponseEntity.ok(adminService.completeAdminEscuta(sessionId));
    }

    @PreAuthorize("@adminSecurity.hasPermission(authentication, 'clientes', 'delete')")
    @Operation(summary = "Escuta Inteligente — excluir sessão")
    @DeleteMapping("/escuta/sessions/{sessionId}")
    public ResponseEntity<Void> deleteEscutaSession(@PathVariable UUID sessionId) {
        adminService.deleteAdminEscuta(sessionId);
        return ResponseEntity.noContent().build();
    }

    @PreAuthorize("@adminSecurity.hasPermission(authentication, 'metaads', 'list')")
    @Operation(summary = "Meta Ads — empresas e status de conexão", description = "Lista todas as empresas com dados da conexão Meta (Graph API)")
    @GetMapping("/meta-ads/companies")
    public ResponseEntity<List<AdminMetaAdsCompanyResponse>> listMetaAdsCompanies() {
        return ResponseEntity.ok(adminService.getAdminMetaAdsCompanies());
    }

    @PreAuthorize("@adminSecurity.hasPermission(authentication, 'metaads', 'read')")
    @Operation(summary = "Meta Ads — campanhas da empresa", description = "Mesma origem que o app cliente: campanhas sincronizadas no banco")
    @GetMapping("/meta-ads/companies/{companyId}/campaigns")
    public ResponseEntity<CampaignsListResponse> getMetaAdsCampaigns(@PathVariable UUID companyId) {
        return ResponseEntity.ok(adminService.getAdminMetaAdsCampaigns(companyId));
    }

    @PreAuthorize("@adminSecurity.hasPermission(authentication, 'metaads', 'read')")
    @Operation(summary = "Meta Ads — performance UTM por empresa", description = "Mesma lógica que Campanhas no app: leads + gasto Meta no período")
    @GetMapping("/meta-ads/companies/{companyId}/utm-performance")
    public ResponseEntity<UtmPerformanceResponse> getMetaAdsUtmPerformance(
            @PathVariable UUID companyId,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate) {
        return ResponseEntity.ok(adminService.getAdminMetaAdsUtmPerformance(companyId, startDate, endDate));
    }

    @PreAuthorize("@adminSecurity.hasPermission(authentication, 'metaads', 'update')")
    @Operation(summary = "Meta Ads — disparar sincronização", description = "Chama sync de campanhas/insights para a empresa (background)")
    @PostMapping("/meta-ads/companies/{companyId}/sync")
    public ResponseEntity<Map<String, String>> syncMetaAdsCompany(@PathVariable UUID companyId) {
        adminService.syncAdminMetaAdsForCompany(companyId);
        return ResponseEntity.ok(Map.of("status", "sync_started", "message", "Sincronização iniciada em background"));
    }

    @PreAuthorize("@adminSecurity.hasPermission(authentication, 'metaads', 'update')")
    @Operation(summary = "Meta Ads — criar campanha (WhatsApp)", description = "Marketing API para a empresa selecionada; mesmo fluxo que o app cliente.")
    @PostMapping("/meta-ads/companies/{companyId}/campaigns")
    public ResponseEntity<Void> createAdminMetaAdsCampaign(
            @PathVariable UUID companyId,
            @Valid @RequestBody CreateCampaignRequest request) {
        adminService.createAdminMetaAdsCampaign(companyId, request);
        return ResponseEntity.ok().build();
    }

    @PreAuthorize("@adminSecurity.hasPermission(authentication, 'metaads', 'update')")
    @Operation(summary = "Meta Ads — upload de imagem para criativo")
    @PostMapping(value = "/meta-ads/upload-image", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<Map<String, String>> uploadAdminMetaAdsCampaignImage(@RequestParam("file") MultipartFile file)
            throws IOException {
        return ResponseEntity.ok(adminService.uploadAdminMetaAdsCampaignImage(file));
    }

    @PreAuthorize("@adminSecurity.hasPermission(authentication, 'metas', 'list')")
    @Operation(summary = "Metas — resumo por empresa (ciclo anual)", description = "Contagem de metas ativas no ano do ciclo")
    @GetMapping("/goals/companies")
    public ResponseEntity<List<AdminGoalCompanyRowResponse>> listGoalCompanies(
            @RequestParam(required = false) Integer year) {
        return ResponseEntity.ok(adminService.getAdminGoalCompanyRows(year));
    }

    @PreAuthorize("@adminSecurity.hasPermission(authentication, 'metas', 'read')")
    @Operation(summary = "Metas — detalhe da empresa", description = "Mesma estrutura do dashboard: tarefas, checkpoints, progresso")
    @GetMapping("/goals/companies/{companyId}")
    public ResponseEntity<AdminGoalsForCompanyResponse> getGoalsForCompany(
            @PathVariable UUID companyId,
            @RequestParam(required = false) Integer year,
            @RequestParam(required = false) Integer planningMonth) {
        return ResponseEntity.ok(adminService.getAdminGoalsForCompany(companyId, year, planningMonth));
    }

    @PreAuthorize("@adminSecurity.hasPermission(authentication, 'clientes', 'list')")
    @Operation(
            summary = "Agenda comercial — listar reuniões",
            description = "Sem page/size: lista completa no período. Com page e/ou size: resposta paginada (ordem: data e hora).")
    @GetMapping("/agenda/meetings")
    public ResponseEntity<?> listAgendaMeetings(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate start,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate end,
            @RequestParam(required = false) UUID companyId,
            @RequestParam(required = false) String q,
            @RequestParam(required = false) Integer page,
            @RequestParam(required = false) Integer size) {
        if (page != null || size != null) {
            int p = page != null ? page : 0;
            int s = size != null ? Math.min(Math.max(size, 1), 100) : 12;
            return ResponseEntity.ok(adminService.getAdminAgendaPage(start, end, companyId, q, p, s));
        }
        return ResponseEntity.ok(adminService.getAdminAgenda(start, end, companyId, q));
    }

    @PreAuthorize("@adminSecurity.hasPermission(authentication, 'clientes', 'create')")
    @Operation(summary = "Agenda comercial — criar reunião", description = "Cria na empresa indicada (integração Google Calendar quando conectada)")
    @PostMapping("/agenda/meetings")
    public ResponseEntity<MeetingResponse> createAgendaMeeting(@Valid @RequestBody AdminMeetingCreateRequest body) {
        return ResponseEntity.ok(adminService.createAdminMeeting(body));
    }

    @PreAuthorize("@adminSecurity.hasPermission(authentication, 'clientes', 'update')")
    @Operation(summary = "Agenda comercial — alterar status")
    @PatchMapping("/agenda/meetings/{meetingId}/status")
    public ResponseEntity<MeetingResponse> patchAgendaMeetingStatus(
            @PathVariable UUID meetingId,
            @RequestParam MeetingStatus status) {
        return ResponseEntity.ok(adminService.patchAdminMeetingStatus(meetingId, status));
    }

    @PreAuthorize("@adminSecurity.hasPermission(authentication, 'clientes', 'delete')")
    @Operation(summary = "Agenda comercial — excluir reunião")
    @DeleteMapping("/agenda/meetings/{meetingId}")
    public ResponseEntity<Void> deleteAgendaMeeting(@PathVariable UUID meetingId) {
        adminService.deleteAdminMeeting(meetingId);
        return ResponseEntity.noContent().build();
    }

    // ========== CRUD DE USUÁRIOS ==========

    @PreAuthorize("@adminSecurity.hasPermission(authentication, 'usuarios', 'list')")
    @Operation(
            summary = "Listar Usuários",
            description = "Sem page/size: lista completa (ex.: tela Clientes). Com page e/ou size: página com busca opcional q (nome, e-mail, empresa).")
    @GetMapping("/users")
    public ResponseEntity<?> getUsers(
            @RequestParam(required = false) Integer page,
            @RequestParam(required = false) Integer size,
            @RequestParam(required = false) String q) {
        if (page != null || size != null) {
            int p = page != null ? page : 0;
            int s = size != null ? Math.min(Math.max(size, 1), 100) : 12;
            return ResponseEntity.ok(adminService.getAdminUsersPage(p, s, q));
        }
        return ResponseEntity.ok(adminService.getAllUsers());
    }

    @PreAuthorize("@adminSecurity.hasPermission(authentication, 'usuarios', 'read')")
    @Operation(summary = "Buscar Usuário por ID", description = "Retorna os dados de um usuário específico")
    @GetMapping("/users/{userId}")
    public ResponseEntity<AdminUserResponse> getUserById(
            @Parameter(description = "ID do usuário") @PathVariable UUID userId) {
        return ResponseEntity.ok(adminService.getUserById(userId));
    }

    @PreAuthorize("@adminSecurity.hasPermission(authentication, 'usuarios', 'create')")
    @Operation(summary = "Criar Usuário", description = "Cria um novo usuário no sistema")
    @PostMapping("/users")
    public ResponseEntity<AdminUserResponse> createUser(@RequestBody AdminCreateUserRequest request) {
        return ResponseEntity.ok(adminService.createUser(request));
    }

    @PreAuthorize("@adminSecurity.hasPermission(authentication, 'usuarios', 'update')")
    @Operation(summary = "Atualizar Usuário", description = "Atualiza dados de um usuário existente")
    @PutMapping("/users/{userId}")
    public ResponseEntity<AdminUserResponse> updateUser(
            @Parameter(description = "ID do usuário") @PathVariable UUID userId,
            @RequestBody AdminUpdateUserRequest request) {
        return ResponseEntity.ok(adminService.updateUser(userId, request));
    }

    @PreAuthorize("@adminSecurity.hasPermission(authentication, 'usuarios', 'update')")
    @Operation(
            summary = "Permissões do app cliente (Somoswin)",
            description = "Define módulos visíveis no app da empresa (CRM, Atendimento, etc.). Separado do painel /admin.")
    @PatchMapping("/users/{userId}/app-modules")
    public ResponseEntity<AdminUserResponse> patchUserAppModules(
            @Parameter(description = "ID do usuário") @PathVariable UUID userId,
            @Valid @RequestBody PatchUserAppModulesRequest request) {
        return ResponseEntity.ok(adminService.patchUserAppModules(userId, request));
    }

    @PreAuthorize("@adminSecurity.hasPermission(authentication, 'usuarios', 'update')")
    @Operation(summary = "Ativar/Desativar Usuário", description = "Alterna o status de ativo/inativo de um usuário")
    @PutMapping("/users/{userId}/toggle-status")
    public ResponseEntity<Void> toggleUserStatus(
            @Parameter(description = "ID do usuário") @PathVariable UUID userId) {
        adminService.toggleUserStatus(userId);
        return ResponseEntity.ok().build();
    }

    @PreAuthorize("@adminSecurity.hasPermission(authentication, 'usuarios', 'delete')")
    @Operation(summary = "Excluir Usuário (Soft Delete)", description = "Desativa um usuário sem excluir do banco")
    @DeleteMapping("/users/{userId}")
    public ResponseEntity<Void> deleteUser(
            @Parameter(description = "ID do usuário") @PathVariable UUID userId) {
        adminService.deleteUser(userId);
        return ResponseEntity.ok().build();
    }

    @PreAuthorize("@adminSecurity.hasPermission(authentication, 'usuarios', 'delete')")
    @Operation(summary = "Excluir Usuário Permanentemente", description = "Remove definitivamente um usuário do banco")
    @DeleteMapping("/users/{userId}/permanent")
    public ResponseEntity<Void> hardDeleteUser(
            @Parameter(description = "ID do usuário") @PathVariable UUID userId) {
        adminService.hardDeleteUser(userId);
        return ResponseEntity.ok().build();
    }

    @PreAuthorize("@adminSecurity.hasPermission(authentication, 'usuarios', 'update')")
    @Operation(summary = "Resetar Senha do Usuário", description = "Gera uma nova senha aleatória para o usuário e a retorna")
    @PostMapping("/users/{userId}/reset-password")
    public ResponseEntity<AdminUserResponse> resetUserPassword(
            @Parameter(description = "ID do usuário") @PathVariable UUID userId) {
        return ResponseEntity.ok(adminService.resetUserPassword(userId));
    }

    // ========== EMPRESAS ==========

    @PreAuthorize("@adminSecurity.hasPermission(authentication, 'contratos', 'list')")
    @Operation(summary = "Listar Empresas", description = "Lista todas as empresas do sistema")
    @GetMapping("/companies")
    public ResponseEntity<List<Map<String, Object>>> getAllCompanies() {
        return ResponseEntity.ok(adminService.getAllCompanies());
    }

    @PreAuthorize("@adminSecurity.hasPermission(authentication, 'contratos', 'read')")
    @Operation(summary = "Buscar Empresa por ID", description = "Retorna os dados de uma empresa específica")
    @GetMapping("/companies/{companyId}")
    public ResponseEntity<com.backend.winai.entity.Company> getCompanyById(
            @Parameter(description = "ID da empresa") @PathVariable UUID companyId) {
        return ResponseEntity.ok(adminService.getCompanyById(companyId));
    }

    @PreAuthorize("@adminSecurity.hasPermission(authentication, 'contratos', 'create')")
    @Operation(summary = "Criar Empresa", description = "Cria uma nova empresa no sistema")
    @PostMapping("/companies")
    public ResponseEntity<com.backend.winai.entity.Company> createCompany(
            @RequestBody com.backend.winai.dto.request.CreateCompanyRequest request) {
        return ResponseEntity.ok(adminService.createCompanyFromRequest(request));
    }

    @PreAuthorize("@adminSecurity.hasPermission(authentication, 'contratos', 'update')")
    @Operation(summary = "Atualizar Empresa", description = "Atualiza dados de uma empresa existente")
    @PutMapping("/companies/{companyId}")
    public ResponseEntity<com.backend.winai.entity.Company> updateCompany(
            @Parameter(description = "ID da empresa") @PathVariable UUID companyId,
            @RequestBody java.util.Map<String, Object> companyDetails) {
        return ResponseEntity.ok(adminService.updateCompanyFromMap(companyId, companyDetails));
    }

    @PreAuthorize("@adminSecurity.hasPermission(authentication, 'contratos', 'delete') or @adminSecurity.hasPermission(authentication, 'clientes', 'delete')")
    @Operation(summary = "Excluir Empresa", description = "Remove uma empresa do sistema (cascata: CRM, metas, agenda, WhatsApp, bases, integrações, etc.)")
    @DeleteMapping("/companies/{companyId}")
    public ResponseEntity<Void> deleteCompany(
            @Parameter(description = "ID da empresa") @PathVariable UUID companyId) {
        adminService.deleteCompany(companyId);
        return ResponseEntity.ok().build();
    }

    // ========== PLANOS ==========

    @PreAuthorize("@adminSecurity.hasPermission(authentication, 'contratos', 'list') or @adminSecurity.hasPermission(authentication, 'planos', 'list')")
    @Operation(summary = "Listar Planos", description = "Lista todos os planos ativos do sistema")
    @GetMapping("/plans")
    public ResponseEntity<List<com.backend.winai.entity.Plan>> getAllPlans() {
        return ResponseEntity.ok(adminService.getAllPlans());
    }

    @PreAuthorize("@adminSecurity.hasPermission(authentication, 'planos', 'list')")
    @Operation(summary = "Listar planos (gestão)", description = "Lista todos os planos com contagens de uso (ativos e inativos)")
    @GetMapping("/plans/manage")
    public ResponseEntity<List<AdminPlanManageResponse>> getAllPlansForManage() {
        return ResponseEntity.ok(adminService.getAllPlansForManage());
    }

    @PreAuthorize("@adminSecurity.hasPermission(authentication, 'contratos', 'list') or @adminSecurity.hasPermission(authentication, 'planos', 'list')")
    @Operation(summary = "Buscar plano por ID", description = "Detalhe do plano para contratos ou gestão")
    @GetMapping("/plans/{planId}")
    public ResponseEntity<AdminPlanManageResponse> getPlanById(
            @Parameter(description = "ID do plano") @PathVariable UUID planId) {
        return ResponseEntity.ok(adminService.getPlanForManage(planId));
    }

    @PreAuthorize("@adminSecurity.hasPermission(authentication, 'planos', 'create')")
    @Operation(summary = "Criar plano", description = "Adiciona plano ao catálogo")
    @PostMapping("/plans")
    public ResponseEntity<AdminPlanManageResponse> createPlan(@Valid @RequestBody CreatePlanRequest request) {
        return ResponseEntity.ok(adminService.createPlan(request));
    }

    @PreAuthorize("@adminSecurity.hasPermission(authentication, 'planos', 'update')")
    @Operation(summary = "Atualizar plano", description = "Atualiza campos do plano")
    @PutMapping("/plans/{planId}")
    public ResponseEntity<AdminPlanManageResponse> updatePlan(
            @Parameter(description = "ID do plano") @PathVariable UUID planId,
            @RequestBody UpdatePlanRequest request) {
        return ResponseEntity.ok(adminService.updatePlan(planId, request));
    }

    @PreAuthorize("@adminSecurity.hasPermission(authentication, 'planos', 'create')")
    @Operation(summary = "Clonar plano", description = "Duplica plano (novo slug e preço opcional)")
    @PostMapping("/plans/{planId}/clone")
    public ResponseEntity<AdminPlanManageResponse> clonePlan(
            @Parameter(description = "ID do plano fonte") @PathVariable UUID planId,
            @Valid @RequestBody ClonePlanRequest request) {
        return ResponseEntity.ok(adminService.clonePlan(planId, request));
    }

    @PreAuthorize("@adminSecurity.hasPermission(authentication, 'planos', 'delete')")
    @Operation(summary = "Arquivar plano", description = "Define plano como inativo")
    @PatchMapping("/plans/{planId}/archive")
    public ResponseEntity<Void> archivePlan(@Parameter(description = "ID do plano") @PathVariable UUID planId) {
        adminService.archivePlan(planId);
        return ResponseEntity.ok().build();
    }

    @PreAuthorize("@adminSecurity.hasPermission(authentication, 'planos', 'delete')")
    @Operation(summary = "Excluir plano", description = "Remove plano se não houver empresas vinculadas")
    @DeleteMapping("/plans/{planId}")
    public ResponseEntity<Void> deletePlan(@Parameter(description = "ID do plano") @PathVariable UUID planId) {
        adminService.deletePlanIfUnused(planId);
        return ResponseEntity.ok().build();
    }

    // ========== DOCUMENTOS DO AGENTE (SUPABASE) ==========

    @PreAuthorize("@adminSecurity.hasPermission(authentication, 'documentos', 'list')")
    @Operation(summary = "Listar documentos do agente", description = "Metadados dos arquivos por empresa")
    @GetMapping("/companies/{companyId}/agent-documents")
    public ResponseEntity<List<CompanyAgentDocumentResponse>> listAgentDocuments(
            @Parameter(description = "ID da empresa") @PathVariable UUID companyId) {
        return ResponseEntity.ok(companyAgentDocumentService.listByCompany(companyId));
    }

    @PreAuthorize("@adminSecurity.hasPermission(authentication, 'documentos', 'create')")
    @Operation(summary = "Upload documento do agente", description = "Envia arquivo ao Supabase Storage e registra metadados")
    @PostMapping(value = "/companies/{companyId}/agent-documents", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<CompanyAgentDocumentResponse> uploadAgentDocument(
            @Parameter(description = "ID da empresa") @PathVariable UUID companyId,
            @RequestParam String title,
            @RequestParam("file") MultipartFile file,
            @RequestParam(required = false) String sendWhenInstructions) throws IOException {
        return ResponseEntity.ok(companyAgentDocumentService.upload(companyId, title, file, sendWhenInstructions));
    }

    @PreAuthorize("@adminSecurity.hasPermission(authentication, 'documentos', 'update')")
    @Operation(summary = "Atualizar metadados do documento do agente", description = "Título e/ou instruções de quando enviar (catálogo da IA)")
    @PatchMapping("/agent-documents/{documentId}")
    public ResponseEntity<CompanyAgentDocumentResponse> patchAgentDocument(
            @Parameter(description = "ID do documento") @PathVariable UUID documentId,
            @Valid @RequestBody UpdateAgentDocumentRequest request) {
        return ResponseEntity.ok(companyAgentDocumentService.update(documentId, request));
    }

    @PreAuthorize("@adminSecurity.hasPermission(authentication, 'documentos', 'read')")
    @Operation(summary = "Detalhe documento do agente")
    @GetMapping("/agent-documents/{documentId}")
    public ResponseEntity<CompanyAgentDocumentResponse> getAgentDocument(
            @Parameter(description = "ID do documento") @PathVariable UUID documentId) {
        return ResponseEntity.ok(companyAgentDocumentService.getById(documentId));
    }

    @PreAuthorize("@adminSecurity.hasPermission(authentication, 'documentos', 'delete')")
    @Operation(summary = "Excluir documento do agente")
    @DeleteMapping("/agent-documents/{documentId}")
    public ResponseEntity<Void> deleteAgentDocument(
            @Parameter(description = "ID do documento") @PathVariable UUID documentId) {
        companyAgentDocumentService.delete(documentId);
        return ResponseEntity.noContent().build();
    }

    // ========== INSTÂNCIAS WHATSAPP ==========

    @PreAuthorize("@adminSecurity.hasPermission(authentication, 'instancias', 'list')")
    @Operation(summary = "Listar Instâncias", description = "Lista todas as instâncias WhatsApp com estatísticas")
    @GetMapping("/instances")
    public ResponseEntity<List<AdminInstanceResponse>> getAllInstances() {
        return ResponseEntity.ok(adminService.getAllInstances());
    }

    @PreAuthorize("@adminSecurity.hasPermission(authentication, 'instancias', 'update')")
    @Operation(summary = "Atualizar Configurações da Instância", description = "Atualiza webhook, integração e outros campos administrativos")
    @PutMapping("/instances/{instanceName}/config")
    public ResponseEntity<Void> updateInstanceConfig(
            @Parameter(description = "Nome da instância") @PathVariable String instanceName,
            @RequestBody UpdateInstanceConfigRequest request) {
        adminService.updateInstanceConfig(instanceName, request);
        return ResponseEntity.ok().build();
    }

    @PreAuthorize("@adminSecurity.hasPermission(authentication, 'instancias', 'create')")
    @Operation(summary = "Criar Instância", description = "Cria uma nova instância WhatsApp")
    @PostMapping("/instances")
    public ResponseEntity<Map<String, Object>> createInstance(
            @RequestBody com.backend.winai.dto.request.CreateUazapInstanceRequest request) {
        return ResponseEntity.ok(adminService.createInstance(request));
    }

    @PreAuthorize("@adminSecurity.hasPermission(authentication, 'instancias', 'delete')")
    @Operation(summary = "Excluir Instância", description = "Remove uma instância WhatsApp")
    @DeleteMapping("/instances/{instanceName}")
    public ResponseEntity<Void> deleteInstance(
            @Parameter(description = "Nome da instância") @PathVariable String instanceName) {
        adminService.deleteInstance(instanceName);
        return ResponseEntity.ok().build();
    }

    @PreAuthorize("@adminSecurity.hasPermission(authentication, 'instancias', 'update')")
    @Operation(summary = "Conectar Instância", description = "Conecta uma instância ao WhatsApp (gera QR code)")
    @PostMapping("/instances/{instanceName}/connect")
    public ResponseEntity<Map<String, Object>> connectInstance(
            @Parameter(description = "Nome da instância") @PathVariable String instanceName) {
        return ResponseEntity.ok(adminService.connectInstance(instanceName));
    }

    @PreAuthorize("@adminSecurity.hasPermission(authentication, 'instancias', 'update')")
    @Operation(summary = "Desconectar Instância", description = "Desconecta uma instância do WhatsApp")
    @PostMapping("/instances/{instanceName}/disconnect")
    public ResponseEntity<Void> disconnectInstance(
            @Parameter(description = "Nome da instância") @PathVariable String instanceName) {
        adminService.disconnectInstance(instanceName);
        return ResponseEntity.ok().build();
    }

    @PreAuthorize("@adminSecurity.hasPermission(authentication, 'instancias', 'read')")
    @Operation(summary = "Obter Webhook Global", description = "Retorna a configuração do webhook global")
    @GetMapping("/globalwebhook")
    public ResponseEntity<com.backend.winai.dto.uazap.GlobalWebhookDTO> getGlobalWebhook() {
        return ResponseEntity.ok(adminService.getGlobalWebhook());
    }

    @PreAuthorize("@adminSecurity.hasPermission(authentication, 'instancias', 'update')")
    @Operation(summary = "Configurar Webhook Global", description = "Atualiza a configuração do webhook global")
    @PostMapping("/globalwebhook")
    public ResponseEntity<Void> setGlobalWebhook(
            @RequestBody com.backend.winai.dto.uazap.GlobalWebhookDTO request) {
        adminService.setGlobalWebhook(request);
        return ResponseEntity.ok().build();
    }

    @PreAuthorize("@adminSecurity.hasPermission(authentication, 'instancias', 'update')")
    @Operation(summary = "Atualizar Campos Administrativos", description = "Atualiza adminField01 e adminField02 de uma instância")
    @PostMapping("/instances/{instanceId}/admin-fields")
    public ResponseEntity<Void> updateAdminFields(
            @Parameter(description = "ID da instância") @PathVariable String instanceId,
            @RequestBody com.backend.winai.dto.request.UpdateAdminFieldsRequest request) {
        adminService.updateAdminFields(instanceId, request);
        return ResponseEntity.ok().build();
    }

    // ========== CONEXÕES WHATSAPP (EMPRESAS) ==========

    @PreAuthorize("@adminSecurity.hasPermission(authentication, 'conexoes', 'list')")
    @Operation(summary = "Listar conexões WhatsApp", description = "Lista todas as conexões WhatsApp de empresas")
    @GetMapping("/user-whatsapp-connections")
    public ResponseEntity<List<Map<String, Object>>> getAllUserWhatsAppConnections() {
        return ResponseEntity.ok(adminService.getAllUserWhatsAppConnections());
    }

    @PreAuthorize("@adminSecurity.hasPermission(authentication, 'conexoes', 'create')")
    @Operation(summary = "Criar conexão WhatsApp", description = "Associa uma instância WhatsApp a uma empresa")
    @PostMapping("/user-whatsapp-connections")
    public ResponseEntity<Object> createUserWhatsAppConnection(
            @RequestBody CreateUserWhatsAppConnectionRequest request) {
        return ResponseEntity.ok(adminService.createUserWhatsAppConnection(request));
    }

    @PreAuthorize("@adminSecurity.hasPermission(authentication, 'conexoes', 'update')")
    @Operation(summary = "Alterar status da conexão", description = "Ativa ou desativa uma conexão")
    @PutMapping("/user-whatsapp-connections/{connectionId}")
    public ResponseEntity<Void> toggleUserWhatsAppConnectionStatus(
            @PathVariable UUID connectionId) {
        adminService.toggleUserWhatsAppConnectionStatus(connectionId);
        return ResponseEntity.ok().build();
    }

    @PreAuthorize("@adminSecurity.hasPermission(authentication, 'conexoes', 'delete')")
    @Operation(summary = "Remover conexão", description = "Remove uma conexão")
    @DeleteMapping("/user-whatsapp-connections/{connectionId}")
    public ResponseEntity<Void> deleteUserWhatsAppConnection(
            @PathVariable UUID connectionId) {
        adminService.deleteUserWhatsAppConnection(connectionId);
        return ResponseEntity.ok().build();
    }

    // ========== TERMOS DE SERVIÇO ==========

    @PreAuthorize("@adminSecurity.hasPermission(authentication, 'contratos', 'list')")
    @Operation(summary = "Listar Termos", description = "Lista todas as versões dos termos de serviço")
    @GetMapping("/terms")
    public ResponseEntity<List<TermsOfServiceResponse>> getAllTerms() {
        return ResponseEntity.ok(termsOfServiceService.getAllTerms());
    }

    @PreAuthorize("@adminSecurity.hasPermission(authentication, 'contratos', 'create')")
    @Operation(summary = "Criar Nova Versão", description = "Cria uma nova versão dos termos de serviço")
    @PostMapping("/terms")
    public ResponseEntity<TermsOfServiceResponse> createTerms(@RequestBody CreateTermsRequest request) {
        return ResponseEntity.ok(termsOfServiceService.createNewVersion(request));
    }

    @PreAuthorize("@adminSecurity.hasPermission(authentication, 'contratos', 'read')")
    @Operation(summary = "Status de Aceite", description = "Lista status de aceite dos termos por usuário")
    @GetMapping("/terms/acceptances")
    public ResponseEntity<List<UserTermsAcceptanceResponse>> getTermsAcceptances() {
        return ResponseEntity.ok(termsOfServiceService.getUsersAcceptanceStatus());
    }
}
