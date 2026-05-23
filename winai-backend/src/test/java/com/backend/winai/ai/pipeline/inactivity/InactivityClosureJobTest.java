package com.backend.winai.ai.pipeline.inactivity;

import com.backend.winai.ai.pipeline.config.AiPipelineProperties;
import com.backend.winai.entity.WhatsAppConversation;
import com.backend.winai.repository.WhatsAppConversationRepository;
import com.backend.winai.service.AIAgentService;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;

import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class InactivityClosureJobTest {

    private AiPipelineProperties props;
    private WhatsAppConversationRepository repo;
    private AIAgentService agent;
    private InactivityClosureJob job;

    @BeforeEach
    void setup() {
        props = new AiPipelineProperties();
        props.setInactivityTimeoutMin(60L);
        repo = mock(WhatsAppConversationRepository.class);
        agent = mock(AIAgentService.class);
        job = new InactivityClosureJob(props, repo, agent);
    }

    @Test
    void noneIdleDoesNothing() {
        when(repo.findIaConversationsIdleSince(anyLong())).thenReturn(List.of());
        job.runHourly();
        verify(agent, never()).updateLeadMemory(any(WhatsAppConversation.class), any(String.class));
    }

    @Test
    void eachIdleConvGetsSummaryAndClosed() {
        WhatsAppConversation a = newConv();
        WhatsAppConversation b = newConv();
        when(repo.findIaConversationsIdleSince(anyLong())).thenReturn(List.of(a, b));

        job.runHourly();

        verify(agent, times(2)).updateLeadMemory(any(WhatsAppConversation.class), eq("[SUMMARY]"));
        verify(repo, times(2)).save(any(WhatsAppConversation.class));
        assertThat(a.getSupportMode()).isEqualToIgnoringCase("HUMAN");
        assertThat(b.getSupportMode()).isEqualToIgnoringCase("HUMAN");
    }

    @Test
    void cutoffComputedFromTimeoutMin() {
        long now = System.currentTimeMillis();
        when(repo.findIaConversationsIdleSince(anyLong())).thenReturn(List.of());

        job.runHourly();

        ArgumentCaptor<Long> captor = ArgumentCaptor.forClass(Long.class);
        verify(repo).findIaConversationsIdleSince(captor.capture());
        long cutoff = captor.getValue();
        long expected = now - 60 * 60_000L;
        assertThat(cutoff).isBetween(expected - 5_000L, expected + 5_000L);
    }

    @Test
    void timeoutMinFloorAt15() {
        props.setInactivityTimeoutMin(1L);
        when(repo.findIaConversationsIdleSince(anyLong())).thenReturn(List.of());

        job.runHourly();

        ArgumentCaptor<Long> captor = ArgumentCaptor.forClass(Long.class);
        verify(repo).findIaConversationsIdleSince(captor.capture());
        long cutoff = captor.getValue();
        long now = System.currentTimeMillis();
        assertThat(now - cutoff).isGreaterThanOrEqualTo(15 * 60_000L - 5_000L);
    }

    @Test
    void repoErrorSwallowed() {
        when(repo.findIaConversationsIdleSince(anyLong())).thenThrow(new RuntimeException("db"));
        job.runHourly();
        verify(agent, never()).updateLeadMemory(any(WhatsAppConversation.class), any(String.class));
    }

    @Test
    void perConvErrorDoesNotStopOthers() {
        WhatsAppConversation a = newConv();
        WhatsAppConversation b = newConv();
        when(repo.findIaConversationsIdleSince(anyLong())).thenReturn(List.of(a, b));
        org.mockito.Mockito.doThrow(new RuntimeException("oops"))
                .when(agent).updateLeadMemory(eq(a), any(String.class));

        job.runHourly();

        verify(agent).updateLeadMemory(eq(b), eq("[SUMMARY]"));
    }

    private static WhatsAppConversation newConv() {
        return WhatsAppConversation.builder()
                .id(UUID.randomUUID())
                .phoneNumber("5599999999999")
                .supportMode("IA")
                .lastMessageTimestamp(System.currentTimeMillis() - 24L * 3600_000L)
                .build();
    }
}
