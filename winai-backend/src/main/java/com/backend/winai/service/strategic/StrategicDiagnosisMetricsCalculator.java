package com.backend.winai.service.strategic;

import java.util.List;
import java.util.Map;

/**
 * Paridade com {@code calculateMetrics} / {@code canalPrioritario} em painel-admin StrategicDiagnosis.tsx.
 */
public final class StrategicDiagnosisMetricsCalculator {

    private StrategicDiagnosisMetricsCalculator() {
    }

    public record Metrics(int google, int meta, int salesFirst, int retention, int setupFoundation,
            int offerClarity, int commercialMaturity, int trafficReadiness) {
    }

    public static Metrics calculateMetrics(Map<String, Object> answers) {
        if (answers == null) {
            answers = Map.of();
        }
        int google = 0;
        int meta = 0;
        int salesFirst = 0;
        int retention = 0;
        int setupFoundation = 0;
        int offerClarity = 0;
        int commercialMaturity = 0;
        int trafficReadiness = 0;

        String tipoDemanda = tipoDemanda(answers);

        if ("captura_intencao".equals(tipoDemanda)) {
            google += 3;
        }
        if ("b2c_local".equals(str(answers, "negocio.modelo_principal"))) {
            google += 2;
        }
        if ("ligacao".equals(str(answers, "vendas.modelo_fechamento"))) {
            google += 1;
        }
        if ("whatsapp".equals(str(answers, "vendas.modelo_fechamento"))) {
            google += 1;
        }

        if ("geracao_percepcao".equals(tipoDemanda)) {
            meta += 3;
        }
        if ("muito".equals(str(answers, "demanda.apelo_visual_importa"))) {
            meta += 2;
        }
        if ("whatsapp".equals(str(answers, "vendas.modelo_fechamento"))) {
            meta += 2;
        }

        String modelo = str(answers, "negocio.modelo_principal");
        if ("b2b".equals(modelo) || "b2b2c".equals(modelo)) {
            salesFirst += 3;
        }
        String ticket = str(answers, "negocio.ticket_medio");
        if ("2001_10000".equals(ticket) || "acima_10000".equals(ticket)) {
            salesFirst += 2;
        }
        if ("reuniao_call".equals(str(answers, "vendas.modelo_fechamento"))) {
            salesFirst += 2;
        }
        if (truthy(answers, "negocio.venda_envolve_varios_decisores")) {
            salesFirst += 2;
        }

        String recompra = str(answers, "pos_venda.recompra_existe");
        if ("sim_com_frequencia".equals(recompra) || "as_vezes".equals(recompra)) {
            retention += 2;
        }

        if (trackingMissingOrNada(answers)) {
            setupFoundation += 3;
        }
        String crm = str(answers, "vendas.crm_status");
        if ("planilha".equals(crm) || "whatsapp".equals(crm) || "nao_existe_controle".equals(crm)) {
            setupFoundation += 2;
        }

        return new Metrics(google, meta, salesFirst, retention, setupFoundation, offerClarity,
                commercialMaturity, trafficReadiness);
    }

    public static String canalPrioritario(Metrics s) {
        if (s == null) {
            return "google_e_meta";
        }
        if (s.salesFirst >= 6) {
            return "sales_first";
        }
        if (s.google >= 5 && s.google > s.meta) {
            return "google";
        }
        if (s.meta >= 5 && s.meta > s.google) {
            return "meta";
        }
        if (s.google >= 4 && s.meta >= 4) {
            return "google_e_meta";
        }
        if (s.retention >= 4) {
            return "reativacao_base";
        }
        return "google_e_meta";
    }

    private static String tipoDemanda(Map<String, Object> answers) {
        String t = str(answers, "demanda.tipo");
        if ("necessidade".equals(t)) {
            return "captura_intencao";
        }
        if ("desejo".equals(t)) {
            return "geracao_percepcao";
        }
        return "hibrida";
    }

    private static boolean trackingMissingOrNada(Map<String, Object> answers) {
        Object v = answers.get("dados.tracking_status");
        if (v == null) {
            return true;
        }
        if (v instanceof List<?> list) {
            return list.stream().anyMatch(x -> "nada".equals(String.valueOf(x)));
        }
        return false;
    }

    private static String str(Map<String, Object> answers, String key) {
        Object v = answers.get(key);
        return v == null ? null : String.valueOf(v);
    }

    private static boolean truthy(Map<String, Object> answers, String key) {
        Object v = answers.get(key);
        if (v instanceof Boolean b) {
            return b;
        }
        return false;
    }
}
