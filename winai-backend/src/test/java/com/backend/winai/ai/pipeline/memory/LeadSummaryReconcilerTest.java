package com.backend.winai.ai.pipeline.memory;

import com.backend.winai.service.OpenAiService;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.util.Set;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class LeadSummaryReconcilerTest {

    private OpenAiService openAi;
    private LeadSummaryReconciler reconciler;

    @BeforeEach
    void setup() {
        openAi = mock(OpenAiService.class);
        reconciler = new LeadSummaryReconciler(openAi);
    }

    @Test
    void extractsCnpjCpfCepEmailPhone() {
        String text = "CNPJ 51.093.069/0001-48, CPF 123.456.789-09, CEP 88010-100, "
                + "e-mail joao@example.com, telefone (48) 99627-0116, IE 944533581252";
        Set<String> tokens = LeadSummaryReconciler.extractTokens(text);
        assertThat(tokens).anyMatch(t -> t.contains("51.093.069/0001-48"));
        assertThat(tokens).anyMatch(t -> t.contains("123.456.789-09"));
        assertThat(tokens).anyMatch(t -> t.contains("88010-100"));
        assertThat(tokens).anyMatch(t -> t.contains("joao@example.com"));
        assertThat(tokens).anyMatch(t -> t.contains("944533581252"));
    }

    @Test
    void reconcileFactsBothBlankReturnsNew() {
        assertThat(reconciler.reconcileFacts(null, null)).isNull();
        assertThat(reconciler.reconcileFacts("", "")).isEmpty();
    }

    @Test
    void reconcileFactsOldBlankReturnsNew() {
        String result = reconciler.reconcileFacts(null, "CNPJ 51.093.069/0001-48");
        assertThat(result).isEqualTo("CNPJ 51.093.069/0001-48");
        verify(openAi, never()).generateResponseWithModel(anyString(), anyString(), anyString());
    }

    @Test
    void reconcileFactsNewBlankKeepsOld() {
        String result = reconciler.reconcileFacts("CNPJ 51.093.069/0001-48", null);
        assertThat(result).isEqualTo("CNPJ 51.093.069/0001-48");
        verify(openAi, never()).generateResponseWithModel(anyString(), anyString(), anyString());
    }

    @Test
    void reconcileFactsSupersetUsesNewNoLlm() {
        String old = "CNPJ 51.093.069/0001-48";
        String fresh = "CNPJ 51.093.069/0001-48, IE 944533581252, e-mail j@x.com";
        String result = reconciler.reconcileFacts(old, fresh);
        assertThat(result).isEqualTo(fresh);
        verify(openAi, never()).generateResponseWithModel(anyString(), anyString(), anyString());
    }

    @Test
    void reconcileFactsLossTriggersLlmMerge() {
        String old = "Empresa HC Group. CNPJ 51.093.069/0001-48. IE 944533581252. CEP 88010-100.";
        String fresh = "Empresa HC Group. CEP 88010-100.";
        String merged = "Empresa HC Group. CNPJ 51.093.069/0001-48. IE 944533581252. CEP 88010-100.";
        when(openAi.generateResponseWithModel(anyString(), anyString(), anyString())).thenReturn(merged);

        String result = reconciler.reconcileFacts(old, fresh);
        assertThat(result).contains("51.093.069/0001-48").contains("944533581252").contains("88010-100");
        verify(openAi, times(1)).generateResponseWithModel(anyString(), anyString(), anyString());
    }

    @Test
    void reconcileFactsLlmStillMissingFallsBackToConcat() {
        String old = "CNPJ 51.093.069/0001-48. IE 944533581252.";
        String fresh = "Lead interessado.";
        when(openAi.generateResponseWithModel(anyString(), anyString(), anyString())).thenReturn("Lead interessado.");

        String result = reconciler.reconcileFacts(old, fresh);
        assertThat(result).contains("51.093.069/0001-48").contains("944533581252");
    }

    @Test
    void reconcileFactsLlmErrorFallsBackToConcat() {
        String old = "CNPJ 51.093.069/0001-48";
        String fresh = "outro texto";
        when(openAi.generateResponseWithModel(anyString(), anyString(), anyString()))
                .thenThrow(new RuntimeException("api down"));
        String result = reconciler.reconcileFacts(old, fresh);
        assertThat(result).contains("51.093.069/0001-48").contains("outro texto");
    }

    @Test
    void reconcileFactsRespectsCap() {
        String old = "x".repeat(900);
        String fresh = "x".repeat(900);
        String result = reconciler.reconcileFacts(old, fresh);
        assertThat(result.length()).isLessThanOrEqualTo(800);
    }

    @Test
    void reconcileIntentNewBlankKeepsOld() {
        String result = reconciler.reconcileIntent("Lead em qualificação, aguardando catálogo", null);
        assertThat(result).isEqualTo("Lead em qualificação, aguardando catálogo");
    }

    @Test
    void reconcileIntentOldBlankReturnsNew() {
        String result = reconciler.reconcileIntent(null, "Lead em qualificação");
        assertThat(result).isEqualTo("Lead em qualificação");
        verify(openAi, never()).generateResponseWithModel(anyString(), anyString(), anyString());
    }

    @Test
    void reconcileIntentSimilarLengthUsesNewNoLlm() {
        String old = "Lead em qualificação, aguardando envio do catálogo.";
        String fresh = "Lead negociando, decidiu pelo plano premium e aguarda link.";
        String result = reconciler.reconcileIntent(old, fresh);
        assertThat(result).isEqualTo(fresh);
        verify(openAi, never()).generateResponseWithModel(anyString(), anyString(), anyString());
    }

    @Test
    void reconcileIntentShrunkTriggersLlmMerge() {
        String old = "Lead em qualificação, interessado nas linhas DuBebê e DuMomento, "
                + "aguardando envio do catálogo, tom engajado, próxima ação enviar link.";
        String fresh = "Lead engajado.";
        when(openAi.generateResponseWithModel(anyString(), anyString(), anyString()))
                .thenReturn("Lead engajado, interessado nas linhas DuBebê e DuMomento, aguardando envio do catálogo.");
        String result = reconciler.reconcileIntent(old, fresh);
        assertThat(result).contains("DuBebê").contains("DuMomento");
        verify(openAi, times(1)).generateResponseWithModel(anyString(), anyString(), anyString());
    }

    @Test
    void reconcileIntentLlmErrorKeepsOld() {
        String old = "Lead em qualificação, interessado em DuBebê e DuMomento, "
                + "aguardando envio do catálogo, tom engajado, próxima ação enviar link.";
        String fresh = "x";
        when(openAi.generateResponseWithModel(anyString(), anyString(), anyString()))
                .thenThrow(new RuntimeException("api down"));
        String result = reconciler.reconcileIntent(old, fresh);
        assertThat(result).contains("DuBebê").contains("DuMomento");
    }
}
