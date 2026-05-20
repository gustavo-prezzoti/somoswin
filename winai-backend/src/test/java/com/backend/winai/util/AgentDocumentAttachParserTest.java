package com.backend.winai.util;

import org.junit.jupiter.api.Test;

import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

class AgentDocumentAttachParserTest {

    private static final UUID ID_A = UUID.fromString("11111111-2222-3333-4444-555555555555");
    private static final UUID ID_B = UUID.fromString("aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee");

    @Test
    void parseReturnsEmptyForNull() {
        AgentDocumentAttachParser.Result r = AgentDocumentAttachParser.parse(null);
        assertEquals("", r.visibleText());
        assertTrue(r.attachDocumentId().isEmpty());
        assertTrue(r.attachDocumentIds().isEmpty());
    }

    @Test
    void parseReturnsEmptyForBlank() {
        AgentDocumentAttachParser.Result r = AgentDocumentAttachParser.parse("   \n\t ");
        assertEquals("", r.visibleText());
        assertTrue(r.attachDocumentId().isEmpty());
    }

    @Test
    void parseReturnsRawTextWhenNoTag() {
        String input = "Olá! Posso ajudar com seu orçamento?";
        AgentDocumentAttachParser.Result r = AgentDocumentAttachParser.parse(input);
        assertEquals(input, r.visibleText());
        assertTrue(r.attachDocumentId().isEmpty());
        assertTrue(r.attachDocumentIds().isEmpty());
    }

    @Test
    void parseDetectsTagOnLastLineExactly() {
        String input = "Segue nossa proposta comercial.\nATTACH_DOC:" + ID_A;
        AgentDocumentAttachParser.Result r = AgentDocumentAttachParser.parse(input);
        assertEquals("Segue nossa proposta comercial.", r.visibleText());
        assertEquals(ID_A, r.attachDocumentId().orElseThrow());
        assertEquals(1, r.attachDocumentIds().size());
    }

    @Test
    void parseDetectsTagWithTrailingPunctuation() {
        String input = "Veja em anexo: ATTACH_DOC:" + ID_A + ".";
        AgentDocumentAttachParser.Result r = AgentDocumentAttachParser.parse(input);
        assertEquals(ID_A, r.attachDocumentId().orElseThrow());
        assertFalse(r.visibleText().contains("ATTACH_DOC"));
        assertFalse(r.visibleText().contains(ID_A.toString()));
    }

    @Test
    void parseDetectsTagWithSpaceAfterColon() {
        String input = "Segue o documento.\nATTACH_DOC: " + ID_A;
        AgentDocumentAttachParser.Result r = AgentDocumentAttachParser.parse(input);
        assertEquals(ID_A, r.attachDocumentId().orElseThrow());
        assertEquals("Segue o documento.", r.visibleText());
    }

    @Test
    void parseDetectsTagInTheMiddleOfText() {
        String input = "Aqui está ATTACH_DOC:" + ID_A + " conforme combinado.";
        AgentDocumentAttachParser.Result r = AgentDocumentAttachParser.parse(input);
        assertEquals(ID_A, r.attachDocumentId().orElseThrow());
        assertFalse(r.visibleText().contains("ATTACH_DOC"));
        assertTrue(r.visibleText().contains("Aqui está"));
        assertTrue(r.visibleText().contains("conforme combinado"));
    }

    @Test
    void parseDetectsTagWithBackticks() {
        String input = "Segue:\n`ATTACH_DOC:" + ID_A + "`";
        AgentDocumentAttachParser.Result r = AgentDocumentAttachParser.parse(input);
        assertEquals(ID_A, r.attachDocumentId().orElseThrow());
        assertFalse(r.visibleText().contains("ATTACH_DOC"));
        assertFalse(r.visibleText().contains("`"));
    }

    @Test
    void parseDetectsTagWithMarkdownBold() {
        String input = "Veja **ATTACH_DOC:" + ID_A + "**";
        AgentDocumentAttachParser.Result r = AgentDocumentAttachParser.parse(input);
        assertEquals(ID_A, r.attachDocumentId().orElseThrow());
        assertFalse(r.visibleText().contains("ATTACH_DOC"));
    }

    @Test
    void parseDetectsUuidWithoutDashes() {
        String compact = ID_A.toString().replace("-", "");
        String input = "Segue.\nATTACH_DOC:" + compact;
        AgentDocumentAttachParser.Result r = AgentDocumentAttachParser.parse(input);
        assertEquals(ID_A, r.attachDocumentId().orElseThrow());
    }

    @Test
    void parseIsCaseInsensitive() {
        String input = "Documento em anexo.\nattach_doc:" + ID_A;
        AgentDocumentAttachParser.Result r = AgentDocumentAttachParser.parse(input);
        assertEquals(ID_A, r.attachDocumentId().orElseThrow());
        assertEquals("Documento em anexo.", r.visibleText());
    }

    @Test
    void parseAcceptsHyphenVariantInTagName() {
        String input = "Segue.\nATTACH-DOC:" + ID_A;
        AgentDocumentAttachParser.Result r = AgentDocumentAttachParser.parse(input);
        assertEquals(ID_A, r.attachDocumentId().orElseThrow());
    }

    @Test
    void parseAcceptsEqualsInsteadOfColon() {
        String input = "Segue.\nATTACH_DOC=" + ID_A;
        AgentDocumentAttachParser.Result r = AgentDocumentAttachParser.parse(input);
        assertEquals(ID_A, r.attachDocumentId().orElseThrow());
    }

    @Test
    void parseReturnsAllIdsWhenMultipleTagsPresent() {
        String input = "Segue dois arquivos.\nATTACH_DOC:" + ID_A + "\nATTACH_DOC:" + ID_B;
        AgentDocumentAttachParser.Result r = AgentDocumentAttachParser.parse(input);
        assertEquals(2, r.attachDocumentIds().size());
        assertEquals(ID_A, r.attachDocumentIds().get(0));
        assertEquals(ID_B, r.attachDocumentIds().get(1));
        assertEquals(ID_A, r.attachDocumentId().orElseThrow());
        assertEquals("Segue dois arquivos.", r.visibleText());
    }

    @Test
    void parseDeduplicatesRepeatedIds() {
        String input = "Texto.\nATTACH_DOC:" + ID_A + "\nATTACH_DOC:" + ID_A;
        AgentDocumentAttachParser.Result r = AgentDocumentAttachParser.parse(input);
        assertEquals(1, r.attachDocumentIds().size());
        assertEquals(ID_A, r.attachDocumentIds().get(0));
    }

    @Test
    void parseStripsTagOnlyResponseToEmptyText() {
        String input = "ATTACH_DOC:" + ID_A;
        AgentDocumentAttachParser.Result r = AgentDocumentAttachParser.parse(input);
        assertEquals("", r.visibleText());
        assertEquals(ID_A, r.attachDocumentId().orElseThrow());
    }

    @Test
    void parseHandlesCarriageReturnLineFeedSeparators() {
        String input = "Linha 1\r\nLinha 2\r\nATTACH_DOC:" + ID_A + "\r\n";
        AgentDocumentAttachParser.Result r = AgentDocumentAttachParser.parse(input);
        assertEquals(ID_A, r.attachDocumentId().orElseThrow());
        assertFalse(r.visibleText().contains("ATTACH_DOC"));
        assertTrue(r.visibleText().contains("Linha 1"));
        assertTrue(r.visibleText().contains("Linha 2"));
    }

    @Test
    void parseIgnoresInvalidUuid() {
        String input = "Texto.\nATTACH_DOC:not-a-valid-uuid-here";
        AgentDocumentAttachParser.Result r = AgentDocumentAttachParser.parse(input);
        assertTrue(r.attachDocumentId().isEmpty());
        assertTrue(r.attachDocumentIds().isEmpty());
        assertTrue(r.visibleText().contains("ATTACH_DOC"));
    }

    @Test
    void parseCollapsesExtraBlankLinesAfterRemoval() {
        String input = "Linha 1\n\n\nATTACH_DOC:" + ID_A + "\n\n\nLinha final";
        AgentDocumentAttachParser.Result r = AgentDocumentAttachParser.parse(input);
        assertEquals(ID_A, r.attachDocumentId().orElseThrow());
        assertFalse(r.visibleText().contains("\n\n\n"));
        assertTrue(r.visibleText().startsWith("Linha 1"));
        assertTrue(r.visibleText().endsWith("Linha final"));
    }

    @Test
    void parsePreservesNormalContentWhenTagAtStart() {
        String input = "ATTACH_DOC:" + ID_A + "\nSegue conforme solicitado.";
        AgentDocumentAttachParser.Result r = AgentDocumentAttachParser.parse(input);
        assertEquals(ID_A, r.attachDocumentId().orElseThrow());
        assertEquals("Segue conforme solicitado.", r.visibleText());
    }

    @Test
    void parseDoesNotMatchAttachDocWithoutId() {
        String input = "Vou te enviar ATTACH_DOC depois.";
        AgentDocumentAttachParser.Result r = AgentDocumentAttachParser.parse(input);
        assertTrue(r.attachDocumentId().isEmpty());
        assertEquals(input, r.visibleText());
    }
}
