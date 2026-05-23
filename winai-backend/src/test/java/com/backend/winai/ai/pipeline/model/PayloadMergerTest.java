package com.backend.winai.ai.pipeline.model;

import org.junit.jupiter.api.Test;

import java.util.Arrays;
import java.util.Collections;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

class PayloadMergerTest {

    @Test
    void mergeNullOrEmptyReturnsNull() {
        assertThat(PayloadMerger.merge(null)).isNull();
        assertThat(PayloadMerger.merge(Collections.emptyList())).isNull();
    }

    @Test
    void mergeSingleReturnsSame() {
        AiPayload p = newPayload("oi", "wa-1", 100L, 50L);
        assertThat(PayloadMerger.merge(List.of(p))).isSameAs(p);
    }

    @Test
    void mergePreservesFirstWaIdAndOldestEnqueuedAndLatestWaTs() {
        AiPayload a = newPayload("primeira", "wa-A", 1000L, 100L);
        AiPayload b = newPayload("segunda", "wa-B", 1200L, 50L);
        AiPayload c = newPayload("terceira", "wa-C", 800L, 200L);

        AiPayload merged = PayloadMerger.merge(Arrays.asList(a, b, c));

        assertThat(merged.getWaMessageId()).isEqualTo("wa-A");
        assertThat(merged.getMessageText()).isEqualTo("primeira\nsegunda\nterceira");
        assertThat(merged.getEnqueuedAt()).isEqualTo(50L);
        assertThat(merged.getWhatsAppTimestamp()).isEqualTo(1200L);
    }

    @Test
    void mergePrioritizesFirstMediaPayload() {
        AiPayload a = newPayload("oi", "wa-A", 1000L, 100L);
        AiPayload b = new AiPayload();
        b.setMessageText("imagem");
        b.setMediaType("image");
        b.setMediaUrl("https://x/y.jpg");
        b.setEnqueuedAt(200L);
        AiPayload c = new AiPayload();
        c.setMessageText("audio");
        c.setMediaType("audio");
        c.setMediaUrl("https://x/y.ogg");
        c.setEnqueuedAt(300L);

        AiPayload merged = PayloadMerger.merge(List.of(a, b, c));
        assertThat(merged.getMediaType()).isEqualTo("image");
        assertThat(merged.getMediaUrl()).isEqualTo("https://x/y.jpg");
    }

    @Test
    void mergeSkipsNullsAndEmptyText() {
        AiPayload a = newPayload("oi", "wa-A", 100L, 50L);
        AiPayload empty = new AiPayload();
        empty.setConversationId("c");
        empty.setCompanyId("co");
        empty.setEnqueuedAt(60L);

        AiPayload merged = PayloadMerger.merge(Arrays.asList(a, null, empty));
        assertThat(merged.getMessageText()).isEqualTo("oi");
    }

    @Test
    void hasMediaTrueForKnownTypes() {
        AiPayload p = new AiPayload();
        for (String t : new String[]{"audio", "image", "video", "document", "sticker", "ptt"}) {
            p.setMediaType(t);
            assertThat(p.hasMedia()).as(t).isTrue();
        }
    }

    @Test
    void hasMediaFalseForText() {
        AiPayload p = new AiPayload();
        p.setMediaType("text");
        assertThat(p.hasMedia()).isFalse();
    }

    @Test
    void hasMediaFallsBackToMediaUrlWhenTypeNull() {
        AiPayload p = new AiPayload();
        assertThat(p.hasMedia()).isFalse();
        p.setMediaUrl("https://x/y.png");
        assertThat(p.hasMedia()).isTrue();
    }

    @Test
    void hasTextDetectsNonBlank() {
        AiPayload p = new AiPayload();
        assertThat(p.hasText()).isFalse();
        p.setMessageText("   ");
        assertThat(p.hasText()).isFalse();
        p.setMessageText(" ok");
        assertThat(p.hasText()).isTrue();
    }

    private static AiPayload newPayload(String text, String waId, Long waTs, Long enqueued) {
        AiPayload p = new AiPayload();
        p.setConversationId("conv");
        p.setCompanyId("co");
        p.setMessageText(text);
        p.setWaMessageId(waId);
        p.setWhatsAppTimestamp(waTs);
        p.setEnqueuedAt(enqueued);
        p.setLeadName("lead");
        return p;
    }
}
