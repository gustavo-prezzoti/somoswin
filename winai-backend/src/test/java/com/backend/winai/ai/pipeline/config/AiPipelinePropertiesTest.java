package com.backend.winai.ai.pipeline.config;

import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class AiPipelinePropertiesTest {

    @Test
    void clampsRespectPhysicalLimits() {
        AiPipelineProperties p = new AiPipelineProperties();
        p.setDecisorMinWaitSec(2);
        p.setDecisorMaxWaitSec(99);
        p.setAggregatorFloorWaitSec(20);
        p.setAggregatorHardCapSec(120);
        assertThat(p.minWaitSec()).isEqualTo(5);
        assertThat(p.maxWaitSec()).isEqualTo(12);
        assertThat(p.floorWaitSec()).isEqualTo(12);
        assertThat(p.hardCapSec()).isEqualTo(60);
    }

    @Test
    void defaultsWithinRange() {
        AiPipelineProperties p = new AiPipelineProperties();
        assertThat(p.minWaitSec()).isEqualTo(5);
        assertThat(p.maxWaitSec()).isEqualTo(12);
        assertThat(p.floorWaitSec()).isEqualTo(5);
        assertThat(p.hardCapSec()).isGreaterThanOrEqualTo(p.maxWaitSec());
    }

    @Test
    void maxNotLessThanMin() {
        AiPipelineProperties p = new AiPipelineProperties();
        p.setDecisorMinWaitSec(10);
        p.setDecisorMaxWaitSec(6);
        assertThat(p.maxWaitSec()).isGreaterThanOrEqualTo(p.minWaitSec());
    }

    @Test
    void floorClampedToMax() {
        AiPipelineProperties p = new AiPipelineProperties();
        p.setDecisorMinWaitSec(5);
        p.setDecisorMaxWaitSec(7);
        p.setAggregatorFloorWaitSec(12);
        assertThat(p.floorWaitSec()).isEqualTo(7);
    }
}
