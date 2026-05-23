package com.backend.winai.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;

import org.junit.jupiter.api.Test;

class AiResponseGuardServiceTest {

    @Test
    void normalizeContentCollapsesWhitespaceAndLowercases() {
        assertEquals("ok", AiResponseGuardService.normalizeContent("  Ok  "));
        assertEquals("olá mundo", AiResponseGuardService.normalizeContent("Olá   Mundo"));
    }

    @Test
    void inboundFingerprintSameContentSameBucket() {
        long ts = 1_700_000_000_000L;
        String fp1 = AiResponseGuardService.inboundFingerprint("Ok", ts);
        String fp2 = AiResponseGuardService.inboundFingerprint("  ok ", ts + 1000);
        assertEquals(fp1, fp2);
    }

    @Test
    void inboundFingerprintDifferentBuckets() {
        long ts = 1_700_000_000_000L;
        String fp1 = AiResponseGuardService.inboundFingerprint("Ok", ts);
        String fp2 = AiResponseGuardService.inboundFingerprint("Ok", ts + 60_000);
        assertNotEquals(fp1, fp2);
    }

    @Test
    void sha256IsStable() {
        assertNotNull(AiResponseGuardService.sha256("test"));
        assertEquals(AiResponseGuardService.sha256("test"), AiResponseGuardService.sha256("test"));
    }
}
