package com.backend.winai.ai.pipeline.filters;

import com.backend.winai.ai.pipeline.config.AiPipelineProperties;

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class AiCooldownServiceTest {

    private AiPipelineProperties props;
    private AiCooldownService svc;

    @BeforeEach
    void setup() {
        props = new AiPipelineProperties();
        props.setReplyCooldownMs(100L);
        svc = new AiCooldownService(props);
    }

    @AfterEach
    void teardown() {
        svc.destroy();
    }

    @Test
    void firstCallPasses() {
        assertThat(svc.tryConsume("co:conv")).isTrue();
    }

    @Test
    void secondCallWithinCooldownBlocked() {
        assertThat(svc.tryConsume("co:conv")).isTrue();
        assertThat(svc.tryConsume("co:conv")).isFalse();
    }

    @Test
    void callAfterCooldownPasses() throws InterruptedException {
        assertThat(svc.tryConsume("co:conv")).isTrue();
        Thread.sleep(150L);
        assertThat(svc.tryConsume("co:conv")).isTrue();
    }

    @Test
    void differentContactsIndependent() {
        assertThat(svc.tryConsume("co:a")).isTrue();
        assertThat(svc.tryConsume("co:b")).isTrue();
        assertThat(svc.tryConsume("co:a")).isFalse();
    }

    @Test
    void nullKeyAlwaysAllowed() {
        assertThat(svc.tryConsume(null)).isTrue();
        assertThat(svc.tryConsume(null)).isTrue();
    }
}
