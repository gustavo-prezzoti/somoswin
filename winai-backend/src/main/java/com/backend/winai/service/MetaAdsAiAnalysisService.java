package com.backend.winai.service;

import com.backend.winai.dto.marketing.CampaignListItemDTO;
import com.backend.winai.dto.marketing.CampaignsListResponse;
import com.backend.winai.dto.request.MetaAdsAiAnalysisRequest;
import com.backend.winai.dto.response.MetaAdsAiAnalysisResponse;
import com.backend.winai.entity.Company;
import com.backend.winai.repository.CompanyRepository;
import com.backend.winai.repository.LeadRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.text.NumberFormat;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Locale;
import java.util.UUID;

/**
 * Análise Meta Ads com dados reais (CRM + snapshot de campanhas) e texto via OpenAI.
 * Receita por campanha: atribuição proporcional às conversões da campanha; se conversões
 * zeradas no conjunto, proporcional ao gasto.
 */
@Service
@Slf4j
@RequiredArgsConstructor
public class MetaAdsAiAnalysisService {

    private final CompanyRepository companyRepository;
    private final MarketingService marketingService;
    private final LeadRepository leadRepository;
    private final OpenAiService openAiService;

    @Value("${openai.marketing-suggest-model:gpt-4o-mini}")
    private String metaAdsAiModel;

    private static final Locale PT_BR = new Locale("pt", "BR");

    private record EnrichedCampaign(
            CampaignListItemDTO raw,
            double attributedRevenue,
            double roas,
            double ctrPct,
            Double cpc) {
    }

    @Transactional(readOnly = true)
    public MetaAdsAiAnalysisResponse analyze(UUID companyId, MetaAdsAiAnalysisRequest request) {
        Company company = companyRepository.findById(companyId)
                .orElseThrow(() -> new RuntimeException("Empresa não encontrada"));

        String presetRaw = request != null ? request.getPreset() : null;
        String presetKeyPreview = normalizePresetKey(presetRaw != null ? presetRaw : "");

        String baseFilterLabel = request != null && request.getFilterLabel() != null && !request.getFilterLabel().isBlank()
                ? request.getFilterLabel().trim()
                : "Todas";
        final String filterLabel = "ativas".equals(presetKeyPreview) ? "Ativas" : baseFilterLabel;

        BigDecimal revBd = leadRepository.sumEstimatedValueForCompany(companyId);
        double totalRevenueCrm = revBd != null ? revBd.doubleValue() : 0.0;

        CampaignsListResponse campaignsResp = marketingService.getCampaignsForCompany(company);
        List<CampaignListItemDTO> all = campaignsResp.getCampaigns() != null
                ? new ArrayList<>(campaignsResp.getCampaigns())
                : new ArrayList<>();

        List<CampaignListItemDTO> filtered = all.stream()
                .filter(c -> matchesFilter(c, filterLabel))
                .toList();

        List<EnrichedCampaign> enriched = enrichCampaigns(filtered, totalRevenueCrm);

        double totalSpend = enriched.stream().mapToDouble(e -> nz(e.raw().getSpend())).sum();
        double overallRoas = totalSpend > 1e-9 && totalRevenueCrm > 0 ? totalRevenueCrm / totalSpend : 0;

        String factsBlock = buildFactsBlock(company.getName(), filterLabel, totalRevenueCrm, totalSpend, overallRoas,
                enriched);

        String preset = request != null && request.getPreset() != null ? request.getPreset().trim() : "";
        String userQ = request != null && request.getUserQuestion() != null ? request.getUserQuestion().trim() : "";

        String presetKey = presetKeyPreview.isEmpty() ? normalizePresetKey(preset) : presetKeyPreview;

        String deterministic = buildDeterministicMarkdown(company.getName(), filterLabel, presetKey, userQ,
                totalRevenueCrm, totalSpend, overallRoas, enriched);

        if (enriched.isEmpty()) {
            return MetaAdsAiAnalysisResponse.builder()
                    .analysis(deterministic)
                    .fallback(true)
                    .build();
        }

        if (!openAiService.isChatEnabled()) {
            log.warn("OpenAI desabilitado — devolvendo análise determinística Meta Ads");
            return MetaAdsAiAnalysisResponse.builder()
                    .analysis(deterministic)
                    .fallback(true)
                    .build();
        }

        String systemPrompt = """
                Você é analista de Meta Ads para o mercado brasileiro.
                Você recebe FACTOS numéricos calculados pelo sistema — use APENAS esses números e nomes de campanha; não invente métricas nem valores.
                Responda em português (pt-BR), em Markdown, objetivo e profissional.

                Quando mencionar ROAS por campanha ou geral, inclua a legenda:
                🟢 ≥ 3x ótimo | 🟡 1x a <3x aceitável | 🔴 < 1x prejuízo

                Esclareça em uma linha: a receita por campanha é um proxy — atribuição proporcional das conversões (ou do gasto se não houver conversões) sobre a soma dos valores estimados dos leads no CRM; não é atribuição da Meta Ads.

                Atenda ao pedido específico (preset e/ou pergunta livre) usando só os FACTOS.""";

        StringBuilder userMsg = new StringBuilder();
        userMsg.append(factsBlock).append("\n\n");
        userMsg.append("PEDIDO ESPECÍFICO:\n");
        userMsg.append("- Preset (se vazio, ignore): ").append(preset.isEmpty() ? "(nenhum)" : preset).append("\n");
        userMsg.append("- Chave normalizada: ").append(presetKey.isEmpty() ? "(nenhuma)" : presetKey).append("\n");
        if (!userQ.isEmpty()) {
            userMsg.append("- Pergunta / instrução livre: ").append(userQ).append("\n");
        }
        userMsg.append("\nInstruções por preset:\n");
        userMsg.append(
                "- melhor_ctr: destaque ranking por CTR%% e a melhor campanha.\n");
        userMsg.append("- maior_gasto: ordene por gasto.\n");
        userMsg.append(
                "- ativas: comente só campanhas ativas (já filtradas nos FACTOS se o filtro for Ativas).\n");
        userMsg.append("- mais_conv: ordene por conversões.\n");
        userMsg.append("- roas_campanha: tabela ou lista numerada do ROAS por campanha com emoji de faixa.\n");
        userMsg.append("- cpc_barato: destaque menores CPC entre campanhas com cliques.\n");
        userMsg.append(
                "- pausar_quais: sugira pausa para campanhas com ROAS ruim ou baixa eficiência vs. média, citando nomes.\n");
        userMsg.append("- desempenho_geral: resumo executivo.\n");
        userMsg.append("- total_investido: destaque investimento total do conjunto filtrado.\n");

        try {
            String ai = openAiService.generateResponseWithModel(metaAdsAiModel, systemPrompt, userMsg.toString());
            if (ai == null || ai.isBlank()) {
                return MetaAdsAiAnalysisResponse.builder()
                        .analysis(deterministic)
                        .fallback(true)
                        .build();
            }
            return MetaAdsAiAnalysisResponse.builder()
                    .analysis(ai.trim())
                    .fallback(false)
                    .build();
        } catch (Exception e) {
            log.warn("Falha na análise IA Meta Ads: {}", e.getMessage());
            return MetaAdsAiAnalysisResponse.builder()
                    .analysis(deterministic)
                    .fallback(true)
                    .build();
        }
    }

    private static String normalizePresetKey(String preset) {
        if (preset == null || preset.isBlank()) {
            return "";
        }
        String t = preset.trim().toLowerCase(Locale.ROOT).replace('?', ' ').trim().replace(' ', '_');
        return switch (t) {
            case "melhor_ctr" -> "melhor_ctr";
            case "maior_gasto" -> "maior_gasto";
            case "ativas" -> "ativas";
            case "mais_conv", "mais_conversões", "mais_conversoes" -> "mais_conv";
            case "roas_campanha", "roas_por_campanha" -> "roas_campanha";
            case "cpc_barato" -> "cpc_barato";
            case "pausar_quais" -> "pausar_quais";
            case "desempenho_geral" -> "desempenho_geral";
            case "total_investido" -> "total_investido";
            default -> t;
        };
    }

    private static boolean matchesFilter(CampaignListItemDTO c, String filterLabel) {
        String s = c.getStatus() != null ? c.getStatus().toUpperCase(Locale.ROOT).trim() : "";
        if ("Todas".equalsIgnoreCase(filterLabel)) {
            return true;
        }
        if ("Ativas".equalsIgnoreCase(filterLabel)) {
            return "ACTIVE".equals(s) || s.contains("ACTIVE");
        }
        if ("Pausadas".equalsIgnoreCase(filterLabel)) {
            return s.contains("PAUSED") || "PAUSED".equals(s);
        }
        if ("Arquivadas".equalsIgnoreCase(filterLabel)) {
            return s.contains("ARCHIVED") || s.contains("DELETED") || s.contains("ARCHIV");
        }
        return true;
    }

    private static double nz(Double d) {
        return d != null ? d : 0.0;
    }

    private static long nzLong(Long l) {
        return l != null ? l : 0L;
    }

    private static double ctrPct(CampaignListItemDTO c) {
        if (c.getCtr() != null && c.getCtr() > 0) {
            return c.getCtr();
        }
        long imp = nzLong(c.getImpressions());
        long clk = nzLong(c.getClicks());
        return imp > 0 ? (clk * 100.0 / imp) : 0.0;
    }

    private List<EnrichedCampaign> enrichCampaigns(List<CampaignListItemDTO> filtered, double totalRevenueCrm) {
        double totalSpend = filtered.stream().mapToDouble(c -> nz(c.getSpend())).sum();
        long totalConv = filtered.stream().mapToLong(c -> nzLong(c.getConversions())).sum();

        List<EnrichedCampaign> out = new ArrayList<>();
        for (CampaignListItemDTO c : filtered) {
            double spend = nz(c.getSpend());
            long conv = nzLong(c.getConversions());
            double attributed;
            if (totalRevenueCrm <= 0) {
                attributed = 0;
            } else if (totalConv > 0) {
                attributed = totalRevenueCrm * ((double) conv / totalConv);
            } else if (totalSpend > 0) {
                attributed = totalRevenueCrm * (spend / totalSpend);
            } else {
                attributed = 0;
            }
            double roas = spend > 1e-9 ? attributed / spend : 0;
            long clk = nzLong(c.getClicks());
            Double cpc = clk > 0 ? spend / clk : null;
            out.add(new EnrichedCampaign(c, attributed, roas, ctrPct(c), cpc));
        }
        return out;
    }

    private String buildFactsBlock(String companyName, String filterLabel, double totalRevenueCrm, double totalSpend,
            double overallRoas, List<EnrichedCampaign> enriched) {
        NumberFormat money = NumberFormat.getCurrencyInstance(PT_BR);
        NumberFormat dec2 = NumberFormat.getNumberInstance(PT_BR);
        dec2.setMinimumFractionDigits(2);
        dec2.setMaximumFractionDigits(2);

        StringBuilder sb = new StringBuilder();
        sb.append("=== FACTOS (fonte: CRM + snapshot meta_campaigns) ===\n");
        sb.append("Empresa: ").append(companyName).append("\n");
        sb.append("Filtro de status: ").append(filterLabel).append("\n");
        sb.append("Receita CRM estimada (soma estimatedValue leads): ").append(money.format(totalRevenueCrm))
                .append("\n");
        sb.append("Gasto total (soma gasto campanhas no filtro): ").append(totalSpend > 0 ? money.format(totalSpend) : "R$ 0,00")
                .append("\n");
        if (overallRoas > 0) {
            sb.append("ROAS geral (receita CRM / gasto): ")
                    .append(dec2.format(overallRoas))
                    .append("x\n");
        } else {
            sb.append("ROAS geral: N/D (sem receita CRM ou sem gasto)\n");
        }
        sb.append("\nCampanhas (").append(enriched.size()).append("):\n");

        List<EnrichedCampaign> sortedByName = new ArrayList<>(enriched);
        sortedByName.sort(Comparator.comparing(e -> e.raw().getName() != null ? e.raw().getName() : ""));
        for (EnrichedCampaign e : sortedByName) {
            CampaignListItemDTO c = e.raw();
            sb.append("- Nome: ")
                    .append(c.getName() != null ? c.getName() : "(sem nome)")
                    .append(" | id: ")
                    .append(c.getId())
                    .append(" | Status: ")
                    .append(c.getStatus())
                    .append(" | Objetivo: ")
                    .append(c.getObjective())
                    .append(" | Gasto: ")
                    .append(money.format(nz(c.getSpend())))
                    .append(" | Impr: ")
                    .append(nzLong(c.getImpressions()))
                    .append(" | Cliques: ")
                    .append(nzLong(c.getClicks()))
                    .append(" | CTR%: ")
                    .append(dec2.format(e.ctrPct()))
                    .append(" | Conv: ")
                    .append(nzLong(c.getConversions()))
                    .append(" | Receita atrib. (proxy): ")
                    .append(money.format(e.attributedRevenue()))
                    .append(" | ROAS (proxy): ")
                    .append(dec2.format(e.roas()))
                    .append("x | CPC: ")
                    .append(e.cpc() != null ? money.format(e.cpc()) : "N/D")
                    .append("\n");
        }
        sb.append("=== FIM FACTOS ===");
        return sb.toString();
    }

    private String buildDeterministicMarkdown(String companyName, String filterLabel, String presetKey, String userQ,
            double totalRevenueCrm, double totalSpend, double overallRoas, List<EnrichedCampaign> enriched) {
        NumberFormat money = NumberFormat.getCurrencyInstance(PT_BR);
        NumberFormat dec2 = NumberFormat.getNumberInstance(PT_BR);
        dec2.setMinimumFractionDigits(2);
        dec2.setMaximumFractionDigits(2);

        if (enriched.isEmpty()) {
            return "### 📊 Análise Meta Ads — " + companyName + "\n\n"
                    + "Não há campanhas no filtro **" + filterLabel + "** para esta empresa. "
                    + "Sincronize a conta Meta ou escolha outro filtro.";
        }

        StringBuilder md = new StringBuilder();
        md.append("### 📊 ANÁLISE DE ROAS\n\n");
        md.append("🟢 ≥ 3x ótimo | 🟡 1x a <3x aceitável | 🔴 < 1x prejuízo\n\n");
        md.append("*Receita por campanha = proxy proporcional (CRM / conversões ou gasto).*\n\n");

        if (totalRevenueCrm > 0 && totalSpend > 0) {
            md.append("💰 ROAS geral: ")
                    .append(dec2.format(overallRoas))
                    .append("x (receita ")
                    .append(money.format(totalRevenueCrm))
                    .append(")\n\n");
        } else {
            md.append("💰 ROAS geral: **N/D** — ")
                    .append(totalRevenueCrm <= 0 ? "sem receita CRM estimada" : "sem gasto no filtro")
                    .append("\n\n");
        }

        md.append("🗺️ Ranking por campanha (ROAS proxy):\n");

        List<EnrichedCampaign> byRoas = new ArrayList<>(enriched);
        byRoas.sort(Comparator.comparingDouble(EnrichedCampaign::roas).reversed());
        int rank = 1;
        for (EnrichedCampaign e : byRoas) {
            String emoji = roasEmoji(e.roas());
            md.append(rank++)
                    .append(". ")
                    .append(emoji)
                    .append(" ")
                    .append(e.raw().getName() != null ? e.raw().getName() : "(sem nome)")
                    .append("\n   ROAS: ")
                    .append(dec2.format(e.roas()))
                    .append("x | receita atrib. ")
                    .append(money.format(e.attributedRevenue()))
                    .append("\n");
        }

        if (!presetKey.isEmpty()) {
            md.append("\n---\n**Preset:** ").append(presetKey).append("\n");
            md.append(extraPresetSnippet(presetKey, enriched, money, dec2));
        }
        if (!userQ.isEmpty()) {
            md.append("\n**Sua pergunta:** ").append(userQ).append("\n");
        }

        return md.toString();
    }

    private static String roasEmoji(double roas) {
        if (roas >= 3) {
            return "🟢";
        }
        if (roas >= 1) {
            return "🟡";
        }
        return "🔴";
    }

    private String extraPresetSnippet(String presetKey, List<EnrichedCampaign> enriched, NumberFormat money,
            NumberFormat dec2) {
        List<EnrichedCampaign> copy = new ArrayList<>(enriched);
        return switch (presetKey) {
            case "melhor_ctr" -> {
                copy.sort(Comparator.comparingDouble(EnrichedCampaign::ctrPct).reversed());
                EnrichedCampaign top = copy.get(0);
                yield "\n**Melhor CTR:** " + top.raw().getName() + " (" + dec2.format(top.ctrPct()) + "%)\n";
            }
            case "maior_gasto" -> {
                copy.sort(Comparator.comparingDouble((EnrichedCampaign e) -> nz(e.raw().getSpend())).reversed());
                EnrichedCampaign top = copy.get(0);
                yield "\n**Maior gasto:** " + top.raw().getName() + " (" + money.format(nz(top.raw().getSpend())) + ")\n";
            }
            case "mais_conv" -> {
                copy.sort(Comparator.comparingLong((EnrichedCampaign e) -> nzLong(e.raw().getConversions())).reversed());
                EnrichedCampaign top = copy.get(0);
                yield "\n**Mais conversões:** " + top.raw().getName() + " (" + nzLong(top.raw().getConversions()) + ")\n";
            }
            case "cpc_barato" -> {
                List<EnrichedCampaign> withClicks = copy.stream().filter(e -> nzLong(e.raw().getClicks()) > 0).toList();
                if (withClicks.isEmpty()) {
                    yield "\n**CPC:** sem cliques no período.\n";
                }
                EnrichedCampaign best = withClicks.stream()
                        .min(Comparator.comparingDouble(e -> nz(e.raw().getSpend()) / nzLong(e.raw().getClicks())))
                        .orElse(withClicks.get(0));
                double cpc = nz(best.raw().getSpend()) / nzLong(best.raw().getClicks());
                yield "\n**CPC mais barato (com cliques):** " + best.raw().getName() + " (" + money.format(cpc) + ")\n";
            }
            case "pausar_quais" -> {
                StringBuilder sb = new StringBuilder();
                copy.sort(Comparator.comparingDouble(EnrichedCampaign::roas));
                sb.append("\n**Candidatas a revisar / pausa (menor ROAS proxy primeiro):**\n");
                int n = Math.min(5, copy.size());
                for (int i = 0; i < n; i++) {
                    EnrichedCampaign e = copy.get(i);
                    String st = e.raw().getStatus() != null ? e.raw().getStatus().toUpperCase(Locale.ROOT) : "";
                    if (st.contains("PAUSED")) {
                        continue;
                    }
                    sb.append("- ").append(e.raw().getName())
                            .append(" (ROAS ").append(dec2.format(e.roas())).append("x)\n");
                }
                yield sb.toString();
            }
            default -> "\n";
        };
    }

}
