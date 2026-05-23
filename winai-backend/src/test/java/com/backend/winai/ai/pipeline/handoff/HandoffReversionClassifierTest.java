package com.backend.winai.ai.pipeline.handoff;

import com.backend.winai.ai.pipeline.config.AiPipelineProperties;
import com.backend.winai.service.OpenAiService;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

class HandoffReversionClassifierTest {

    private AiPipelineProperties props;
    private OpenAiService openAi;
    private HandoffReversionClassifier classifier;

    @BeforeEach
    void setup() {
        props = new AiPipelineProperties();
        openAi = mock(OpenAiService.class);
        classifier = new HandoffReversionClassifier(props, openAi);
    }

    @Test
    void parseAcceptsBareWords() {
        assertThat(HandoffReversionClassifier.parse("REVERT")).isEqualTo(HandoffReversionClassifier.Decision.REVERT);
        assertThat(HandoffReversionClassifier.parse("stay")).isEqualTo(HandoffReversionClassifier.Decision.STAY);
        assertThat(HandoffReversionClassifier.parse("ambiguous")).isEqualTo(HandoffReversionClassifier.Decision.AMBIGUOUS);
    }

    @Test
    void parseHandlesWhitespaceAndCase() {
        assertThat(HandoffReversionClassifier.parse("  Revert  ")).isEqualTo(HandoffReversionClassifier.Decision.REVERT);
    }

    @Test
    void parseFallsBackToContainsCheck() {
        assertThat(HandoffReversionClassifier.parse("Decisão: REVERT (mudou de assunto)"))
                .isEqualTo(HandoffReversionClassifier.Decision.REVERT);
        assertThat(HandoffReversionClassifier.parse("Decisão STAY"))
                .isEqualTo(HandoffReversionClassifier.Decision.STAY);
    }

    @Test
    void parseInvalidReturnsAmbiguous() {
        assertThat(HandoffReversionClassifier.parse(null)).isEqualTo(HandoffReversionClassifier.Decision.AMBIGUOUS);
        assertThat(HandoffReversionClassifier.parse("")).isEqualTo(HandoffReversionClassifier.Decision.AMBIGUOUS);
        assertThat(HandoffReversionClassifier.parse("não sei")).isEqualTo(HandoffReversionClassifier.Decision.AMBIGUOUS);
    }

    @Test
    void blankCurrentReturnsAmbiguous() {
        assertThat(classifier.classify(List.of(), null)).isEqualTo(HandoffReversionClassifier.Decision.AMBIGUOUS);
        assertThat(classifier.classify(List.of(), "  ")).isEqualTo(HandoffReversionClassifier.Decision.AMBIGUOUS);
    }

    @Test
    void revertWhenLeadAsksNewProductQuestion() {
        when(openAi.generateResponseWithModel(anyString(), anyString(), anyString())).thenReturn("REVERT");
        List<OpenAiService.ChatMessage> history = List.of(
                new OpenAiService.ChatMessage("user", "Pode me transferir para um humano?"),
                new OpenAiService.ChatMessage("assistant", "Entendi! Vou chamar nossa especialista humana"),
                new OpenAiService.ChatMessage("user", "Olá"),
                new OpenAiService.ChatMessage("user", "pode me reenviar o catálogo?")
        );
        assertThat(classifier.classify(history, "pode me reenviar o catálogo?"))
                .isEqualTo(HandoffReversionClassifier.Decision.REVERT);
    }

    @Test
    void stayWhenLeadReaffirmsHumanRequest() {
        when(openAi.generateResponseWithModel(anyString(), anyString(), anyString())).thenReturn("STAY");
        assertThat(classifier.classify(List.of(), "ainda quero falar com humano"))
                .isEqualTo(HandoffReversionClassifier.Decision.STAY);
    }

    @Test
    void openAiErrorReturnsAmbiguousSafely() {
        when(openAi.generateResponseWithModel(anyString(), anyString(), anyString()))
                .thenThrow(new RuntimeException("api down"));
        assertThat(classifier.classify(List.of(), "preço do produto?"))
                .isEqualTo(HandoffReversionClassifier.Decision.AMBIGUOUS);
    }

    @Test
    void truncatesLongHistoryLines() {
        when(openAi.generateResponseWithModel(anyString(), anyString(), anyString())).thenReturn("REVERT");
        String huge = "x".repeat(5000);
        List<OpenAiService.ChatMessage> history = List.of(
                new OpenAiService.ChatMessage("user", huge),
                new OpenAiService.ChatMessage("assistant", huge)
        );
        assertThat(classifier.classify(history, "qual o preço?"))
                .isEqualTo(HandoffReversionClassifier.Decision.REVERT);
    }
}
