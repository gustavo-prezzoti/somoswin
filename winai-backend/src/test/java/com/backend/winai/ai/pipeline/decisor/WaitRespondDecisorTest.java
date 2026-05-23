package com.backend.winai.ai.pipeline.decisor;

import com.backend.winai.ai.pipeline.config.AiPipelineProperties;
import com.backend.winai.ai.pipeline.model.AiPayload;
import com.backend.winai.service.OpenAiService;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

class WaitRespondDecisorTest {

    private AiPipelineProperties props;
    private OpenAiService openAi;
    private WaitRespondDecisor decisor;

    @BeforeEach
    void setup() {
        props = new AiPipelineProperties();
        openAi = mock(OpenAiService.class);
        decisor = new WaitRespondDecisor(props, openAi);
    }

    @Test
    void parseScoreAcceptsBareDecimal() {
        assertThat(WaitRespondDecisor.parseScore("0.5")).isEqualTo(0.5);
        assertThat(WaitRespondDecisor.parseScore("1")).isEqualTo(1.0);
        assertThat(WaitRespondDecisor.parseScore("0")).isEqualTo(0.0);
    }

    @Test
    void parseScoreAcceptsCommaDecimal() {
        assertThat(WaitRespondDecisor.parseScore("0,75")).isEqualTo(0.75);
    }

    @Test
    void parseScoreStripsLabelAndPunctuation() {
        assertThat(WaitRespondDecisor.parseScore("Score: 0.42 (likely done)")).isEqualTo(0.42);
    }

    @Test
    void parseScoreInvalidReturnsNaN() {
        assertThat(WaitRespondDecisor.parseScore(null)).isNaN();
        assertThat(WaitRespondDecisor.parseScore("")).isNaN();
        assertThat(WaitRespondDecisor.parseScore("hello")).isNaN();
        assertThat(WaitRespondDecisor.parseScore(".")).isNaN();
    }

    @Test
    void mediaPayloadSkipsDecisor() {
        AiPayload p = new AiPayload();
        p.setMediaType("audio");
        p.setMessageText("transcription");
        assertThat(decisor.decideWaitSeconds(p, List.of())).isZero();
    }

    @Test
    void emptyTextSkipsDecisor() {
        AiPayload p = new AiPayload();
        assertThat(decisor.decideWaitSeconds(p, List.of())).isZero();
    }

    @Test
    void highScoreReturnsFloor() {
        when(openAi.generateResponseWithModel(anyString(), anyString(), anyString())).thenReturn("1.0");
        AiPayload p = new AiPayload();
        p.setMessageText("ok terminei");
        int wait = decisor.decideWaitSeconds(p, List.of());
        assertThat(wait).isEqualTo(props.floorWaitSec());
    }

    @Test
    void lowScoreReturnsMax() {
        when(openAi.generateResponseWithModel(anyString(), anyString(), anyString())).thenReturn("0.0");
        AiPayload p = new AiPayload();
        p.setMessageText("oi");
        int wait = decisor.decideWaitSeconds(p, List.of());
        assertThat(wait).isEqualTo(props.maxWaitSec());
    }

    @Test
    void mediumScoreInRange() {
        when(openAi.generateResponseWithModel(anyString(), anyString(), anyString())).thenReturn("0.5");
        AiPayload p = new AiPayload();
        p.setMessageText("vamos ver");
        int wait = decisor.decideWaitSeconds(p, List.of());
        assertThat(wait).isBetween(props.minWaitSec(), props.maxWaitSec());
    }

    @Test
    void openAiErrorReturnsZero() {
        when(openAi.generateResponseWithModel(anyString(), anyString(), anyString()))
                .thenThrow(new RuntimeException("boom"));
        AiPayload p = new AiPayload();
        p.setMessageText("teste");
        assertThat(decisor.decideWaitSeconds(p, List.of())).isZero();
    }

    @Test
    void invalidScoreReturnsZero() {
        when(openAi.generateResponseWithModel(anyString(), anyString(), anyString())).thenReturn("não sei");
        AiPayload p = new AiPayload();
        p.setMessageText("teste");
        assertThat(decisor.decideWaitSeconds(p, List.of())).isZero();
    }

    @Test
    void nullPayloadReturnsZero() {
        assertThat(decisor.decideWaitSeconds(null, null)).isZero();
    }
}
