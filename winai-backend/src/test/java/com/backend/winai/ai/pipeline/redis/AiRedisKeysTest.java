package com.backend.winai.ai.pipeline.redis;

import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class AiRedisKeysTest {

    @Test
    void inflightKeyFormat() {
        assertThat(AiRedisKeys.inflight("co1", "conv1"))
                .isEqualTo("winai:ai:inflight:v1:co1:conv1");
    }

    @Test
    void bufferKeyFormat() {
        assertThat(AiRedisKeys.buffer("co1", "conv1"))
                .isEqualTo("winai:ai:buffer:v1:co1:conv1");
    }

    @Test
    void processedWaKeyFormat() {
        assertThat(AiRedisKeys.processedWa("co1", "wa-abc"))
                .isEqualTo("winai:ai:processed_wa:v1:co1:wa-abc");
    }

    @Test
    void enqueueWaKeyFormat() {
        assertThat(AiRedisKeys.enqueueWa("co1", "wa-abc"))
                .isEqualTo("winai:ai:enqueue_wa:v1:co1:wa-abc");
    }

    @Test
    void outgoingSendKeyFormat() {
        assertThat(AiRedisKeys.outgoingSend("co1", "conv1"))
                .isEqualTo("winai:ai:outgoing_send:v1:co1:conv1");
    }

    @Test
    void safeReplacesSpaceAndColon() {
        assertThat(AiRedisKeys.inflight("co 1", "x:y"))
                .isEqualTo("winai:ai:inflight:v1:co_1:x_y");
    }

    @Test
    void blankSectorOrContactBecomesUnderscore() {
        assertThat(AiRedisKeys.inflight("", null)).isEqualTo("winai:ai:inflight:v1:_:_");
    }
}
