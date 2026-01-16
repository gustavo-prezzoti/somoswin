package com.backend.winai.controller;

import com.backend.winai.dto.request.AdminCreateUserRequest;
import com.backend.winai.dto.request.AdminUpdateUserRequest;
import com.backend.winai.dto.request.UpdateInstanceConfigRequest;
import com.backend.winai.dto.request.CreateUserWhatsAppConnectionRequest;
import com.backend.winai.dto.response.AdminInstanceResponse;
import com.backend.winai.dto.response.AdminUserResponse;
import com.backend.winai.service.AdminService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/admin")
@RequiredArgsConstructor
@Tag(name = "Admin", description = "Endpoints de administração do sistema")
@SecurityRequirement(name = "bearerAuth")
@PreAuthorize("hasRole('ADMIN')")
public class AdminController {

    private final AdminService adminService;

    // ========== ESTATÍSTICAS ==========

    @Operation(summary = "Estatísticas do Sistema", description = "Retorna estatísticas gerais do sistema")
    @GetMapping("/stats")
    public ResponseEntity<Map<String, Object>> getSystemStats() {
        return ResponseEntity.ok(adminService.getSystemStats());
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
            @RequestBody com.backend.winai.entity.Company company) {
        return ResponseEntity.ok(adminService.createCompany(company));
    }

    @Operation(summary = "Atualizar Empresa", description = "Atualiza dados de uma empresa existente")
    @PutMapping("/companies/{companyId}")
    public ResponseEntity<com.backend.winai.entity.Company> updateCompany(
            @Parameter(description = "ID da empresa") @PathVariable UUID companyId,
            @RequestBody com.backend.winai.entity.Company companyDetails) {
        return ResponseEntity.ok(adminService.updateCompany(companyId, companyDetails));
    }

    @Operation(summary = "Excluir Empresa", description = "Remove uma empresa do sistema")
    @DeleteMapping("/companies/{companyId}")
    public ResponseEntity<Void> deleteCompany(
            @Parameter(description = "ID da empresa") @PathVariable UUID companyId) {
        adminService.deleteCompany(companyId);
        return ResponseEntity.ok().build();
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
}
