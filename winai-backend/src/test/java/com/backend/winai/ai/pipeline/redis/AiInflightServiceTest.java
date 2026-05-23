package com.backend.winai.ai.pipeline.redis;

import com.backend.winai.ai.pipeline.config.AiPipelineProperties;
import com.backend.winai.ai.pipeline.model.AiPayload;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.data.redis.RedisConnectionFailureException;
import org.springframework.data.redis.core.ListOperations;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.data.redis.core.ValueOperations;

import java.time.Duration;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class AiInflightServiceTest {

    private StringRedisTemplate redis;
    private ValueOperations<String, String> valueOps;
    private ListOperations<String, String> listOps;
    private AiPipelineProperties props;
    private AiInflightService svc;

    @BeforeEach
    @SuppressWarnings("unchecked")
    void setup() {
        redis = mock(StringRedisTemplate.class);
        valueOps = mock(ValueOperations.class);
        listOps = mock(ListOperations.class);
        when(redis.opsForValue()).thenReturn(valueOps);
        when(redis.opsForList()).thenReturn(listOps);

        props = new AiPipelineProperties();
        svc = new AiInflightService(redis, props);
    }

    @Test
    void claimInflightSuccess() {
        when(valueOps.setIfAbsent(anyString(), anyString(), any(Duration.class))).thenReturn(true);
        assertThat(svc.tryClaimInflight("co", "conv")).isTrue();
    }

    @Test
    void claimInflightAlreadyHeld() {
        when(valueOps.setIfAbsent(anyString(), anyString(), any(Duration.class))).thenReturn(false);
        assertThat(svc.tryClaimInflight("co", "conv")).isFalse();
    }

    @Test
    void claimInflightFailOpenOnRedisError() {
        when(valueOps.setIfAbsent(anyString(), anyString(), any(Duration.class)))
                .thenThrow(new RedisConnectionFailureException("down"));
        assertThat(svc.tryClaimInflight("co", "conv")).isTrue();
    }

    @Test
    void pushBufferSerializesJson() {
        AiPayload p = new AiPayload();
        p.setConversationId("conv");
        p.setCompanyId("co");
        p.setMessageText("oi");
        svc.pushBuffer("co", "conv", p);
        verify(listOps).rightPush(eq("winai:ai:buffer:v1:co:conv"), anyString());
        verify(redis).expire(eq("winai:ai:buffer:v1:co:conv"), any(Duration.class));
    }

    @Test
    void drainBufferReturnsAllAndStopsOnNull() {
        when(listOps.leftPop("winai:ai:buffer:v1:co:conv"))
                .thenReturn("{\"messageText\":\"a\"}", "{\"messageText\":\"b\"}", null);
        List<AiPayload> out = svc.drainBuffer("co", "conv");
        assertThat(out).hasSize(2);
        assertThat(out.get(0).getMessageText()).isEqualTo("a");
        assertThat(out.get(1).getMessageText()).isEqualTo("b");
    }

    @Test
    void drainBufferEmptyOnRedisError() {
        when(listOps.leftPop(anyString())).thenThrow(new RuntimeException("boom"));
        assertThat(svc.drainBuffer("co", "conv")).isEmpty();
    }

    @Test
    void drainBufferSkipsCorruptEntries() {
        when(listOps.leftPop("winai:ai:buffer:v1:co:conv"))
                .thenReturn("not json", "{\"messageText\":\"ok\"}", null);
        List<AiPayload> out = svc.drainBuffer("co", "conv");
        assertThat(out).hasSize(1);
        assertThat(out.get(0).getMessageText()).isEqualTo("ok");
    }

    @Test
    void peekBufferReturnsList() {
        when(listOps.range("winai:ai:buffer:v1:co:conv", 0, -1))
                .thenReturn(List.of("{\"messageText\":\"x\"}"));
        List<AiPayload> out = svc.peekBuffer("co", "conv");
        assertThat(out).hasSize(1);
        assertThat(out.get(0).getMessageText()).isEqualTo("x");
    }

    @Test
    void releaseInflightAndDrainDrainsBeforeDelete() {
        when(listOps.leftPop(anyString())).thenReturn(null);
        svc.releaseInflightAndDrain("co", "conv");
        verify(redis).delete("winai:ai:inflight:v1:co:conv");
    }

    @Test
    void tryClaimProcessedWaBlankAlwaysTrue() {
        assertThat(svc.tryClaimProcessedWa("co", null)).isTrue();
        assertThat(svc.tryClaimProcessedWa("co", " ")).isTrue();
    }

    @Test
    void tryClaimProcessedWaUsesSetIfAbsent() {
        when(valueOps.setIfAbsent(anyString(), anyString(), any(Duration.class))).thenReturn(true);
        assertThat(svc.tryClaimProcessedWa("co", "wa-1")).isTrue();
        verify(valueOps).setIfAbsent(eq("winai:ai:processed_wa:v1:co:wa-1"), eq("1"), any(Duration.class));
    }

    @Test
    void tryClaimEnqueueWaBlankAllows() {
        assertThat(svc.tryClaimEnqueueWa("co", null)).isTrue();
    }

    @Test
    void tryRegisterOutboundCooldownDelegates() {
        when(valueOps.setIfAbsent(anyString(), anyString(), any(Duration.class))).thenReturn(true);
        assertThat(svc.tryRegisterOutboundCooldown("co", "conv", 5_000L)).isTrue();
        verify(valueOps, times(1)).setIfAbsent(eq("winai:ai:outgoing_send:v1:co:conv"), anyString(), any(Duration.class));
    }

    @Test
    void tryRegisterOutboundCooldownFailOpenOnError() {
        when(valueOps.setIfAbsent(anyString(), anyString(), any(Duration.class)))
                .thenThrow(new RuntimeException("boom"));
        assertThat(svc.tryRegisterOutboundCooldown("co", "conv", 5_000L)).isTrue();
    }
}
