package com.backend.winai.ai.pipeline.aggregator;

import com.backend.winai.ai.pipeline.config.AiPipelineProperties;
import com.backend.winai.ai.pipeline.model.AiPayload;

import org.awaitility.Awaitility;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.time.Duration;
import java.util.concurrent.CopyOnWriteArrayList;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

class LeadReplyAggregatorTest {

    private AiPipelineProperties props;
    private LeadReplyAggregator aggregator;
    private List<AiPayload> flushed;

    @BeforeEach
    void setup() {
        props = new AiPipelineProperties();
        props.setDecisorMinWaitSec(5);
        props.setDecisorMaxWaitSec(12);
        props.setAggregatorHardCapSec(2);
        aggregator = new LeadReplyAggregator(props);
        flushed = new CopyOnWriteArrayList<>();
        aggregator.setOnFlush(flushed::add);
    }

    @AfterEach
    void teardown() {
        aggregator.destroy();
    }

    @Test
    void zeroWaitFlushesImmediately() {
        aggregator.offer(newPayload("co", "conv", "oi"), 0);
        Awaitility.await().atMost(Duration.ofMillis(500)).until(() -> flushed.size() == 1);
        assertThat(flushed.get(0).getMessageText()).isEqualTo("oi");
    }

    @Test
    void newMessageWithZeroWaitFlushesAggregatedBurst() {
        aggregator.offer(newPayload("co", "conv", "primeira"), 10);
        aggregator.offer(newPayload("co", "conv", "segunda"), 0);
        Awaitility.await().atMost(Duration.ofSeconds(1)).until(() -> !flushed.isEmpty());
        assertThat(flushed.get(0).getMessageText()).contains("primeira").contains("segunda");
    }

    @Test
    void differentKeysAreIndependent() {
        aggregator.offer(newPayload("co", "convA", "a"), 0);
        aggregator.offer(newPayload("co", "convB", "b"), 0);
        Awaitility.await().atMost(Duration.ofMillis(500)).until(() -> flushed.size() == 2);
    }

    @Test
    void nullPayloadIgnored() {
        aggregator.offer(null, 5);
        assertThat(flushed).isEmpty();
    }

    private static AiPayload newPayload(String company, String conv, String text) {
        AiPayload p = new AiPayload();
        p.setCompanyId(company);
        p.setConversationId(conv);
        p.setMessageText(text);
        return p;
    }
}
