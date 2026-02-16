package com.backend.winai.service;

import com.backend.winai.dto.marketing.AiRecommendationDTO;
import com.backend.winai.dto.marketing.CampaignListItemDTO;
import com.backend.winai.dto.marketing.CampaignsListResponse;
import com.backend.winai.entity.User;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.*;

@Service
@Slf4j
@RequiredArgsConstructor
public class MarketingAiRecommendationsService {

    private final MarketingService marketingService;
    private final OpenAiService openAiService;
    private final ObjectMapper objectMapper = new ObjectMapper();

    public List<AiRecommendationDTO> getRecommendations(User user) {
        CampaignsListResponse campaignsResponse = marketingService.getCampaignsForUser(user);
        List<CampaignListItemDTO> campaigns = campaignsResponse.getCampaigns();

        if (campaigns == null || campaigns.isEmpty()) {
            return getPlaceholderRecommendations();
        }

        String campaignsJson = buildCampaignsContext(campaigns);

        String systemPrompt = """
                Você é um especialista em Meta Ads e otimização de campanhas. Analise os dados das campanhas e retorne EXATAMENTE 3 recomendações acionáveis.
                Responda APENAS com um JSON válido, sem markdown, no formato:
                [
                  {"type":"SCALE","title":"Título","description":"Descrição detalhada","actionLabel":"Texto do botão","actionType":"INCREASE_BUDGET","campaignId":"id","campaignName":"nome","payload":{"percent":20}},
                  {"type":"AUDIENCE","title":"...","description":"...","actionLabel":"...","actionType":"APPLY_AUDIENCE","campaignId":"...","campaignName":"...","payload":{}},
                  {"type":"PAUSE","title":"...","description":"...","actionLabel":"...","actionType":"PAUSE","campaignId":"...","campaignName":"...","payload":{}}
                ]
                Tipos: SCALE (escalar orçamento), AUDIENCE (refinar público), PAUSE (pausar campanha ineficiente).
                actionType: INCREASE_BUDGET, APPLY_AUDIENCE, PAUSE.
                Use dados reais das campanhas. Seja específico com números (CPL, CTR, etc).
                """;

        try {
            String aiResponse = openAiService.generateResponse(systemPrompt, campaignsJson, Collections.emptyList());
            if (aiResponse == null || aiResponse.trim().isEmpty()) return getPlaceholderRecommendations();

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
            return getPlaceholderRecommendations();
        }
    }

    private String buildCampaignsContext(List<CampaignListItemDTO> campaigns) {
        StringBuilder sb = new StringBuilder();
        for (CampaignListItemDTO c : campaigns) {
            sb.append(String.format("- %s (id:%s) | Status:%s | Objetivo:%s | Gasto:R$%.2f | Impressões:%d | CTR:%.2f%% | Conversões:%d | CPL:%s | Orçamento diário:%s\n",
                    c.getName(), c.getId(), c.getStatus(), c.getObjective(),
                    c.getSpend() != null ? c.getSpend() : 0,
                    c.getImpressions() != null ? c.getImpressions() : 0,
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

    private List<AiRecommendationDTO> getPlaceholderRecommendations() {
        return List.of(
                AiRecommendationDTO.builder()
                        .id(UUID.randomUUID().toString())
                        .type("SCALE")
                        .title("Escala de Performance")
                        .description("Conecte sua conta Meta Ads para receber recomendações personalizadas baseadas no desempenho das suas campanhas.")
                        .actionLabel("Conectar Meta Ads")
                        .actionType("CONNECT")
                        .build(),
                AiRecommendationDTO.builder()
                        .id(UUID.randomUUID().toString())
                        .type("AUDIENCE")
                        .title("Refinar Público-Alvo")
                        .description("A IA analisará seu público e sugerirá ajustes para melhorar o CTR e reduzir o CPL.")
                        .actionLabel("Aguardando conexão")
                        .actionType("CONNECT")
                        .build(),
                AiRecommendationDTO.builder()
                        .id(UUID.randomUUID().toString())
                        .type("PAUSE")
                        .title("Pausa de Eficiência")
                        .description("Campanhas com CPL acima da meta serão identificadas para pausa e redistribuição de verba.")
                        .actionLabel("Aguardando conexão")
                        .actionType("CONNECT")
                        .build()
        );
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
    }
}
