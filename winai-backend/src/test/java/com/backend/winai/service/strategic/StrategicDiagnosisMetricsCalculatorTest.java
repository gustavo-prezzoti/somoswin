package com.backend.winai.service.strategic;

import org.junit.jupiter.api.Test;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertEquals;

class StrategicDiagnosisMetricsCalculatorTest {

    @Test
    void multiModelo_appliesBothB2cLocalAndB2bBoosts() {
        Map<String, Object> answers = new HashMap<>();
        answers.put("negocio.modelo_principal", List.of("b2b", "b2c_local"));
        answers.put("demanda.tipo", "necessidade");

        StrategicDiagnosisMetricsCalculator.Metrics m = StrategicDiagnosisMetricsCalculator.calculateMetrics(answers);
        assertEquals(5, m.google());
        assertEquals(3, m.salesFirst());
    }

    @Test
    void mockQuickDiagnosis_salesFirstCanal() {
        Map<String, Object> answers = new HashMap<>();
        answers.put("negocio.modelo_principal", "b2b");
        answers.put("demanda.tipo", "necessidade");
        answers.put("negocio.ticket_medio", "2001_10000");
        answers.put("vendas.modelo_fechamento", "reuniao_call");

        StrategicDiagnosisMetricsCalculator.Metrics m = StrategicDiagnosisMetricsCalculator.calculateMetrics(answers);
        assertEquals(3, m.google());
        assertEquals(0, m.meta());
        assertEquals(7, m.salesFirst());
        assertEquals(0, m.retention());
        assertEquals(3, m.setupFoundation());

        assertEquals("sales_first", StrategicDiagnosisMetricsCalculator.canalPrioritario(m));
    }

    @Test
    void emptyAnswers_defaultsToGoogleEMeta() {
        StrategicDiagnosisMetricsCalculator.Metrics m = StrategicDiagnosisMetricsCalculator.calculateMetrics(Map.of());
        assertEquals("google_e_meta", StrategicDiagnosisMetricsCalculator.canalPrioritario(m));
    }

    @Test
    void retentionCanal_whenHighRetention() {
        Map<String, Object> answers = new HashMap<>();
        answers.put("pos_venda.recompra_existe", "sim_com_frequencia");
        StrategicDiagnosisMetricsCalculator.Metrics m = StrategicDiagnosisMetricsCalculator.calculateMetrics(answers);
        assertEquals(2, m.retention());
        assertEquals("google_e_meta", StrategicDiagnosisMetricsCalculator.canalPrioritario(m));
    }

    @Test
    void trackingNada_incrementsSetupFoundation() {
        Map<String, Object> answers = new HashMap<>();
        answers.put("dados.tracking_status", List.of("pixel_basico", "nada"));
        StrategicDiagnosisMetricsCalculator.Metrics m = StrategicDiagnosisMetricsCalculator.calculateMetrics(answers);
        assertEquals(3, m.setupFoundation());
    }

    @Test
    void whatsappClosing_addsGoogleAndMeta() {
        Map<String, Object> answers = new HashMap<>();
        answers.put("demanda.tipo", "desejo");
        answers.put("vendas.modelo_fechamento", "whatsapp");
        StrategicDiagnosisMetricsCalculator.Metrics m = StrategicDiagnosisMetricsCalculator.calculateMetrics(answers);
        assertEquals(1, m.google());
        assertEquals(5, m.meta());
    }
}
