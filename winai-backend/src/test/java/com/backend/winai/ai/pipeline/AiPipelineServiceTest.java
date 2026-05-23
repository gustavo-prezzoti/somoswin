package com.backend.winai.ai.pipeline;

import com.backend.winai.ai.pipeline.aggregator.LeadReplyAggregator;
import com.backend.winai.ai.pipeline.config.AiPipelineProperties;
import com.backend.winai.ai.pipeline.decisor.WaitRespondDecisor;
import com.backend.winai.ai.pipeline.filters.AiCooldownService;
import com.backend.winai.ai.pipeline.filters.StalenessFilter;
import com.backend.winai.ai.pipeline.merge.CoalesceInterruptMerger;
import com.backend.winai.ai.pipeline.model.AiPayload;
import com.backend.winai.ai.pipeline.redis.AiInflightService;
import com.backend.winai.service.AIAgentService;
import com.backend.winai.service.OpenAiService;

import org.awaitility.Awaitility;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;

import java.time.Duration;
import java.util.Collections;
import java.util.List;
import java.util.UUID;
import java.util.concurrent.atomic.AtomicInteger;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.atLeastOnce;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class AiPipelineServiceTest {

    private AiPipelineProperties props;
    private AiInflightService inflight;
    private LeadReplyAggregator aggregator;
    private WaitRespondDecisor decisor;
    private StalenessFilter staleness;
    private AiCooldownService cooldown;
    private CoalesceInterruptMerger coalescer;
    private OpenAiService openAi;
    private AIAgentService aiAgentService;
    private AiPipelineService pipeline;

    @BeforeEach
    void setup() {
        props = new AiPipelineProperties();
        props.setAggregatorHardCapSec(2);
        props.setReplyCooldownMs(0L);
        inflight = mock(AiInflightService.class);
        decisor = mock(WaitRespondDecisor.class);
        staleness = new StalenessFilter(props);
        cooldown = new AiCooldownService(props);
        coalescer = mock(CoalesceInterruptMerger.class);
        openAi = mock(OpenAiService.class);
        aiAgentService = mock(AIAgentService.class);
        aggregator = new LeadReplyAggregator(props);

        when(inflight.tryClaimEnqueueWa(anyString(), any())).thenReturn(true);
        when(inflight.tryClaimInflight(anyString(), anyString())).thenReturn(true);
        when(inflight.tryClaimProcessedWa(anyString(), any())).thenReturn(true);
        when(inflight.tryRegisterOutboundCooldown(anyString(), anyString(), anyLong())).thenReturn(true);
        when(inflight.drainBuffer(anyString(), anyString())).thenReturn(Collections.emptyList());
        when(inflight.releaseInflightAndDrain(anyString(), anyString())).thenReturn(Collections.emptyList());
        when(aiAgentService.getRecentConversationHistory(any(), anyInt())).thenReturn(List.of());

        pipeline = new AiPipelineService(props, inflight, aggregator, decisor, staleness,
                cooldown, coalescer, openAi, aiAgentService);
        pipeline.init();
    }

    @AfterEach
    void teardown() {
        pipeline.destroy();
        aggregator.destroy();
        cooldown.destroy();
    }

    @Test
    void enqueueNullPayloadReturnsFalse() {
        assertThat(pipeline.enqueueIncoming(null)).isFalse();
    }

    @Test
    void enqueueMissingIdsReturnsFalse() {
        AiPayload p = new AiPayload();
        assertThat(pipeline.enqueueIncoming(p)).isFalse();
    }

    @Test
    void stalePublisherIsDropped() {
        AiPayload p = newPayload("co", UUID.randomUUID().toString(), "oi");
        p.setWhatsAppTimestamp(System.currentTimeMillis() - 10 * 60 * 1000L);
        assertThat(pipeline.enqueueIncoming(p)).isFalse();
    }

    @Test
    void duplicateEnqueueWaIsDropped() {
        AiPayload p = newPayload("co", UUID.randomUUID().toString(), "oi");
        p.setWaMessageId("wa-1");
        when(inflight.tryClaimEnqueueWa("co", "wa-1")).thenReturn(false);
        assertThat(pipeline.enqueueIncoming(p)).isFalse();
    }

    @Test
    void inflightBusyBuffersInsteadOfProcessing() {
        AiPayload p = newPayload("co", UUID.randomUUID().toString(), "oi");
        when(inflight.tryClaimInflight(eq("co"), anyString())).thenReturn(false);
        assertThat(pipeline.enqueueIncoming(p)).isTrue();
        verify(inflight).pushBuffer(eq("co"), eq(p.getConversationId()), eq(p));
    }

    @Test
    void zeroWaitFlushesAndInvokesAgent() {
        UUID convId = UUID.randomUUID();
        AiPayload p = newPayload("co", convId.toString(), "oi");
        when(decisor.decideWaitSeconds(any(), any())).thenReturn(0);

        assertThat(pipeline.enqueueIncoming(p)).isTrue();
        Awaitility.await().atMost(Duration.ofSeconds(2)).untilAsserted(() ->
                verify(aiAgentService, atLeastOnce()).runFromPipeline(eq(convId), any(), any(), any()));
    }

    @Test
    void localCooldownActiveRequeues() {
        UUID convId = UUID.randomUUID();
        AiPayload first = newPayload("co", convId.toString(), "primeira");
        AiPayload second = newPayload("co", convId.toString(), "segunda");
        props.setReplyCooldownMs(10_000L);
        when(decisor.decideWaitSeconds(any(), any())).thenReturn(0);

        pipeline.enqueueIncoming(first);
        Awaitility.await().atMost(Duration.ofSeconds(2)).untilAsserted(() ->
                verify(aiAgentService, atLeastOnce()).runFromPipeline(eq(convId), any(), any(), any()));

        pipeline.processMerged(second);
        verify(inflight, atLeastOnce()).pushBuffer(eq("co"), eq(convId.toString()), any(AiPayload.class));
    }

    @Test
    void distributedCooldownActiveRequeues() {
        UUID convId = UUID.randomUUID();
        AiPayload p = newPayload("co", convId.toString(), "oi");
        when(decisor.decideWaitSeconds(any(), any())).thenReturn(0);
        when(inflight.tryRegisterOutboundCooldown(anyString(), anyString(), anyLong())).thenReturn(false);

        pipeline.enqueueIncoming(p);
        Awaitility.await().atMost(Duration.ofSeconds(2)).untilAsserted(() ->
                verify(inflight, atLeastOnce()).pushBuffer(eq("co"), eq(convId.toString()), any(AiPayload.class)));
        verify(aiAgentService, never()).runFromPipeline(any(), any(), any(), any());
    }

    @Test
    void postPublishDrainLoopsUntilEmpty() {
        UUID convId = UUID.randomUUID();
        AiPayload p = newPayload("co", convId.toString(), "oi");
        when(decisor.decideWaitSeconds(any(), any())).thenReturn(0);

        AtomicInteger calls = new AtomicInteger();
        when(inflight.drainBuffer(eq("co"), eq(convId.toString()))).thenAnswer(inv -> {
            if (calls.getAndIncrement() == 0) {
                return List.of(newPayload("co", convId.toString(), "outra"));
            }
            return Collections.emptyList();
        });

        pipeline.enqueueIncoming(p);
        Awaitility.await().atMost(Duration.ofSeconds(3)).untilAsserted(() ->
                verify(aiAgentService, times(2)).runFromPipeline(eq(convId), any(), any(), any()));
    }

    @Test
    void pipelineDisabledStillProcesses() {
        props.setEnabled(false);
        UUID convId = UUID.randomUUID();
        AiPayload p = newPayload("co", convId.toString(), "oi");
        assertThat(pipeline.enqueueIncoming(p)).isTrue();
        Awaitility.await().atMost(Duration.ofSeconds(2)).untilAsserted(() ->
                verify(aiAgentService, atLeastOnce()).runFromPipeline(eq(convId), any(), any(), any()));
    }

    @Test
    void enqueueAcceptsRequestEvenWhenAggregatorWaits() {
        UUID convId = UUID.randomUUID();
        AiPayload p = newPayload("co", convId.toString(), "oi");
        when(decisor.decideWaitSeconds(any(), any())).thenReturn(5);
        assertThat(pipeline.enqueueIncoming(p)).isTrue();
    }

    @Test
    void historyForwardedToDecisor() {
        UUID convId = UUID.randomUUID();
        AiPayload p = newPayload("co", convId.toString(), "oi");
        when(aiAgentService.getRecentConversationHistory(eq(convId), anyInt()))
                .thenReturn(List.of(new OpenAiService.ChatMessage("user", "anterior")));
        when(decisor.decideWaitSeconds(any(), any())).thenReturn(0);

        pipeline.enqueueIncoming(p);

        ArgumentCaptor<List<String>> captor = ArgumentCaptor.forClass(List.class);
        verify(decisor).decideWaitSeconds(eq(p), captor.capture());
        assertThat(captor.getValue()).isNotNull();
    }

    private static AiPayload newPayload(String company, String conv, String text) {
        AiPayload p = new AiPayload();
        p.setCompanyId(company);
        p.setConversationId(conv);
        p.setMessageText(text);
        p.setWhatsAppTimestamp(System.currentTimeMillis());
        return p;
    }
}
