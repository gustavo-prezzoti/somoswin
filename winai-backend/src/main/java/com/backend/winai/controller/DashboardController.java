package com.backend.winai.controller;

import com.backend.winai.dto.request.CreateGoalRequest;
import com.backend.winai.dto.response.DashboardResponse;
import com.backend.winai.entity.LeadStatus;
import com.backend.winai.entity.User;
import com.backend.winai.repository.UserRepository;
import com.backend.winai.service.DashboardService;
import com.backend.winai.service.ReportService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;

@RestController
@RequestMapping("/api/v1/dashboard")
@RequiredArgsConstructor
public class DashboardController {

        private final DashboardService dashboardService;
        private final UserRepository userRepository;
        private final ReportService reportService;

        /**
         * GET /api/v1/dashboard
         * Retorna os dados do dashboard para o usuário autenticado
         */
        @GetMapping
        public ResponseEntity<DashboardResponse> getDashboard(
                        @AuthenticationPrincipal User user,
                        @RequestParam(defaultValue = "7") int days) {

                // Busca o usuário com a Company já carregada (evita
                // LazyInitializationException)
                User userWithCompany = userRepository.findByEmailWithCompany(user.getEmail())
                                .orElseThrow(() -> new RuntimeException("Usuário não encontrado"));

                DashboardResponse dashboard = dashboardService.getDashboardData(userWithCompany, days);
                return ResponseEntity.ok(dashboard);
        }

        @PostMapping("/refresh")
        public ResponseEntity<Void> refreshMetrics(@AuthenticationPrincipal User user) {
                User userWithCompany = userRepository.findByEmailWithCompany(user.getEmail())
                                .orElseThrow(() -> new RuntimeException("Usuário não encontrado"));

                if (userWithCompany.getCompany() != null) {
                        dashboardService.syncMetrics(userWithCompany.getCompany());
                }
                return ResponseEntity.ok().build();
        }

        /**
         * POST /api/v1/dashboard/generate-demo
         * Gera dados de demonstração para a empresa do usuário
         */
        @PostMapping("/generate-demo")
        public ResponseEntity<DashboardResponse> generateDemoData(@AuthenticationPrincipal User user) {
                // Busca o usuário com a Company já carregada
                User userWithCompany = userRepository.findByEmailWithCompany(user.getEmail())
                                .orElseThrow(() -> new RuntimeException("Usuário não encontrado"));

                if (userWithCompany.getCompany() != null) {
                        dashboardService.generateDemoData(userWithCompany.getCompany());
                }
                DashboardResponse dashboard = dashboardService.getDashboardData(userWithCompany, 7);
                return ResponseEntity.ok(dashboard);
        }

        /**
         * POST /api/v1/dashboard/goals
         * Cria uma nova meta para a empresa do usuário
         */
        @PostMapping("/goals")
        public ResponseEntity<DashboardResponse.GoalDTO> createGoal(
                        @AuthenticationPrincipal User user,
                        @Valid @RequestBody CreateGoalRequest request) {
                User userWithCompany = userRepository.findByEmailWithCompany(user.getEmail())
                                .orElseThrow(() -> new RuntimeException("Usuário não encontrado"));

                DashboardResponse.GoalDTO goal = dashboardService.createGoal(userWithCompany, request);
                return ResponseEntity.ok(goal);
        }

        @GetMapping("/goals")
        public ResponseEntity<List<DashboardResponse.GoalDTO>> getAllGoals(@AuthenticationPrincipal User user) {
                User userWithCompany = userRepository.findByEmailWithCompany(user.getEmail())
                                .orElseThrow(() -> new RuntimeException("Usuário não encontrado"));
                return ResponseEntity.ok(dashboardService.getAllGoals(userWithCompany));
        }

        @PutMapping("/goals/{id}")
        public ResponseEntity<DashboardResponse.GoalDTO> updateGoal(
                        @AuthenticationPrincipal User user,
                        @PathVariable Long id,
                        @Valid @RequestBody CreateGoalRequest request) {
                User userWithCompany = userRepository.findByEmailWithCompany(user.getEmail())
                                .orElseThrow(() -> new RuntimeException("Usuário não encontrado"));
                return ResponseEntity.ok(dashboardService.updateGoal(userWithCompany, id, request));
        }

        @DeleteMapping("/goals/{id}")
        public ResponseEntity<Void> deleteGoal(@AuthenticationPrincipal User user, @PathVariable Long id) {
                User userWithCompany = userRepository.findByEmailWithCompany(user.getEmail())
                                .orElseThrow(() -> new RuntimeException("Usuário não encontrado"));
                dashboardService.deleteGoal(userWithCompany, id);
                return ResponseEntity.noContent().build();
        }

        @PatchMapping("/goals/{id}/highlight")
        public ResponseEntity<DashboardResponse.GoalDTO> toggleGoalHighlight(
                        @AuthenticationPrincipal User user,
                        @PathVariable Long id) {
                User userWithCompany = userRepository.findByEmailWithCompany(user.getEmail())
                                .orElseThrow(() -> new RuntimeException("Usuário não encontrado"));
                return ResponseEntity.ok(dashboardService.toggleGoalHighlight(userWithCompany, id));
        }

        /**
         * GET /api/v1/dashboard/export/report
         * Exporta relatório Excel de leads
         */
        @GetMapping("/export/report")
        public ResponseEntity<byte[]> exportLeadsReport(
                        @AuthenticationPrincipal User user,
                        @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
                        @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate,
                        @RequestParam(required = false) LeadStatus status) {
                // Busca o usuário com a Company já carregada
                User userWithCompany = userRepository.findByEmailWithCompany(user.getEmail())
                                .orElseThrow(() -> new RuntimeException("Usuário não encontrado"));

                if (userWithCompany.getCompany() == null) {
                        throw new RuntimeException("Usuário não possui empresa associada");
                }

                byte[] excelBytes = reportService.generateLeadsReport(
                                userWithCompany.getCompany(),
                                startDate,
                                endDate,
                                status);

                HttpHeaders headers = new HttpHeaders();
                headers.setContentType(MediaType.APPLICATION_OCTET_STREAM);
                headers.setContentDispositionFormData("attachment",
                                "relatorio_leads_" + LocalDate.now().format(
                                                java.time.format.DateTimeFormatter.ofPattern("yyyyMMdd")) + ".xlsx");

                return ResponseEntity.ok()
                                .headers(headers)
                                .body(excelBytes);
        }
}
