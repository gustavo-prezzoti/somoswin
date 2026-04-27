package com.backend.winai.util;

import java.util.Optional;
import java.util.UUID;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * Extrai {@code ATTACH_DOC:<uuid>} na última linha da resposta da IA.
 */
public final class AgentDocumentAttachParser {

    private static final Pattern LAST_LINE = Pattern.compile("^ATTACH_DOC:([0-9a-fA-F-]{36})\\s*$");

    private AgentDocumentAttachParser() {}

    public record Result(String visibleText, Optional<UUID> attachDocumentId) {}

    public static Result parse(String raw) {
        if (raw == null || raw.isBlank()) {
            return new Result("", Optional.empty());
        }
        String trimmed = raw.trim();
        int lastNl = trimmed.lastIndexOf('\n');
        String lastLine = lastNl >= 0 ? trimmed.substring(lastNl + 1).trim() : trimmed;
        Matcher m = LAST_LINE.matcher(lastLine);
        if (m.matches()) {
            UUID id = UUID.fromString(m.group(1));
            String without = lastNl >= 0 ? trimmed.substring(0, lastNl).trim() : "";
            return new Result(without, Optional.of(id));
        }
        return new Result(trimmed, Optional.empty());
    }
}
