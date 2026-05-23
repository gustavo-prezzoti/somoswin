package com.backend.winai.ai.pipeline.filters;

import com.backend.winai.ai.pipeline.config.AiPipelineProperties;
import com.backend.winai.ai.pipeline.model.AiPayload;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class StalenessFilterTest {

    private AiPipelineProperties props;
    private StalenessFilter filter;

    @BeforeEach
    void setup() {
        props = new AiPipelineProperties();
        props.setPublisherStaleMs(60_000L);
        props.setConsumerStaleMs(60_000L);
        filter = new StalenessFilter(props);
    }

    @Test
    void freshPayloadEnqueued() {
        AiPayload p = new AiPayload();
        p.setWhatsAppTimestamp(System.currentTimeMillis() - 1000L);
        assertThat(filter.isFreshForEnqueue(p)).isTrue();
    }

    @Test
    void oldWhatsAppMessageRejectedForEnqueue() {
        AiPayload p = new AiPayload();
        p.setWhatsAppTimestamp(System.currentTimeMillis() - 600_000L);
        assertThat(filter.isFreshForEnqueue(p)).isFalse();
    }

    @Test
    void nullPayloadRejected() {
        assertThat(filter.isFreshForEnqueue(null)).isFalse();
        assertThat(filter.isFreshForConsume(null)).isFalse();
    }

    @Test
    void missingTimestampAllowsEnqueue() {
        AiPayload p = new AiPayload();
        assertThat(filter.isFreshForEnqueue(p)).isTrue();
    }

    @Test
    void oldEnqueuedRejectedForConsume() {
        AiPayload p = new AiPayload();
        p.setEnqueuedAt(System.currentTimeMillis() - 600_000L);
        assertThat(filter.isFreshForConsume(p)).isFalse();
    }

    @Test
    void oldWaTimestampRejectedForConsume() {
        AiPayload p = new AiPayload();
        p.setEnqueuedAt(System.currentTimeMillis());
        p.setWhatsAppTimestamp(System.currentTimeMillis() - 600_000L);
        assertThat(filter.isFreshForConsume(p)).isFalse();
    }

    @Test
    void freshConsumePasses() {
        AiPayload p = new AiPayload();
        p.setEnqueuedAt(System.currentTimeMillis() - 5_000L);
        p.setWhatsAppTimestamp(System.currentTimeMillis() - 5_000L);
        assertThat(filter.isFreshForConsume(p)).isTrue();
    }
}
