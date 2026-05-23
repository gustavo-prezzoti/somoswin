package com.backend.winai.ai.pipeline.filters;

import com.backend.winai.ai.pipeline.config.AiPipelineProperties;
import com.backend.winai.ai.pipeline.model.AiPayload;
import com.backend.winai.entity.WhatsAppMessage;
import com.backend.winai.repository.WhatsAppMessageRepository;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

class DuplicateUserEchoFilterTest {

    private AiPipelineProperties props;
    private WhatsAppMessageRepository repo;
    private DuplicateUserEchoFilter filter;

    @BeforeEach
    void setup() {
        props = new AiPipelineProperties();
        repo = mock(WhatsAppMessageRepository.class);
        filter = new DuplicateUserEchoFilter(props, repo);
    }

    @Test
    void shortTextNeverSkipped() {
        AiPayload p = new AiPayload();
        p.setConversationId(UUID.randomUUID().toString());
        p.setMessageText("oi");
        assertThat(filter.shouldSkip(p)).isFalse();
    }

    @Test
    void mediaNeverSkipped() {
        AiPayload p = new AiPayload();
        p.setConversationId(UUID.randomUUID().toString());
        p.setMessageText("uma frase com mais de vinte e quatro runes mesmo");
        p.setMediaType("image");
        assertThat(filter.shouldSkip(p)).isFalse();
    }

    @Test
    void duplicateRecentTextSkipped() {
        UUID convId = UUID.randomUUID();
        String text = "uma mensagem repetida com mais de vinte e quatro caracteres aqui";
        AiPayload p = new AiPayload();
        p.setConversationId(convId.toString());
        p.setMessageText(text);

        WhatsAppMessage m = WhatsAppMessage.builder()
                .content(text)
                .fromMe(false)
                .messageTimestamp(System.currentTimeMillis() - 1_000L)
                .build();
        when(repo.findByConversationIdOrderByMessageTimestampDesc(convId)).thenReturn(List.of(m));

        assertThat(filter.shouldSkip(p)).isTrue();
    }

    @Test
    void oldDuplicateNotSkipped() {
        UUID convId = UUID.randomUUID();
        String text = "uma mensagem repetida com mais de vinte e quatro caracteres aqui";
        AiPayload p = new AiPayload();
        p.setConversationId(convId.toString());
        p.setMessageText(text);

        WhatsAppMessage m = WhatsAppMessage.builder()
                .content(text)
                .fromMe(false)
                .messageTimestamp(System.currentTimeMillis() - props.getDuplicateUserEchoMaxAgeMs() - 60_000L)
                .build();
        when(repo.findByConversationIdOrderByMessageTimestampDesc(convId)).thenReturn(List.of(m));

        assertThat(filter.shouldSkip(p)).isFalse();
    }

    @Test
    void differentContentNotSkipped() {
        UUID convId = UUID.randomUUID();
        AiPayload p = new AiPayload();
        p.setConversationId(convId.toString());
        p.setMessageText("uma mensagem nova com mais de vinte e quatro caracteres aqui");

        WhatsAppMessage m = WhatsAppMessage.builder()
                .content("outra coisa qualquer totalmente diferente bem comprido aqui")
                .fromMe(false)
                .messageTimestamp(System.currentTimeMillis() - 1_000L)
                .build();
        when(repo.findByConversationIdOrderByMessageTimestampDesc(convId)).thenReturn(List.of(m));

        assertThat(filter.shouldSkip(p)).isFalse();
    }

    @Test
    void messagesFromMeIgnored() {
        UUID convId = UUID.randomUUID();
        String text = "uma mensagem com mais de vinte e quatro caracteres mesmo aqui";
        AiPayload p = new AiPayload();
        p.setConversationId(convId.toString());
        p.setMessageText(text);

        WhatsAppMessage m = WhatsAppMessage.builder()
                .content(text)
                .fromMe(true)
                .messageTimestamp(System.currentTimeMillis() - 1_000L)
                .build();
        when(repo.findByConversationIdOrderByMessageTimestampDesc(convId)).thenReturn(List.of(m));

        assertThat(filter.shouldSkip(p)).isFalse();
    }

    @Test
    void invalidConversationIdNotSkipped() {
        AiPayload p = new AiPayload();
        p.setConversationId("not-a-uuid");
        p.setMessageText("uma mensagem com mais de vinte e quatro caracteres mesmo");
        assertThat(filter.shouldSkip(p)).isFalse();
    }

    @Test
    void repoErrorReturnsFalse() {
        UUID convId = UUID.randomUUID();
        AiPayload p = new AiPayload();
        p.setConversationId(convId.toString());
        p.setMessageText("uma mensagem com mais de vinte e quatro caracteres mesmo");
        when(repo.findByConversationIdOrderByMessageTimestampDesc(any())).thenThrow(new RuntimeException("boom"));
        assertThat(filter.shouldSkip(p)).isFalse();
    }
}
