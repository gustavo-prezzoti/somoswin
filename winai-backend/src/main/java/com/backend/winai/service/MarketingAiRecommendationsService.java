package com.backend.winai.service;

import com.backend.winai.dto.marketing.AiRecommendationDTO;
import com.backend.winai.dto.marketing.CampaignListItemDTO;
import com.backend.winai.dto.marketing.CampaignsListResponse;
import com.backend.winai.entity.AiRecommendationCache;
import com.backend.winai.entity.Company;
import com.backend.winai.entity.User;
import com.backend.winai.repository.AiRecommendationCacheRepository;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.*;

@Service
@Slf4j
@RequiredArgsConstructor
public class MarketingAiRecommendationsService {

    private final MarketingService marketingService;
    private final OpenAiService openAiService;
    private final AiRecommendationCacheRepository cacheRepository;
    private final ObjectMapper objectMapper = new ObjectMapper();

    /**
     * Retorna recomendações do cache, filtradas pelo status atual das campanhas.
     * Não retorna PAUSE para campanhas já pausadas, nem INCREASE_BUDGET para campanhas pausadas.
     */
    public List<AiRecommendationDTO> getRecommendations(User user) {
        List<AiRecommendationDTO> cached = getRecommendationsForCompany(user.getCompany());
        return filterByCampaignStatus(cached, user.getCompany());
    }

    @SuppressWarnings("unchecked")
    public List<AiRecommendationDTO> getRecommendationsForCompany(Company company) {
        return cacheRepository.findByCompany(company)
                .map(cache -> {
                    if (cache.getRecommendationsJson() == null || cache.getRecommendationsJson().isBlank()) {
                        return Collections.<AiRecommendationDTO>emptyList();
                    }
                    try {
                        return (List<AiRecommendationDTO>) objectMapper.readValue(cache.getRecommendationsJson(),
                                objectMapper.getTypeFactory().constructCollectionType(List.class, AiRecommendationDTO.class));
                    } catch (Exception e) {
                        log.warn("Failed to parse cached recommendations for company {}: {}", company.getId(), e.getMessage());
                        return Collections.<AiRecommendationDTO>emptyList();
                    }
                })
                .orElse(Collections.emptyList());
    }

    /** Remove recomendações inválidas: PAUSE para campanha pausada, INCREASE_BUDGET para campanha pausada. */
    private List<AiRecommendationDTO> filterByCampaignStatus(List<AiRecommendationDTO> recommendations, Company company) {
        if (recommendations == null || recommendations.isEmpty()) return recommendations;
        try {
            CampaignsListResponse resp = marketingService.getCampaignsForCompany(company);
            if (resp == null || resp.getCampaigns() == null) return recommendations;
            Map<String, String> statusByCampaignId = new java.util.HashMap<>();
            for (CampaignListItemDTO c : resp.getCampaigns()) {
                if (c.getId() != null && c.getStatus() != null) {
                    statusByCampaignId.put(c.getId(), c.getStatus().toUpperCase());
                }
            }
            return recommendations.stream()
                    .filter(rec -> {
                        String campaignId = rec.getCampaignId();
                        if (campaignId == null) return true;
                        String status = statusByCampaignId.getOrDefault(campaignId, "");
                        boolean isPaused = "PAUSED".equals(status);
                        if ("PAUSE".equals(rec.getActionType()) && isPaused) {
                            log.debug("Filtrando recomendação PAUSE para campanha já pausada: {}", campaignId);
                            return false;
                        }
                        if ("INCREASE_BUDGET".equals(rec.getActionType()) && isPaused) {
                            log.debug("Filtrando recomendação INCREASE_BUDGET para campanha pausada: {}", campaignId);
                            return false;
                        }
                        return true;
                    })
                    .toList();
        } catch (Exception e) {
            log.warn("Erro ao filtrar recomendações por status: {}", e.getMessage());
            return recommendations;
        }
    }

    /**
     * Gera recomendações via IA e persiste no cache.
     * Chamado pelo worker em background.
     */
    @Transactional
    public void generateAndStoreForCompany(Company company) {
        try {
            CampaignsListResponse campaignsResponse = marketingService.getCampaignsForCompany(company);
            List<CampaignListItemDTO> campaigns = campaignsResponse.getCampaigns();

            if (campaigns == null || campaigns.isEmpty()) {
                cacheRepository.findByCompany(company).ifPresent(cacheRepository::delete);
                return;
            }

            List<AiRecommendationDTO> recommendations = generateRecommendationsWithAi(campaigns);
            String json = objectMapper.writeValueAsString(recommendations);

            AiRecommendationCache cache = cacheRepository.findByCompany(company)
                    .orElse(AiRecommendationCache.builder().company(company).build());
            cache.setRecommendationsJson(json);
            cacheRepository.save(cache);
            log.debug("Stored {} recommendations for company {}", recommendations.size(), company.getId());
        } catch (Exception e) {
            log.error("Error generating AI recommendations for company {}: {}", company.getId(), e.getMessage());
        }
    }

    private List<AiRecommendationDTO> generateRecommendationsWithAi(List<CampaignListItemDTO> campaigns) {
        String campaignsJson = buildCampaignsContext(campaigns);
        String systemPrompt = """
                Você é um especialista em Meta Ads e otimização de campanhas. Analise os dados das campanhas e retorne EXATAMENTE 3 recomendações acionáveis.
                REGRAS OBRIGATÓRIAS:
                - NUNCA recomende PAUSE para campanhas com Status:PAUSED (já estão pausadas).
                - NUNCA recomende INCREASE_BUDGET para campanhas com Status:PAUSED (só aumente orçamento de campanhas ativas).
                - Priorize campanhas com Status:ACTIVE para todas as ações.
                Responda APENAS com um JSON válido, sem markdown, no formato:
                [
                  {"type":"SCALE","title":"Título","description":"Descrição detalhada","actionLabel":"Texto do botão","actionType":"INCREASE_BUDGET","campaignId":"id","campaignName":"nome","payload":{"percent":20}},
                  {"type":"AUDIENCE","title":"...","description":"...","actionLabel":"...","actionType":"APPLY_AUDIENCE","campaignId":"...","campaignName":"...","payload":{}},
                  {"type":"PAUSE","title":"...","description":"...","actionLabel":"...","actionType":"PAUSE","campaignId":"...","campaignName":"...","payload":{}}
                ]
                Tipos: SCALE (escalar orçamento), AUDIENCE (refinar público), PAUSE (pausar campanha ineficiente).
                actionType: INCREASE_BUDGET, APPLY_AUDIENCE, PAUSE.
                Use dados reais das campanhas. Seja específico com números (CPL, CTR, cliques, alcance, impressões, conversões, gasto).
                """;

        try {
            String aiResponse = openAiService.generateResponse(systemPrompt, campaignsJson, Collections.emptyList());
            if (aiResponse == null || aiResponse.trim().isEmpty()) return Collections.emptyList();

            String jsonStr = extractJson(aiResponse);
            JsonNode arr = objectMapper.readTree(jsonStr);
            List<AiRecommendationDTO> result = new ArrayList<>();
            for (JsonNode node : arr) {
                result.add(AiRecommendationDTO.builder()
                        .id(UUID.randomUUID().toString())
                        .type(node.has("type") ? node.get("type").asText() : "OTHER")
                        .title(node.has("title") ? node.get("title").asText() : "Recomendação")
                        .description(node.has("description") ? node.get("description").asText() : "")
                        .actionLabel(node.has("actionLabel") ? node.get("actionLabel").asText() : "Aplicar")
                        .actionType(node.has("actionType") ? node.get("actionType").asText() : "OTHER")
                        .campaignId(node.has("campaignId") ? node.get("campaignId").asText() : null)
                        .campaignName(node.has("campaignName") ? node.get("campaignName").asText() : null)
                        .payload(node.has("payload") ? node.get("payload") : null)
                        .build());
            }
            return result.size() >= 3 ? result.subList(0, 3) : result;
        } catch (Exception e) {
            log.error("Error generating AI recommendations: {}", e.getMessage());
            return Collections.emptyList();
        }
    }

    private String buildCampaignsContext(List<CampaignListItemDTO> campaigns) {
        StringBuilder sb = new StringBuilder();
        for (CampaignListItemDTO c : campaigns) {
            sb.append(String.format("- %s (id:%s) | Status:%s | Objetivo:%s | Gasto:R$%.2f | Impressões:%d | Alcance:%d | Cliques:%d | CTR:%.2f%% | Conversões:%d | CPL:%s | Orçamento diário:%s\n",
                    c.getName(), c.getId(), c.getStatus(), c.getObjective(),
                    c.getSpend() != null ? c.getSpend() : 0,
                    c.getImpressions() != null ? c.getImpressions() : 0,
                    c.getReach() != null ? c.getReach() : 0,
                    c.getClicks() != null ? c.getClicks() : 0,
                    c.getCtr() != null ? c.getCtr() : 0,
                    c.getConversions() != null ? c.getConversions() : 0,
                    c.getCpl() != null ? String.format("R$%.2f", c.getCpl()) : "N/A",
                    c.getDailyBudget() != null ? String.format("R$%.2f", c.getDailyBudget()) : "N/A"));
        }
        return sb.toString();
    }

    private String extractJson(String text) {
        int start = text.indexOf('[');
        int end = text.lastIndexOf(']');
        if (start >= 0 && end > start) return text.substring(start, end + 1);
        return "[]";
    }

    public void applyRecommendation(User user, AiRecommendationDTO recommendation) {
        String actionType = recommendation.getActionType();
        String campaignId = recommendation.getCampaignId();

        if ("INCREASE_BUDGET".equals(actionType) && campaignId != null) {
            int percent = 20;
            if (recommendation.getPayload() instanceof Map) {
                Object p = ((Map<?, ?>) recommendation.getPayload()).get("percent");
                if (p instanceof Number) percent = ((Number) p).intValue();
            } else if (recommendation.getPayload() instanceof JsonNode) {
                JsonNode pn = (JsonNode) recommendation.getPayload();
                if (pn.has("percent")) percent = pn.get("percent").asInt();
            }
            marketingService.increaseCampaignBudget(user, campaignId, percent);
        } else if ("PAUSE".equals(actionType) && campaignId != null) {
            marketingService.updateCampaignStatus(user, campaignId, "PAUSED");
        } else if ("ACTIVE".equals(actionType) && campaignId != null) {
            marketingService.updateCampaignStatus(user, campaignId, "ACTIVE");
        } else if ("APPLY_AUDIENCE".equals(actionType)) {
            throw new RuntimeException("Aplicar novo público requer configuração manual no Meta Ads Manager.");
        } else {
            throw new RuntimeException("Ação não suportada ou campanha não especificada.");
        }

        // Regenera recomendações após aplicar (dados das campanhas mudaram)
        try {
            generateAndStoreForCompany(user.getCompany());
            log.info("Recomendações regeneradas após aplicar ação para empresa {}", user.getCompany().getId());
        } catch (Exception e) {
            log.warn("Erro ao regenerar recomendações após apply: {}", e.getMessage());
        }
    }

    /** Regenera recomendações sob demanda (ex: botão Atualizar). */
    public void regenerateRecommendations(User user) {
        generateAndStoreForCompany(user.getCompany());
    }
}
