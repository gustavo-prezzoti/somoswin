package com.backend.winai.service;

import com.backend.winai.dto.request.StrategicDiagnosisDraftRequest;
import com.backend.winai.dto.response.StrategicDiagnosisAdminResponse;
import com.backend.winai.dto.response.StrategicPlaybookResponse;
import com.backend.winai.entity.Company;
import com.backend.winai.entity.CompanyStrategicDiagnosis;
import com.backend.winai.entity.User;
import com.backend.winai.repository.CompanyRepository;
import com.backend.winai.repository.CompanyStrategicDiagnosisRepository;
import com.backend.winai.service.strategic.StrategicDiagnosisDefaults;
import com.backend.winai.service.strategic.StrategicDiagnosisMetricsCalculator;
import com.backend.winai.service.strategic.StrategicDiagnosisMetricsCalculator.Metrics;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.ZonedDateTime;
import java.util.Map;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class StrategicDiagnosisService {

    private final CompanyStrategicDiagnosisRepository diagnosisRepository;
    private final CompanyRepository companyRepository;
    private final ObjectMapper objectMapper;
    private final OpenAiService openAiService;

    @Transactional
    public StrategicDiagnosisAdminResponse getForAdmin(UUID companyId) {
        Company company = companyRepository.findById(companyId)
                .orElseThrow(() -> new RuntimeException("Empresa não encontrada"));
        CompanyStrategicDiagnosis row = diagnosisRepository.findByCompany_Id(companyId)
                .orElseGet(() -> newRow(company));
        row = ensureDraftPlaybookPopulated(row);
        int activityCount = draftActivityCount(row);
        log.info(
                "[strategic-diagnosis] GET admin rascunho companyId={} draftStep={} activityCount={} (postgres/jsonb, não mock)",
                companyId, row.getDraftCurrentStep(), activityCount);
        return toAdminResponse(row);
    }

    @Transactional
    public StrategicDiagnosisAdminResponse saveDraft(UUID companyId, User user, StrategicDiagnosisDraftRequest req) {
        Company company = companyRepository.findById(companyId)
                .orElseThrow(() -> new RuntimeException("Empresa não encontrada"));
        CompanyStrategicDiagnosis row = diagnosisRepository.findByCompany_Id(companyId)
                .orElseGet(() -> newRow(company));

        if (req.getAnswers() != null) {
            JsonNode n = objectMapper.valueToTree(req.getAnswers());
            if (n != null && !n.isNull()) {
                row.setDraftAnswersJson(n);
            }
        }
        if (req.getActivities() != null) {
            JsonNode n = objectMapper.valueToTree(req.getActivities());
            if (n != null && !n.isNull()) {
                row.setDraftActivitiesJson(n);
            }
        }
        if (req.getProjectStartDate() != null) {
            row.setDraftProjectStartDate(req.getProjectStartDate());
        }
        if (req.getCurrentStep() != null) {
            row.setDraftCurrentStep(req.getCurrentStep());
        }
        if (user != null) {
            row.setUpdatedByUserId(user.getId());
        }
        row = diagnosisRepository.save(row);
        log.info("[strategic-diagnosis] PUT admin rascunho salvo companyId={} activityCount={} draftStep={}",
                companyId, draftActivityCount(row), row.getDraftCurrentStep());
        return toAdminResponse(row);
    }

    @Transactional
    public StrategicDiagnosisAdminResponse publish(UUID companyId, User user) {
        Company company = companyRepository.findById(companyId)
                .orElseThrow(() -> new RuntimeException("Empresa não encontrada"));
        CompanyStrategicDiagnosis row = diagnosisRepository.findByCompany_Id(companyId)
                .orElseGet(() -> newRow(company));
        row = ensureDraftPlaybookPopulated(row);

        Map<String, Object> answersMap = jsonNodeToMap(row.getDraftAnswersJson());
        Metrics metrics = StrategicDiagnosisMetricsCalculator.calculateMetrics(answersMap);
        String canal = StrategicDiagnosisMetricsCalculator.canalPrioritario(metrics);

        row.setPublishedAnswersJson(row.getDraftAnswersJson());
        row.setPublishedActivitiesJson(row.getDraftActivitiesJson());
        row.setPublishedProjectStartDate(
                row.getDraftProjectStartDate() != null ? row.getDraftProjectStartDate() : LocalDate.now());
        row.setPublishedCanalPrioritario(canal);
        row.setPublishedMetricsJson(metricsToJson(metrics));
        row.setPublishedAt(ZonedDateTime.now());
        if (user != null) {
            row.setUpdatedByUserId(user.getId());
        }
        row = diagnosisRepository.save(row);
        log.info(
                "[strategic-diagnosis] POST publish companyId={} activityCount={} canal={} publishedAt={}",
                companyId, draftActivityCount(row), row.getPublishedCanalPrioritario(), row.getPublishedAt());
        return toAdminResponse(row);
    }

    @Transactional(propagation = Propagation.NOT_SUPPORTED, readOnly = true)
    public String generateActivityDescription(String title) {
        return openAiService.generateStrategicActivityDescription(title);
    }

    @Transactional(readOnly = true)
    public StrategicPlaybookResponse getPublishedForCompany(Company company) {
        if (company == null) {
            return StrategicPlaybookResponse.builder().published(false).build();
        }
        StrategicPlaybookResponse out = diagnosisRepository.findByCompany_Id(company.getId())
                .filter(r -> r.getPublishedAt() != null)
                .map(r -> StrategicPlaybookResponse.builder()
                        .published(true)
                        .canalPrioritario(r.getPublishedCanalPrioritario())
                        .projectStartDate(r.getPublishedProjectStartDate())
                        .activities(jsonNodeToApi(r.getPublishedActivitiesJson()))
                        .answers(jsonNodeToApi(r.getPublishedAnswersJson()))
                        .publishedAt(r.getPublishedAt())
                        .build())
                .orElse(StrategicPlaybookResponse.builder().published(false).build());
        if (out.isPublished()) {
            log.info("[strategic-diagnosis] GET dashboard playbook companyId={} published=true canal={}",
                    company.getId(), out.getCanalPrioritario());
        } else {
            log.debug("[strategic-diagnosis] GET dashboard playbook companyId={} published=false (sem snapshot)",
                    company.getId());
        }
        return out;
    }

    private CompanyStrategicDiagnosis newRow(Company company) {
        try {
            JsonNode answers = objectMapper.readTree(StrategicDiagnosisDefaults.EMPTY_ANSWERS_JSON);
            JsonNode activities = objectMapper.readTree(StrategicDiagnosisDefaults.DEFAULT_ACTIVITIES_JSON);
            CompanyStrategicDiagnosis row = CompanyStrategicDiagnosis.builder()
                    .company(company)
                    .draftAnswersJson(answers)
                    .draftActivitiesJson(activities)
                    .draftProjectStartDate(LocalDate.now())
                    .draftCurrentStep(-1)
                    .updatedAt(ZonedDateTime.now())
                    .build();
            return diagnosisRepository.save(row);
        } catch (Exception e) {
            throw new RuntimeException("Falha ao inicializar diagnóstico", e);
        }
    }

    /**
     * Recupera linhas antigas ou corrompidas (null / não-array / vazio) e evita playbook em branco na UI.
     */
    private CompanyStrategicDiagnosis ensureDraftPlaybookPopulated(CompanyStrategicDiagnosis row) {
        boolean changed = false;
        try {
            JsonNode answers = row.getDraftAnswersJson();
            if (answers == null || answers.isNull()) {
                row.setDraftAnswersJson(objectMapper.readTree(StrategicDiagnosisDefaults.EMPTY_ANSWERS_JSON));
                changed = true;
            }
            JsonNode act = row.getDraftActivitiesJson();
            if (act == null || act.isNull() || !act.isArray() || act.size() == 0) {
                row.setDraftActivitiesJson(objectMapper.readTree(StrategicDiagnosisDefaults.DEFAULT_ACTIVITIES_JSON));
                changed = true;
            }
            if (row.getDraftProjectStartDate() == null) {
                row.setDraftProjectStartDate(LocalDate.now());
                changed = true;
            }
            if (changed) {
                row = diagnosisRepository.save(row);
                log.info("Strategic diagnosis draft healed (answers/activities/project start) for company {}",
                        row.getCompany().getId());
            }
        } catch (Exception e) {
            log.warn("ensureDraftPlaybookPopulated failed: {}", e.getMessage());
        }
        return row;
    }

    private StrategicDiagnosisAdminResponse toAdminResponse(CompanyStrategicDiagnosis row) {
        Map<String, Object> answersMap = jsonNodeToMap(row.getDraftAnswersJson());
        Metrics draftMetrics = StrategicDiagnosisMetricsCalculator.calculateMetrics(answersMap);
        return StrategicDiagnosisAdminResponse.builder()
                .companyId(row.getCompany().getId())
                .draftAnswers(jsonNodeToApi(row.getDraftAnswersJson()))
                .draftActivities(jsonNodeToApi(row.getDraftActivitiesJson()))
                .draftProjectStartDate(row.getDraftProjectStartDate())
                .draftCurrentStep(row.getDraftCurrentStep())
                .draftMetrics(jsonNodeToApi(metricsToJson(draftMetrics)))
                .draftCanalPrioritario(StrategicDiagnosisMetricsCalculator.canalPrioritario(draftMetrics))
                .publishedAnswers(jsonNodeToApi(row.getPublishedAnswersJson()))
                .publishedActivities(jsonNodeToApi(row.getPublishedActivitiesJson()))
                .publishedProjectStartDate(row.getPublishedProjectStartDate())
                .publishedCanalPrioritario(row.getPublishedCanalPrioritario())
                .publishedMetrics(jsonNodeToApi(row.getPublishedMetricsJson()))
                .publishedAt(row.getPublishedAt())
                .build();
    }

    private JsonNode metricsToJson(Metrics m) {
        ObjectNode n = objectMapper.createObjectNode();
        n.put("google", m.google());
        n.put("meta", m.meta());
        n.put("sales_first", m.salesFirst());
        n.put("retention", m.retention());
        n.put("setup_foundation", m.setupFoundation());
        n.put("offer_clarity", m.offerClarity());
        n.put("commercial_maturity", m.commercialMaturity());
        n.put("traffic_readiness", m.trafficReadiness());
        return n;
    }

    @SuppressWarnings("unchecked")
    private Map<String, Object> jsonNodeToMap(JsonNode node) {
        if (node == null || node.isNull()) {
            return Map.of();
        }
        try {
            return objectMapper.convertValue(node, new TypeReference<Map<String, Object>>() {
            });
        } catch (IllegalArgumentException e) {
            return Map.of();
        }
    }

    /** Evita expor {@link JsonNode} em DTOs REST (SpringDoc / introspection quebram). */
    private Object jsonNodeToApi(JsonNode node) {
        if (node == null || node.isNull()) {
            return null;
        }
        return objectMapper.convertValue(node, Object.class);
    }

    private static int draftActivityCount(CompanyStrategicDiagnosis row) {
        JsonNode act = row.getDraftActivitiesJson();
        if (act == null || act.isNull() || !act.isArray()) {
            return 0;
        }
        return act.size();
    }
}
