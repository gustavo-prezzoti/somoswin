package com.backend.winai.ai.pipeline.merge;

import com.backend.winai.ai.pipeline.config.AiPipelineProperties;
import com.backend.winai.ai.pipeline.model.AiPayload;
import com.backend.winai.ai.pipeline.redis.AiInflightService;
import com.backend.winai.service.OpenAiService;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.util.Collections;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

class CoalesceInterruptMergerTest {

    private AiPipelineProperties props;
    private AiInflightService inflight;
    private OpenAiService openAi;
    private CoalesceInterruptMerger merger;

    @BeforeEach
    void setup() {
        props = new AiPipelineProperties();
        props.setCoalesceMaxIters(3);
        props.setCoalesceTailWaits(0);
        props.setCoalesceTailSleepMs(10);
        inflight = mock(AiInflightService.class);
        openAi = mock(OpenAiService.class);
        merger = new CoalesceInterruptMerger(props, inflight, openAi);
    }

    @Test
    void noBufferReturnsDraftUnchanged() {
        when(inflight.drainBuffer("co", "conv")).thenReturn(Collections.emptyList());
        CoalesceInterruptMerger.Result r = merger.coalesce("co", "conv", "draft inicial", List.of(), false);
        assertThat(r.regenerate).isFalse();
        assertThat(r.finalText).isEqualTo("draft inicial");
    }

    @Test
    void mediaPayloadTriggersRegenerate() {
        AiPayload p = new AiPayload();
        p.setMediaType("image");
        p.setMessageText("foto");
        when(inflight.drainBuffer("co", "conv")).thenReturn(List.of(p));
        CoalesceInterruptMerger.Result r = merger.coalesce("co", "conv", "draft", List.of(), false);
        assertThat(r.regenerate).isTrue();
        assertThat(r.regenPayloads).hasSize(1);
    }

    @Test
    void mergedDraftReplacesOriginal() {
        AiPayload p = new AiPayload();
        p.setMessageText("também quero saber o preço");
        when(inflight.drainBuffer("co", "conv"))
                .thenReturn(List.of(p))
                .thenReturn(Collections.emptyList());
        when(openAi.generateResponseWithModel(anyString(), anyString(), anyString())).thenReturn("resposta mesclada");

        CoalesceInterruptMerger.Result r = merger.coalesce("co", "conv", "resposta inicial", List.of(), false);
        assertThat(r.regenerate).isFalse();
        assertThat(r.finalText).isEqualTo("resposta mesclada");
    }

    @Test
    void mergeAgentErrorKeepsDraft() {
        AiPayload p = new AiPayload();
        p.setMessageText("mais uma");
        when(inflight.drainBuffer("co", "conv"))
                .thenReturn(List.of(p))
                .thenReturn(Collections.emptyList());
        when(openAi.generateResponseWithModel(anyString(), anyString(), anyString()))
                .thenThrow(new RuntimeException("api down"));
        CoalesceInterruptMerger.Result r = merger.coalesce("co", "conv", "draft original", List.of(), false);
        assertThat(r.regenerate).isFalse();
        assertThat(r.finalText).isEqualTo("draft original");
    }

    @Test
    void transferLatchPreserved() {
        when(inflight.drainBuffer("co", "conv")).thenReturn(Collections.emptyList());
        CoalesceInterruptMerger.Result r = merger.coalesce("co", "conv", "draft", List.of(), true);
        assertThat(r.transferToHuman).isTrue();
    }
}
