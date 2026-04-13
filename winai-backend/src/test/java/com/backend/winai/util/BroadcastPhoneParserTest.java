package com.backend.winai.util;

import org.junit.jupiter.api.Test;

import java.util.Arrays;
import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;

class BroadcastPhoneParserTest {

    @Test
    void normalizeAddsBrazilCountryCodeFor11Digits() {
        assertEquals("5511999999999", BroadcastPhoneParser.normalize("11999999999"));
        assertEquals("5511999999999", BroadcastPhoneParser.normalize("(11) 99999-9999"));
    }

    @Test
    void normalizeKeepsInternationalFormat() {
        assertEquals("5511987654321", BroadcastPhoneParser.normalize("+55 11 98765-4321"));
    }

    @Test
    void normalizeReturnsNullForTooShort() {
        assertNull(BroadcastPhoneParser.normalize("123"));
    }

    @Test
    void parseLinesDedupePreservesOrderAndRemovesDuplicates() {
        List<String> out = BroadcastPhoneParser.parseLinesDedupe(Arrays.asList(
                "5511888888888",
                "+55 11 88888-8888",
                "invalid",
                "5511999999999"));
        assertEquals(2, out.size());
        assertEquals("5511888888888", out.get(0));
        assertEquals("5511999999999", out.get(1));
    }
}
